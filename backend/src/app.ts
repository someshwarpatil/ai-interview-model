import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from '@/config';
import { errorHandler, notFoundHandler } from '@/middleware/error.middleware';
import interviewRoutes from '@/routes/interview.routes';
import analyzeRoutes from '@/routes/analyze.routes';

export const createApp = (): Application => {
  const app = express();

  // Trust the GCP/Cloud Run load balancer proxy (required for correct IP/protocol headers)
  app.set('trust proxy', true);

  // Security middleware
  app.use(helmet());

  // CORS — supports comma-separated FRONTEND_URL and all *.vercel.app previews
  const allowedOrigins = config.cors.origin.split(',').map((o) => o.trim());
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (curl, server-to-server)
        if (!origin) return callback(null, true);
        if (
          allowedOrigins.includes(origin) ||
          origin.endsWith('.vercel.app')
        ) {
          return callback(null, true);
        }
        callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    })
  );

  // Body parser
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Public config endpoint (exposes non-sensitive settings to frontend)
  app.get('/api/config', (req, res) => {
    res.json({ mockMode: config.mockMode });
  });

  // Routes
  app.use('/api/interview', interviewRoutes);
  app.use('/api/analyze', analyzeRoutes);

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
