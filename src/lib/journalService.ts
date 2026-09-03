import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from './firebase';
import { JournalInteraction } from '../types';
import { sanitizeForFirestore } from './sanitizer';

function getInteractionsCollection(userId: string) {
  return collection(db, 'users', userId, 'interactions');
}

function getInteractionDoc(userId: string, interactionId: string) {
  return doc(db, 'users', userId, 'interactions', interactionId);
}

/**
 * Saves or updates a journal interaction in Firestore under the isolated user path.
 * Strips all undefined fields to guarantee zero-crash payload hygiene.
 */
export async function saveJournalInteraction(userId: string, interaction: JournalInteraction): Promise<void> {
  if (!userId) throw new Error('User ID is required to persist interaction.');
  if (!interaction.id) throw new Error('Interaction ID is required.');

  const docRef = getInteractionDoc(userId, interaction.id);
  const cleanData = sanitizeForFirestore({
    ...interaction,
    userId,
    updatedAt: new Date().toISOString(),
  });

  await setDoc(docRef, cleanData, { merge: true });
}

/**
 * Retrieves all journal interactions for a user, sorted descending by updatedAt.
 */
export async function fetchJournalInteractions(userId: string): Promise<JournalInteraction[]> {
  if (!userId) return [];
  const colRef = getInteractionsCollection(userId);
  const q = query(colRef, orderBy('updatedAt', 'desc'));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map((docSnap) => docSnap.data() as JournalInteraction);
}

/**
 * Retrieves a single journal interaction by ID.
 */
export async function fetchJournalInteractionById(userId: string, interactionId: string): Promise<JournalInteraction | null> {
  if (!userId || !interactionId) return null;
  const docRef = getInteractionDoc(userId, interactionId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return docSnap.data() as JournalInteraction;
}

/**
 * Deletes a journal interaction by ID.
 */
export async function deleteJournalInteraction(userId: string, interactionId: string): Promise<void> {
  if (!userId || !interactionId) throw new Error('Invalid delete arguments.');
  const docRef = getInteractionDoc(userId, interactionId);
  await deleteDoc(docRef);
}

/**
 * Subscribes to real-time updates of the user's isolated interactions.
 */
export function subscribeToInteractions(
  userId: string, 
  onData: (interactions: JournalInteraction[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (!userId) {
    onData([]);
    return () => {};
  }
  const colRef = getInteractionsCollection(userId);
  const q = query(colRef, orderBy('updatedAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((docSnap) => docSnap.data() as JournalInteraction);
      onData(items);
    },
    (err) => {
      console.error('Error in interactions real-time listener:', err);
      if (onError) onError(err);
    }
  );
}
