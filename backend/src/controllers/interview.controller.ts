import { Request, Response, NextFunction } from 'express';
import path from 'path';
import { logger } from '@/utils/logger';
import { interviewService } from '@/services/interview.service';
import { storageService } from '@/services/storage.service';
import { AppError } from '@/middleware/error.middleware';
import { processInterview, processMockInterview } from '@/workers/interview.worker';
import { config } from '@/config';

export const createInterview = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { role, interviewType, question } = req.body;

    // Validate required fields
    if (!role || !interviewType) {
      throw new AppError(400, 'Role and interview type are required');
    }

    // In mock mode, video is optional
    if (!config.mockMode && !req.file) {
      throw new AppError(400, 'Video file is required');
    }

    logger.info(`Creating interview session for ${role} - ${interviewType}${config.mockMode ? ' [MOCK]' : ''}`);

    // Get question (use provided or fetch random one)
    const questionText =
      question ||
      (await interviewService.getRandomQuestion(role, interviewType));

    // Get userId from auth middleware
    const userId = (req as any).uid;

    if (config.mockMode) {
      // Mock mode: no video upload, process with mock data
      const session = await interviewService.createSession({
        role,
        interviewType,
        question: questionText,
        videoUrl: '',
        userId,
      });

      processMockInterview({
        sessionId: session.id,
      }).catch((err: any) => {
        logger.error(`Background mock processing failed for session ${session.id}:`, err);
      });

      logger.info(`[MOCK] Session created: ${session.id}`);

      res.status(201).json({
        sessionId: session.id,
        status: 'processing',
        message: 'Mock interview session created and processing started',
      });
    } else {
      // Real mode: upload video and process
      const ext = path.extname(req.file!.originalname) || '.webm';
      const filename = `interview-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      const storagePath = await storageService.saveFile(
        req.file!.buffer,
        filename
      );
      const videoUrl = await storageService.getFileUrl(filename);

      const session = await interviewService.createSession({
        role,
        interviewType,
        question: questionText,
        videoUrl,
        userId,
      });

      processInterview({
        sessionId: session.id,
        videoStoragePath: storagePath,
      }).catch((err) => {
        logger.error(`Background processing failed for session ${session.id}:`, err);
      });

      logger.info(`Session created: ${session.id}`);

      res.status(201).json({
        sessionId: session.id,
        status: 'processing',
        message: 'Interview session created and processing started',
      });
    }
  } catch (error) {
    next(error);
  }
};

export const getInterview = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    logger.info(`Fetching interview session: ${id}`);

    const session = await interviewService.getSessionById(id);

    res.json({
      id: session.id,
      role: session.role,
      interviewType: session.interviewType,
      question: session.question,
      status: session.status,
      transcript: session.transcript,
      speechMetrics: session.speechMetrics,
      contentScore: session.contentScore,
      speechScore: session.speechScore,
      bodyLanguageScore: session.bodyLanguageScore,
      finalScore: session.finalScore,
      evaluation: session.evaluation,
      improvedAnswer: session.improvedAnswer,
      tips: session.tips,
      error: session.error,
      createdAt: session.createdAt,
      completedAt: session.completedAt,
    });
  } catch (error) {
    next(error);
  }
};
