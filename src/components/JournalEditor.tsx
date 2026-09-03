import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  JournalInteraction, 
  JournalMessage, 
  ReflectionMode, 
  SynthesisData,
  SaveState
} from '../types';
import { 
  Sparkles, 
  Send, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Brain, 
  HeartHandshake, 
  Target, 
  Feather,
  Wand2,
  Trash2,
  BookmarkPlus,
  Bot,
  User as UserIcon,
  Tag,
  Copy,
  Check
} from 'lucide-react';
import Markdown from 'react-markdown';
import { auth } from '../lib/firebase';

interface JournalEditorProps {
  userId: string;
  currentInteraction: JournalInteraction;
  saveState: SaveState;
  saveErrorMessage: string | null;
  onUpdateInteraction: (interaction: JournalInteraction) => Promise<void>;
  onRetrySave: () => Promise<void>;
  onNewReflection: () => void;
  onDeleteInteraction?: (id: string) => Promise<void>;
}

const REFLECTION_MODES: { id: ReflectionMode; label: string; icon: React.ReactNode; desc: string }[] = [
  { 
    id: 'reflection', 
    label: 'Self-Reflection', 
    icon: <Feather className="w-4 h-4" />, 
    desc: 'Unpack emotions and discover insights' 
  },
  { 
    id: 'brainstorm', 
    label: 'Brainstorming', 
    icon: <Brain className="w-4 h-4" />, 
    desc: 'Generate creative angles and structured solutions' 
  },
  { 
    id: 'coaching', 
    label: 'Clarity & Coaching', 
    icon: <Target className="w-4 h-4" />, 
    desc: 'Diagnose bottlenecks and create next steps' 
  },
  { 
    id: 'gratitude', 
    label: 'Gratitude & Growth', 
    icon: <HeartHandshake className="w-4 h-4" />, 
    desc: 'Mindful appreciation and celebrate learning' 
  },
];

const STARTER_PROMPTS: Record<ReflectionMode, string[]> = {
  reflection: [
    "What has been occupying my mental energy today, and why?",
    "A recent situation that challenged me was...",
    "What is one emotion I felt strongly today, and what triggered it?",
  ],
  brainstorm: [
    "I want to explore alternative solutions to...",
    "How might we rethink my approach to...",
    "Brainstorm 5 distinct ways to tackle...",
  ],
  coaching: [
    "The primary goal I am currently focusing on is...",
    "Where am I feeling friction or hesitation right now?",
    "What would a successful outcome look like for this week?",
  ],
  gratitude: [
    "Three micro-moments from today that made me smile or feel grateful:",
    "A person who supported or inspired me recently and how:",
    "A challenge I faced this month that taught me an important lesson:",
  ],
};

