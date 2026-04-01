import { Timestamp } from 'firebase/firestore';

export interface UserData {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  role: 'user' | 'admin';
}

export interface QuizOption {
  id: string;
  text: string;
}

export interface Question {
  id?: string;
  text: string;
  imageUrl?: string; // New: Image support
  options: string[];
  correctIndex: number;
  timeLimit: number;
}

export interface Quiz {
  id: string;
  title: string;
  status: 'draft' | 'live' | 'ended';
  createdBy: string;
  questions?: Question[];
}

export interface LiveSession {
  status: 'waiting' | 'active' | 'revealed' | 'finished'; // New: 'revealed' state
  currentQuestionIndex: number;
  currentQuestionText: string;
  currentImageUrl?: string; // New: Live image
  currentOptions?: string[];
  correctIndex?: number; // New: Exposed only during 'revealed'
  startTime?: Timestamp | null;
  totalQuestions: number;
  disqualifiedUsers?: string[];
}

export interface Response {
  id?: string;
  quizId: string;
  questionIndex: number;
  userId: string;
  selectedOption: number;
  submittedAt: Timestamp;
  timeTaken: number; // Seconds
}