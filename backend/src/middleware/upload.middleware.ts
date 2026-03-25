import multer from 'multer';
import { config } from '@/config';
import { AppError } from './error.middleware';

// Use memory storage — file buffer will be uploaded to Firebase Storage
const storage = multer.memoryStorage();

// File filter to allow only video files
const fileFilter = (
  req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimeTypes = [
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError(400, 'Invalid file type. Only video files are allowed.'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.storage.maxVideoSizeMB * 1024 * 1024,
  },
});
