import dotenv from 'dotenv';

dotenv.config();

export type AIProvider = 'gemini' | 'claude' | 'openai';

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
    serviceAccountKeyPath: process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '',
  },
  ai: {
    provider: (process.env.AI_PROVIDER || 'gemini') as AIProvider,
    gemini: {
      apiKey: process.env.GEMINI_API_KEY || '',
    },
    claude: {
      apiKey: process.env.CLAUDE_API_KEY || '',
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
    },
  },
  storage: {
    maxVideoSizeMB: parseInt(process.env.MAX_VIDEO_SIZE_MB || '50', 10),
  },
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  },
  mockMode: process.env.MOCK_MODE === 'true',
};
