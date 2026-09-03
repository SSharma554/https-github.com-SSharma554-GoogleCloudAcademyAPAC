import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  UserProfile, 
  JournalInteraction, 
  SaveState, 
  ReflectionMode 
} from './types';
import { 
  subscribeToAuth, 
  signInWithGoogle, 
  logOut 
} from './lib/firebase';
import { 
  saveJournalInteraction, 
  deleteJournalInteraction, 
  subscribeToInteractions 
} from './lib/journalService';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { JournalEditor } from './components/JournalEditor';
import { HistoryList } from './components/HistoryList';

function createNewInteractionObject(userId: string, mode: ReflectionMode = 'reflection'): JournalInteraction {
  const id = `entry-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  return {
    id,
    userId,
    title: 'Untitled Reflection',
    mode,
    initialPrompt: '',
    messages: [],
    createdAt: now,
    updatedAt: now,
    wordCount: 0,
  };
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeView, setActiveView] = useState<'editor' | 'history'>('editor');
  const [interactions, setInteractions] = useState<JournalInteraction[]>([]);
  const [isInteractionsLoading, setIsInteractionsLoading] = useState(false);

  const [activeInteraction, setActiveInteraction] = useState<JournalInteraction | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'error' | 'success' | 'info'; text: string } | null>(null);

  const pendingSaveRef = useRef<JournalInteraction | null>(null);

  const showToast = (type: 'error' | 'success' | 'info', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage((current) => (current?.text === text ? null : current));
    }, 4500);
  };

  // Subscribe to Firebase Authentication State
  useEffect(() => {
    const unsubscribe = subscribeToAuth((user) => {
      if (user) {
        const profile: UserProfile = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        };
        setCurrentUser(profile);
      } else {
        setCurrentUser(null);
        setActiveInteraction(null);
        setInteractions([]);
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to User's Firestore Interactions when authenticated
  useEffect(() => {
    if (!currentUser?.uid) return;

    setIsInteractionsLoading(true);
    const unsubscribe = subscribeToInteractions(
      currentUser.uid,
      (data) => {
        setInteractions(data);
        setIsInteractionsLoading(false);
        // If active interaction is empty or was just initialized, ensure it exists
        setActiveInteraction((prev) => {
          if (!prev) {
            return data.length > 0 ? data[0] : createNewInteractionObject(currentUser.uid);
          }
          // If the currently open item was updated externally, merge if newer
          const found = data.find((d) => d.id === prev.id);
          if (found && new Date(found.updatedAt) > new Date(prev.updatedAt)) {
            return found;
          }
          return prev;
        });
      },
      (error) => {
        console.error('Firestore subscription error:', error);
        setIsInteractionsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // Handle Google Sign-In
  const handleSignIn = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Sign-in failed:', err);
      setAuthError(err.message || 'Failed to complete Google Sign-In. Please check popups or permissions.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Handle Sign-Out
  const handleSignOut = async () => {
    try {
      await logOut();
      setActiveView('editor');
    } catch (err: any) {
      console.error('Sign out error:', err);
    }
  };

  // Create a brand new reflection
  const handleNewReflection = () => {
    if (!currentUser) return;
    const newEntry = createNewInteractionObject(currentUser.uid);
    setActiveInteraction(newEntry);
    setActiveView('editor');
  };

  // Save interaction to Firestore
  const handleUpdateInteraction = useCallback(async (updated: JournalInteraction) => {
    if (!currentUser?.uid) return;
    
    setActiveInteraction(updated);
    pendingSaveRef.current = updated;
    setSaveState('saving');
    setSaveErrorMessage(null);

    try {
      await saveJournalInteraction(currentUser.uid, updated);
      setSaveState('saved');
      pendingSaveRef.current = null;
      // Auto revert 'saved' indicator to 'idle' after 3s
      setTimeout(() => {
        setSaveState((curr) => (curr === 'saved' ? 'idle' : curr));
      }, 3000);
    } catch (err: any) {
      console.error('Failed to save to Firestore:', err);
      setSaveState('error');
      setSaveErrorMessage(err.message || 'Firestore write rejected. Please check network permissions and retry.');
    }
  }, [currentUser?.uid]);

  // Retry Save for failed transactions
  const handleRetrySave = async () => {
    if (!currentUser?.uid || !pendingSaveRef.current) return;
    setSaveState('saving');
    setSaveErrorMessage(null);
    try {
      await saveJournalInteraction(currentUser.uid, pendingSaveRef.current);
      setSaveState('saved');
      pendingSaveRef.current = null;
      setTimeout(() => {
        setSaveState((curr) => (curr === 'saved' ? 'idle' : curr));
      }, 3000);
    } catch (err: any) {
      console.error('Retry save failed:', err);
      setSaveState('error');
      setSaveErrorMessage(err.message || 'Retry failed. Check Firestore configuration.');
    }
  };

  // Delete an interaction
  const handleDeleteInteraction = async (interactionId: string) => {
    if (!currentUser?.uid) return;
    try {
      await deleteJournalInteraction(currentUser.uid, interactionId);
      showToast('info', 'Reflection entry deleted from your private Firestore.');
      if (activeInteraction?.id === interactionId) {
        handleNewReflection();
      }
    } catch (err: any) {
      console.error('Delete interaction failed:', err);
      showToast('error', 'Failed to delete reflection: ' + (err.message || 'Firestore error'));
    }
  };

  // Select interaction from History List
  const handleSelectFromHistory = (item: JournalInteraction) => {
    setActiveInteraction(item);
    setActiveView('editor');
  };

  // Loading screen for auth initialization
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#5A5A40] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-[#858072] font-medium tracking-wide uppercase">Initializing ReflectAI...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#4A4A40] flex flex-col font-sans selection:bg-[#EAE7DE] selection:text-[#323228]">
      
      {/* Navigation Header */}
      <Navbar
        user={currentUser}
        activeView={activeView}
        onViewChange={setActiveView}
        onNewReflection={handleNewReflection}
        onSignOut={handleSignOut}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {!currentUser ? (
          /* Unauthenticated Landing View */
          <LandingPage
            onSignIn={handleSignIn}
            isAuthenticating={isAuthenticating}
            authError={authError}
          />
        ) : (
          /* Authenticated Private Dashboard Views */
          <div>
            {activeView === 'editor' && activeInteraction && (
              <JournalEditor
                userId={currentUser.uid}
                currentInteraction={activeInteraction}
                saveState={saveState}
                saveErrorMessage={saveErrorMessage}
                onUpdateInteraction={handleUpdateInteraction}
                onRetrySave={handleRetrySave}
                onNewReflection={handleNewReflection}
                onDeleteInteraction={handleDeleteInteraction}
              />
            )}

            {activeView === 'history' && (
              <HistoryList
                interactions={interactions}
                isLoading={isInteractionsLoading}
                onSelectInteraction={handleSelectFromHistory}
                onDeleteInteraction={handleDeleteInteraction}
                onNewReflection={handleNewReflection}
              />
            )}
          </div>
        )}
      </main>

      {/* Global Toast Notification */}
      {toastMessage && (
        <div 
          id="app-toast-banner"
          className={`fixed bottom-5 right-5 z-50 max-w-md px-4 py-3 rounded-xl shadow-lg border text-sm flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200 ${
            toastMessage.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : toastMessage.type === 'success'
              ? 'bg-[#EBF3E8] border-[#C8DEC0] text-[#2D5A27]'
              : 'bg-[#FAF9F6] border-[#E0DBCF] text-[#4A4A40]'
          }`}
        >
          <span className="font-medium">{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-xs font-bold uppercase tracking-wider opacity-60 hover:opacity-100 cursor-pointer ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

    </div>
  );
}
