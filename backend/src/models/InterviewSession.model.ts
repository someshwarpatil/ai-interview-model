import { db } from '@/config/database';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

export interface ISpeechMetrics {
  wordsPerMinute: number;
  fillerWordsCount: number;
  pauseCount: number;
  duration: number;
}

export interface IContentEvaluation {
  relevance: number;
  structure: number;
  clarity: number;
  depth: number;
  confidence: number;
}

export interface IInterviewSession {
  id: string;
  userId?: string;
  role: string;
  interviewType: string;
  question: string;
  videoUrl: string;
  transcript?: string;
  speechMetrics?: ISpeechMetrics;
  contentScore?: number;
  speechScore?: number;
  bodyLanguageScore?: number;
  finalScore?: number;
  evaluation?: IContentEvaluation;
  improvedAnswer?: string;
  tips?: string[];
  status: 'processing' | 'completed' | 'failed';
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

const COLLECTION = 'interviews';

export const interviewCollection = () => db().collection(COLLECTION);

export const InterviewSessionHelper = {
  async create(
    data: Omit<IInterviewSession, 'id' | 'createdAt'>
  ): Promise<IInterviewSession> {
    const docRef = interviewCollection().doc();
    const now = new Date();
    const docData = {
      ...data,
      createdAt: Timestamp.fromDate(now),
    };
    await docRef.set(docData);
    return { id: docRef.id, ...data, createdAt: now };
  },

  async findById(id: string): Promise<IInterviewSession | null> {
    const snap = await interviewCollection().doc(id).get();
    if (!snap.exists) return null;
    const data = snap.data()!;
    return {
      ...data,
      id: snap.id,
      createdAt: data.createdAt?.toDate?.() ?? data.createdAt,
      completedAt: data.completedAt?.toDate?.() ?? data.completedAt,
    } as IInterviewSession;
  },

  async updateById(
    id: string,
    data: Partial<Omit<IInterviewSession, 'id'>>
  ): Promise<void> {
    const updateData: Record<string, any> = { ...data };
    // Convert Date fields to Firestore Timestamps
    if (updateData.completedAt instanceof Date) {
      updateData.completedAt = Timestamp.fromDate(updateData.completedAt);
    }
    await interviewCollection().doc(id).update(updateData);
  },
};
