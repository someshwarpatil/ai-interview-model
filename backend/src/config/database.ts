import * as admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { config } from './index';
import { logger } from '@/utils/logger';

let initialized = false;

export const initializeFirebase = (): void => {
  if (initialized) return;

  try {
    const options: admin.AppOptions = {
      projectId: config.firebase.projectId,
      storageBucket: config.firebase.storageBucket,
    };

    // Try service account key file for local development
    if (config.firebase.serviceAccountKeyPath) {
      const keyPath = path.resolve(
        process.cwd(),
        config.firebase.serviceAccountKeyPath
      );
      if (fs.existsSync(keyPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
        options.credential = admin.credential.cert(serviceAccount);
        logger.info('Using service account key for Firebase credentials');
      } else {
        logger.info(
          'Service account key not found, using Application Default Credentials'
        );
      }
    }

    admin.initializeApp(options);
    initialized = true;
    logger.info('Firebase Admin SDK initialized successfully');
  } catch (error) {
    logger.error('Firebase Admin SDK initialization error:', error);
    process.exit(1);
  }
};

export const db = () => admin.firestore();
export const storageBucket = () => admin.storage().bucket();
