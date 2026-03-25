import {
  InterviewSessionHelper,
  IInterviewSession,
} from '@/models/InterviewSession.model';
import { QuestionHelper } from '@/models/Question.model';
import { AppError } from '@/middleware/error.middleware';
import { logger } from '@/utils/logger';

export interface CreateSessionData {
  role: string;
  interviewType: string;
  question: string;
  videoUrl: string;
  userId?: string;
}

export class InterviewService {
  async createSession(data: CreateSessionData): Promise<IInterviewSession> {
    try {
      const session = await InterviewSessionHelper.create({
        userId: data.userId,
        role: data.role,
        interviewType: data.interviewType,
        question: data.question,
        videoUrl: data.videoUrl,
        status: 'processing',
      });

      logger.info(`Interview session created: ${session.id}`);
      return session;
    } catch (error) {
      logger.error('Failed to create interview session:', error);
      throw new AppError(500, 'Failed to create interview session');
    }
  }

  async getSessionById(sessionId: string): Promise<IInterviewSession> {
    try {
      const session = await InterviewSessionHelper.findById(sessionId);

      if (!session) {
        throw new AppError(404, 'Interview session not found');
      }

      return session;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error(`Failed to get session ${sessionId}:`, error);
      throw new AppError(500, 'Failed to retrieve interview session');
    }
  }

  async updateSessionStatus(
    sessionId: string,
    status: 'processing' | 'completed' | 'failed',
    error?: string
  ): Promise<void> {
    try {
      const updateData: Partial<IInterviewSession> = { status };

      if (status === 'completed') {
        updateData.completedAt = new Date();
      }

      if (error) {
        updateData.error = error;
      }

      await InterviewSessionHelper.updateById(sessionId, updateData);
      logger.info(`Session ${sessionId} status updated to: ${status}`);
    } catch (error) {
      logger.error(`Failed to update session ${sessionId} status:`, error);
      throw new AppError(500, 'Failed to update session status');
    }
  }

  async getRandomQuestion(
    role: string,
    interviewType: string
  ): Promise<string> {
    try {
      const questions = await QuestionHelper.findByRoleAndType(
        role,
        interviewType
      );

      if (questions.length === 0) {
        return this.getDefaultQuestion(role, interviewType);
      }

      const randomIndex = Math.floor(Math.random() * questions.length);
      return questions[randomIndex].text;
    } catch (error) {
      logger.error('Failed to get random question:', error);
      return this.getDefaultQuestion(role, interviewType);
    }
  }

  private getDefaultQuestion(role: string, interviewType: string): string {
    const defaultQuestions: Record<string, Record<string, string>> = {
      'Software Engineer': {
        Technical:
          'Explain how you would design a URL shortening service like bit.ly.',
        Behavioral:
          'Tell me about a time when you had to debug a complex issue in production.',
      },
      'Product Manager': {
        Technical:
          'How would you prioritize features for a new product launch?',
        Behavioral:
          'Describe a situation where you had to make a difficult product decision.',
      },
      'Data Scientist': {
        Technical:
          'Explain how you would approach building a recommendation system.',
        Behavioral:
          'Tell me about a time when your data analysis led to a significant business insight.',
      },
    };

    return (
      defaultQuestions[role]?.[interviewType] ||
      'Tell me about your experience and what makes you a great fit for this role.'
    );
  }
}

export const interviewService = new InterviewService();
