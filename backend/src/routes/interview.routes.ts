import { Router, Request, Response, NextFunction } from 'express';
import { createInterview, getInterview } from '@/controllers/interview.controller';
import { upload } from '@/middleware/upload.middleware';
import { requireAuth } from '@/middleware/auth.middleware';
import { config } from '@/config';

const router = Router();

// Conditionally apply multer: skip for mock mode JSON requests
const optionalUpload = (req: Request, res: Response, next: NextFunction) => {
  if (config.mockMode && req.is('application/json')) {
    return next();
  }
  return upload.single('video')(req, res, next);
};

// POST /api/interview - Create new interview session with video upload
router.post('/', requireAuth, optionalUpload, createInterview);

// GET /api/interview/:id - Get interview session status and results
router.get('/:id', requireAuth, getInterview);

export default router;
