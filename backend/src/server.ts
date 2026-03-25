import { createApp } from './app';
import { initializeFirebase } from '@/config/database';
import { config } from '@/config';
import { logger } from '@/utils/logger';

const startServer = async () => {
  try {
    // Initialize Firebase Admin SDK
    initializeFirebase();

    // Create Express app
    const app = createApp();

    // Start server
    const server = app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`);
      logger.info(`Environment: ${config.env}`);
      logger.info(`CORS enabled for: ${config.cors.origin}`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`\n${signal} received. Closing server gracefully...`);
      server.close(async () => {
        logger.info('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
