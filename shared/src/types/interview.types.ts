export interface SpeechMetrics {
  wordsPerMinute: number;
  fillerWordsCount: number;
  pauseCount: number;
  duration: number;
}

export interface ContentEvaluation {
  relevance: number;
  structure: number;
  clarity: number;
  depth: number;
  confidence: number;
}

export type InterviewStatus = 'processing' | 'completed' | 'failed';

export interface InterviewSession {
  id: string;
  userId?: string;
  role: string;
  interviewType: string;
  question: string;
  videoUrl: string;
  transcript?: string;
  speechMetrics?: SpeechMetrics;
  contentScore?: number;
  speechScore?: number;
  bodyLanguageScore?: number;
  finalScore?: number;
  evaluation?: ContentEvaluation;
  improvedAnswer?: string;
  tips?: string[];
  status: InterviewStatus;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface CreateInterviewRequest {
  role: string;
  interviewType: string;
  question: string;
}

export interface CreateInterviewResponse {
  sessionId: string;
}

export interface User {
  id: string;
  email?: string;
  name?: string;
  createdAt: Date;
}

export interface Question {
  id: string;
  role: string;
  interviewType: string;
  text: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category?: string;
}