export const JournalEditor: React.FC<JournalEditorProps> = ({
  userId,
  currentInteraction,
  saveState,
  saveErrorMessage,
  onUpdateInteraction,
  onRetrySave,
  onNewReflection,
  onDeleteInteraction,
}) => {
  const [inputText, setInputText] = useState('');
  const [localTitle, setLocalTitle] = useState(currentInteraction.title);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronize local title when currentInteraction changes
  useEffect(() => {
    setLocalTitle(currentInteraction.title);
    setShowDeleteConfirm(false);
  }, [currentInteraction.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentInteraction.messages, isGenerating]);

  // Handle debounced title updates to avoid spamming Firestore writes
  const handleTitleChange = (newTitle: string) => {
    setLocalTitle(newTitle);
    if (titleDebounceRef.current) {
      clearTimeout(titleDebounceRef.current);
    }
    titleDebounceRef.current = setTimeout(() => {
      if (newTitle !== currentInteraction.title) {
        onUpdateInteraction({
          ...currentInteraction,
          title: newTitle.trim() || 'Untitled Reflection',
          updatedAt: new Date().toISOString(),
        });
      }
    }, 600);
  };

  const handleTitleBlur = () => {
    if (titleDebounceRef.current) {
      clearTimeout(titleDebounceRef.current);
    }
    const finalTitle = localTitle.trim() || 'Untitled Reflection';
    if (finalTitle !== currentInteraction.title) {
      onUpdateInteraction({
        ...currentInteraction,
        title: finalTitle,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  // Calculate total word count
  const calculateWordCount = (messages: JournalMessage[]) => {
    const fullText = messages.map(m => m.content).join(' ');
    return fullText.trim() ? fullText.trim().split(/\s+/).length : 0;
  };

  // Helper to copy reflection formatted as Markdown
  const handleCopyReflection = async () => {
    try {
      let exportMd = `# ${currentInteraction.title}\n\n`;
      exportMd += `*Mode: ${currentInteraction.mode} | Date: ${new Date(currentInteraction.createdAt).toLocaleString()}*\n\n`;
      
      if (currentInteraction.synthesis) {
        exportMd += `## Synthesis\n${currentInteraction.synthesis.summary}\n\n`;
        if (currentInteraction.synthesis.takeaways?.length > 0) {
          exportMd += `### Key Takeaways\n`;
          currentInteraction.synthesis.takeaways.forEach((t) => {
            exportMd += `- ${t}\n`;
          });
          exportMd += '\n';
        }
      }

      exportMd += `## Journal & Reflection Dialogue\n\n`;
      currentInteraction.messages.forEach((m) => {
        const roleName = m.role === 'user' ? 'Me' : 'ReflectAI (Gemini)';
        exportMd += `### ${roleName} (${new Date(m.timestamp).toLocaleTimeString()})\n${m.content}\n\n`;
      });

      await navigator.clipboard.writeText(exportMd);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt || inputText).trim();
    if (!textToSend || isGenerating) return;

    setErrorBanner(null);
    const userMsgId = `msg-user-${Date.now()}`;
    const newUserMsg: JournalMessage = {
      id: userMsgId,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...currentInteraction.messages, newUserMsg];
    const newWordCount = calculateWordCount(updatedMessages);

    // Initial interaction title if empty or default
    const derivedTitle = (currentInteraction.title === 'Untitled Reflection' || !currentInteraction.title) && updatedMessages.length === 1
      ? textToSend.slice(0, 45) + (textToSend.length > 45 ? '...' : '')
      : currentInteraction.title;

    if (derivedTitle !== currentInteraction.title) {
      setLocalTitle(derivedTitle);
    }

    const interactionWithUserMsg: JournalInteraction = {
      ...currentInteraction,
      title: derivedTitle,
      initialPrompt: currentInteraction.initialPrompt || textToSend,
      messages: updatedMessages,
      wordCount: newWordCount,
      updatedAt: new Date().toISOString(),
    };

    // Save optimistic user state
    setInputText('');
    await onUpdateInteraction(interactionWithUserMsg);

    // Call server-side Gemini reflection endpoint with Firebase Auth Bearer token
    setIsGenerating(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      const response = await fetch('/api/reflect', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          mode: currentInteraction.mode,
          userPrompt: '',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to contact Gemini API' }));
        throw new Error(errorData.error || `Server responded with ${response.status}`);
      }

      const data = await response.json();
      const assistantMsgId = `msg-ai-${Date.now()}`;
      const newAssistantMsg: JournalMessage = {
        id: assistantMsgId,
        role: 'assistant',
        content: data.reply,
        timestamp: data.timestamp || new Date().toISOString(),
      };

      const finalMessages = [...updatedMessages, newAssistantMsg];
      const finalInteraction: JournalInteraction = {
        ...interactionWithUserMsg,
        messages: finalMessages,
        wordCount: calculateWordCount(finalMessages),
        updatedAt: new Date().toISOString(),
      };

      await onUpdateInteraction(finalInteraction);
    } catch (err: any) {
      console.error('Error generating AI reflection:', err);
      setErrorBanner(err.message || 'Could not generate reflection reply. Please check connection and retry.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSynthesize = async () => {
    if (currentInteraction.messages.length === 0 || isSynthesizing) return;

    setIsSynthesizing(true);
    setErrorBanner(null);

    try {
      const idToken = await auth.currentUser?.getIdToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      const combinedJournalContent = currentInteraction.messages
        .map(m => `${m.role.toUpperCase()}: ${m.content}`)
        .join('\n\n');

      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers,
        body: JSON.stringify({ content: combinedJournalContent }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Synthesis failed' }));
        throw new Error(errData.error || 'Failed to synthesize journal entry');
      }

      const synthesisResult = await res.json();
      const updatedSynthesis: SynthesisData = {
        title: synthesisResult.title || currentInteraction.title,
        summary: synthesisResult.summary || '',
        takeaways: Array.isArray(synthesisResult.takeaways) ? synthesisResult.takeaways : [],
        tags: Array.isArray(synthesisResult.tags) ? synthesisResult.tags : ['Reflection'],
        mood: synthesisResult.mood || 'reflective',
        modelUsed: synthesisResult.modelUsed,
        synthesizedAt: new Date().toISOString(),
      };

      const updatedInteraction: JournalInteraction = {
        ...currentInteraction,
        title: synthesisResult.title || currentInteraction.title,
        synthesis: updatedSynthesis,
        updatedAt: new Date().toISOString(),
      };

      if (synthesisResult.title) {
        setLocalTitle(synthesisResult.title);
      }

      await onUpdateInteraction(updatedInteraction);
    } catch (err: any) {
      console.error('Error synthesizing journal:', err);
      setErrorBanner(err.message || 'Synthesis failed. Please try again.');
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleModeChange = async (newMode: ReflectionMode) => {
    if (newMode === currentInteraction.mode) return;
    const updated: JournalInteraction = {
      ...currentInteraction,
      mode: newMode,
      updatedAt: new Date().toISOString(),
    };
    await onUpdateInteraction(updated);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const currentModeObj = REFLECTION_MODES.find(m => m.id === currentInteraction.mode) || REFLECTION_MODES[0];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      
      {/* Top Controls Bar */}
      <div className="bg-[#FAF9F6] rounded-2xl border border-[#E0DBCF] p-4 sm:p-5 shadow-2xs space-y-4">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Editable Title */}
          <div className="flex-1 min-w-0">
            <input
              id="reflection-title-input"
              type="text"
              value={localTitle}
              onChange={(e) => handleTitleChange(e.target.value)}
              onBlur={handleTitleBlur}
              placeholder="Give this reflection a title..."
              className="text-xl sm:text-2xl font-serif font-bold text-[#323228] tracking-tight bg-transparent border-b border-transparent hover:border-[#CDC6B8] focus:border-[#5A5A40] focus:outline-hidden w-full transition-colors py-0.5"
            />
            <div className="flex items-center gap-3 text-xs text-[#858072] mt-1">
              <span>{new Date(currentInteraction.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              <span>&bull;</span>
              <span>{currentInteraction.wordCount} words</span>
              <span>&bull;</span>
              <span>{currentInteraction.messages.length} messages</span>
            </div>
          </div>

          {/* Actions & Save State Indicators */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Save Status Badge */}
            <div className="flex items-center">
              {saveState === 'saving' && (
                <div id="save-indicator-saving" className="inline-flex items-center gap-1.5 text-xs text-[#A57C52] bg-[#F8F3ED] px-2.5 py-1 rounded-md border border-[#ECD5C3]">
                  <div className="w-3 h-3 border-2 border-[#A57C52] border-t-transparent rounded-full animate-spin" />
                  <span>Saving to Firestore...</span>
                </div>
              )}
              {saveState === 'saved' && (
                <div id="save-indicator-saved" className="inline-flex items-center gap-1 text-xs text-[#5A5A40] bg-[#EDECE4] px-2.5 py-1 rounded-md border border-[#D8D4C5]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#5A5A40]" />
                  <span>Saved</span>
                </div>
              )}
              {saveState === 'error' && (
                <div id="save-indicator-error" className="inline-flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Save Error</span>
                  <button
                    onClick={onRetrySave}
                    className="underline font-semibold hover:text-rose-900 ml-1 cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>

            {/* Copy Reflection Button */}
            {currentInteraction.messages.length > 0 && (
              <button
                id="copy-reflection-btn"
                onClick={handleCopyReflection}
                title="Copy formatted reflection dialogue to clipboard"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FAF9F6] border border-[#E0DBCF] hover:bg-[#EDECE4] text-[#555548] text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
              >
                {hasCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#858072]" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            )}

            {/* Synthesize Button */}
            <button
              id="synthesize-journal-btn"
              onClick={handleSynthesize}
              disabled={isSynthesizing || currentInteraction.messages.length === 0}
              title="Summarize and extract key takeaways with Gemini"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EDECE4] border border-[#D8D4C5] text-[#5A5A40] hover:bg-[#E2DFD4] text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
            >
              {isSynthesizing ? (
                <div className="w-3.5 h-3.5 border-2 border-[#5A5A40] border-t-transparent rounded-full animate-spin" />
              ) : (
                <Wand2 className="w-3.5 h-3.5 text-[#5A5A40]" />
              )}
              <span>{isSynthesizing ? 'Synthesizing...' : 'Summarize & Insights'}</span>
            </button>

            {/* Delete / Clear Interaction with In-App Inline Confirmation */}
            {onDeleteInteraction && (
              <div className="relative inline-flex items-center">
                {showDeleteConfirm ? (
                  <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-2 py-1 rounded-lg text-xs animate-in fade-in duration-150">
                    <span className="text-rose-800 font-medium">Delete entry?</span>
                    <button
                      id="confirm-delete-reflection-btn"
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        onDeleteInteraction(currentInteraction.id);
                      }}
                      className="px-2 py-0.5 bg-rose-600 text-white rounded font-medium hover:bg-rose-700 transition-colors cursor-pointer"
                    >
                      Delete
                    </button>
                    <button
                      id="cancel-delete-reflection-btn"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-1.5 py-0.5 text-neutral-600 hover:text-neutral-900 rounded font-medium cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    id="delete-reflection-btn"
                    onClick={() => setShowDeleteConfirm(true)}
                    title="Delete reflection"
                    className="p-1.5 rounded-lg text-[#858072] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="pt-3 border-t border-[#EAE7DE] flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <span className="text-xs font-medium text-[#858072] whitespace-nowrap mr-1">Reflection Lens:</span>
          {REFLECTION_MODES.map((mode) => (
            <button
              key={mode.id}
              id={`mode-tab-${mode.id}`}
              onClick={() => handleModeChange(mode.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 whitespace-nowrap cursor-pointer ${
                currentInteraction.mode === mode.id
                  ? 'bg-[#5A5A40] text-white shadow-xs'
                  : 'bg-[#EAE7DE] text-[#555548] hover:bg-[#E0DBCF]'
              }`}
            >
              {mode.icon}
              <span>{mode.label}</span>
            </button>
          ))}
        </div>

      </div>

      {/* Error Banner if any */}
      {(errorBanner || saveErrorMessage) && (
        <div id="journal-error-banner" className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">{errorBanner || saveErrorMessage}</p>
              {saveErrorMessage && (
                <button
                  onClick={onRetrySave}
                  className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-rose-700 underline hover:text-rose-900 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" /> Retry Firestore Save
                </button>
              )}
            </div>
          </div>
          <button
            onClick={() => setErrorBanner(null)}
            className="text-rose-500 hover:text-rose-700 text-xs font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {/* AI Synthesis Card (if generated) */}
      {currentInteraction.synthesis && (
        <div id="synthesis-card" className="p-5 sm:p-6 rounded-2xl bg-[#F0ECE1] border border-[#DCD5C6] shadow-2xs space-y-4">
          <div className="flex items-center justify-between gap-2 border-b border-[#DCD5C6] pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#5A5A40] text-white flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[#F5F5F0]" />
              </div>
              <h3 className="font-serif font-bold text-[#323228] text-base">Gemini Synthesis & Key Takeaways</h3>
            </div>
            {currentInteraction.synthesis.mood && (
              <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#FAF9F6] text-[#5A5A40] border border-[#D8D4C5]">
                Mood: {currentInteraction.synthesis.mood}
              </span>
            )}
          </div>

          <div className="space-y-3 text-sm text-[#4A4A40]">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#323228] block mb-1">Executive Summary</span>
              <p className="leading-relaxed bg-[#FAF9F6] p-3.5 rounded-xl border border-[#E0DBCF] text-[#4A4A40]">
                {currentInteraction.synthesis.summary}
              </p>
            </div>

            {currentInteraction.synthesis.takeaways?.length > 0 && (
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#323228] block mb-1">Key Action Takeaways</span>
                <ul className="space-y-1.5 bg-[#FAF9F6] p-3.5 rounded-xl border border-[#E0DBCF]">
                  {currentInteraction.synthesis.takeaways.map((takeaway, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-[#4A4A40]">
                      <CheckCircle2 className="w-4 h-4 text-[#5A5A40] shrink-0 mt-0.5" />
                      <span>{takeaway}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {currentInteraction.synthesis.tags?.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <Tag className="w-3.5 h-3.5 text-[#A57C52] mr-1" />
                {currentInteraction.synthesis.tags.map((tag, idx) => (
                  <span key={idx} className="text-xs font-medium px-2 py-0.5 rounded-md bg-[#FAF9F6] text-[#5A5A40] border border-[#E0DBCF]">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Conversation & Journal Thread */}
      <div className="space-y-4">
        {currentInteraction.messages.length === 0 ? (
          /* Empty State / Starter Prompts */
          <div className="bg-[#FAF9F6] rounded-2xl border border-[#E0DBCF] p-6 sm:p-8 text-center space-y-6 shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-[#EDECE4] text-[#5A5A40] mx-auto flex items-center justify-center">
              {currentModeObj.icon}
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-lg font-serif font-bold text-[#323228]">Begin Your {currentModeObj.label}</h3>
              <p className="text-sm text-[#555548]">
                {currentModeObj.desc}. Write freely below, or tap a starter prompt to ignite your thoughts.
              </p>
            </div>

            {/* Prompt Starter Chips */}
            <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-2 pt-2 max-w-2xl mx-auto">
              {STARTER_PROMPTS[currentInteraction.mode].map((prompt, idx) => (
                <button
                  key={idx}
                  id={`starter-prompt-${idx}`}
                  onClick={() => {
                    setInputText(prompt);
                    textareaRef.current?.focus();
                  }}
                  className="text-left text-xs bg-[#F5F5F0] hover:bg-[#EAE7DE] text-[#4A4A40] border border-[#E0DBCF] px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer hover:border-[#CDC6B8]"
                >
                  &ldquo;{prompt}&rdquo;
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Message List */
          <div className="space-y-4">
            {currentInteraction.messages.map((msg, index) => (
              <div
                key={msg.id || index}
                id={`message-bubble-${index}`}
                className={`flex gap-3 sm:gap-4 ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {/* Assistant Avatar */}
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-[#5A5A40] text-[#F5F5F0] flex items-center justify-center shrink-0 mt-1 shadow-2xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                )}

                {/* Bubble Content */}
                <div
                  className={`max-w-[85%] sm:max-w-[78%] rounded-2xl px-4 sm:px-5 py-3.5 shadow-2xs ${
                    msg.role === 'user'
                      ? 'bg-[#5A5A40] text-white rounded-tr-xs'
                      : 'bg-[#FAF9F6] text-[#323228] border border-[#E0DBCF] rounded-tl-xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-1 text-[11px] opacity-80">
                    <span className="font-semibold">
                      {msg.role === 'user' ? 'You' : 'Gemini 3.6'}
                    </span>
                    <span>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className={`text-sm leading-relaxed prose prose-sm max-w-none ${
                    msg.role === 'user' ? 'text-white' : 'text-[#323228]'
                  }`}>
                    {msg.role === 'user' ? (
                      <p className="whitespace-pre-wrap font-normal">{msg.content}</p>
                    ) : (
                      <div className="markdown-body">
                        <Markdown>{msg.content}</Markdown>
                      </div>
                    )}
                  </div>
                </div>

                {/* User Avatar */}
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-[#EAE7DE] text-[#5A5A40] flex items-center justify-center shrink-0 mt-1">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {/* AI Thinking Animation */}
            {isGenerating && (
              <div id="ai-generating-bubble" className="flex gap-3 sm:gap-4 justify-start">
                <div className="w-8 h-8 rounded-full bg-[#5A5A40] text-[#F5F5F0] flex items-center justify-center shrink-0 mt-1 animate-pulse shadow-2xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="bg-[#FAF9F6] text-[#323228] border border-[#E0DBCF] rounded-2xl rounded-tl-xs px-5 py-3.5 shadow-2xs">
                  <div className="flex items-center gap-2 text-xs text-[#858072] font-medium">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#858072] animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-[#858072] animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-[#858072] animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span>Gemini is reflecting on your entry...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Composer Section */}
      <div className="sticky bottom-4 z-30 bg-[#FAF9F6] rounded-2xl border border-[#CDC6B8] shadow-md p-3 sm:p-4 transition-shadow focus-within:border-[#5A5A40] focus-within:shadow-lg">
        <textarea
          id="journal-composer-textarea"
          ref={textareaRef}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Write your thoughts or ask Gemini for reflection (${currentModeObj.label})...`}
          rows={3}
          className="w-full bg-transparent text-sm sm:text-base text-[#323228] placeholder:text-[#9E998B] resize-none focus:outline-hidden leading-relaxed font-sans"
        />

        <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#EAE7DE] mt-2 text-xs">
          <div className="text-[#858072] flex items-center gap-2">
            <span>Press <kbd className="font-mono bg-[#EAE7DE] px-1.5 py-0.5 rounded text-[10px] text-[#4A4A40] border border-[#DCD5C6]">Cmd/Ctrl + Enter</kbd> to reflect</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="send-reflection-btn"
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isGenerating}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#5A5A40] text-white font-medium text-xs sm:text-sm hover:bg-[#484832] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
            >
              {isGenerating ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>{isGenerating ? 'Thinking...' : 'Reflect with Gemini'}</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};
