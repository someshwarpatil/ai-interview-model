import { Router, Request, Response, NextFunction } from 'express';
import { analyzeInterview } from '@/controllers/analyze.controller';
import { upload } from '@/middleware/upload.middleware';
import { requireAuth } from '@/middleware/auth.middleware';

const router = Router();

// Accept either JSON (with videoUrl) or multipart (with video file)
const optionalUpload = (req: Request, res: Response, next: NextFunction) => {
  if (req.is('application/json')) {
    return next();
  }
  return upload.single('video')(req, res, next);
};

// POST /api/analyze - Synchronous video analysis, returns full report
router.post('/', requireAuth, optionalUpload, analyzeInterview);

export default router;
