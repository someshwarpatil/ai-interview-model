import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import { logger } from '@/utils/logger';
import { AppError } from './error.middleware';

// Extend Express Request to include Firebase auth fields
declare global {
  namespace Express {
    interface Request {
      uid?: string;
      email?: string;
    }
  }
}

/**
 * Middleware that verifies Firebase ID token from Authorization header.
 * Sets req.uid and req.email on success.
 */
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(401, 'Missing or invalid authorization header');
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    req.uid = decodedToken.uid;
    req.email = decodedToken.email;

    next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    logger.error('Auth verification failed:', error);
    next(new AppError(401, 'Invalid or expired authentication token'));
  }
};
