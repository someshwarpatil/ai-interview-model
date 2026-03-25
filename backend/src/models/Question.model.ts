import { db } from '@/config/database';

export interface IQuestion {
  id: string;
  role: string;
  interviewType: string;
  text: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category?: string;
}

const COLLECTION = 'questions';

export const questionCollection = () => db().collection(COLLECTION);

export const QuestionHelper = {
  async findByRoleAndType(
    role: string,
    interviewType: string
  ): Promise<IQuestion[]> {
    const snap = await questionCollection()
      .where('role', '==', role)
      .where('interviewType', '==', interviewType)
      .get();
    return snap.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as IQuestion)
    );
  },
};
