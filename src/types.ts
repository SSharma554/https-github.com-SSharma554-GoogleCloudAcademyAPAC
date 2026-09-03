export type ReflectionMode = 'reflection' | 'brainstorm' | 'coaching' | 'gratitude';

export interface JournalMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface SynthesisData {
  title: string;
  summary: string;
  takeaways: string[];
  tags: string[];
  mood: 'positive' | 'reflective' | 'challenging' | 'creative' | 'neutral';
  modelUsed?: string;
  synthesizedAt?: string;
}

export interface JournalInteraction {
  id: string;
  userId: string;
  title: string;
  mode: ReflectionMode;
  initialPrompt: string;
  messages: JournalMessage[];
  synthesis?: SynthesisData;
  createdAt: string;
  updatedAt: string;
  wordCount: number;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';
