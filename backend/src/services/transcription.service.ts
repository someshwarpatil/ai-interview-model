import { getOpenAI, getGemini } from '@/config/ai';
import { logger } from '@/utils/logger';
import { AppError } from '@/middleware/error.middleware';
import { config, AIProvider } from '@/config';
import fs from 'fs';
import path from 'path';

// Realistic mock transcripts for demo purposes
const MOCK_TRANSCRIPTS = [
  `In my previous role as a software engineer, I worked extensively with distributed systems and microservices architecture.
   One of the challenges we faced was handling high-traffic scenarios, where we had to scale our services horizontally.
   I led the initiative to migrate our monolithic application to microservices using Docker and Kubernetes.
   This involved breaking down the core functionalities into independent services, setting up CI/CD pipelines,
   and ensuring seamless communication between services via REST APIs and message queues like RabbitMQ.
   The result was a 40 percent improvement in system performance and reduced deployment times from hours to minutes.`,

  `My approach to problem solving starts with understanding the root cause before jumping to solutions.
   For example, when our team encountered a critical bug in production that was causing data inconsistencies,
   I organized a quick debugging session where we systematically traced the issue using logs and monitoring tools.
   I believe in clear communication, so I kept stakeholders informed throughout the process.
   We identified that a race condition in our database writes was the culprit.
   I implemented proper locking mechanisms and added comprehensive unit tests to prevent recurrence.
   This experience reinforced my belief in test-driven development and proactive monitoring.`,

  `Leadership for me is about empowering others and creating an environment where people can do their best work.
   In my last position, I managed a team of five engineers working on a customer-facing platform.
   I introduced weekly one-on-ones to understand individual goals and blockers, and weekly retrospectives to continuously improve our processes.
   When we had a tight deadline for a major feature release, I worked with the team to prioritize tasks effectively,
   delegated based on each person's strengths, and ensured we maintained code quality standards.
   We delivered on time and the feature became one of our most popular, increasing user engagement by 25 percent.`,
];

export class TranscriptionService {
  async transcribe(audioPath: string): Promise<string> {
    if (config.mockMode) {
      return this.mockTranscribe(audioPath);
    }

    const provider = config.ai.provider;
    logger.info(`Transcribing audio with provider: ${provider}`);

    switch (provider) {
      case 'gemini':
        return this.transcribeWithGemini(audioPath);
      case 'openai':
        return this.transcribeWithOpenAI(audioPath);
      case 'claude':
        // Claude doesn't support audio transcription natively.
        // Use Gemini if key is available, otherwise OpenAI.
        if (config.ai.gemini.apiKey) {
          logger.info('Claude has no audio API, falling back to Gemini for transcription');
          return this.transcribeWithGemini(audioPath);
        } else if (config.ai.openai.apiKey) {
          logger.info('Claude has no audio API, falling back to OpenAI Whisper for transcription');
          return this.transcribeWithOpenAI(audioPath);
        }
        throw new AppError(500, 'Claude does not support audio transcription. Set GEMINI_API_KEY or OPENAI_API_KEY for transcription.');
      default:
        throw new AppError(500, `Unknown AI provider: ${provider}`);
    }
  }

  private async transcribeWithOpenAI(audioPath: string): Promise<string> {
    try {
      logger.info(`Transcribing with OpenAI Whisper: ${path.basename(audioPath)}`);

      const openai = getOpenAI();
      const fileBuffer = fs.readFileSync(audioPath);
      const fileName = path.basename(audioPath);
      const file = new File([fileBuffer], fileName, { type: 'audio/mpeg' });

      const response = await openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
        language: 'en',
      });

      const transcript = response.text;
      logger.info(`Transcription completed (OpenAI): ${transcript.split(' ').length} words`);
      return transcript.trim();
    } catch (error: any) {
      if (error?.status === 429 || error?.code === 'insufficient_quota' ||
          error?.error?.code === 'insufficient_quota') {
        logger.error('OpenAI quota exceeded');
        throw new AppError(402, 'OpenAI API quota exceeded. Please add credits.');
      }
      logger.error('OpenAI transcription error:', error);
      throw new AppError(500, `Transcription failed: ${error.message}`);
    }
  }

  private async transcribeWithGemini(audioPath: string): Promise<string> {
    try {
      logger.info(`Transcribing with Gemini: ${path.basename(audioPath)}`);

      const gemini = getGemini();
      const model = gemini.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const audioBuffer = fs.readFileSync(audioPath);
      const audioBase64 = audioBuffer.toString('base64');

      // Determine MIME type
      const ext = path.extname(audioPath).toLowerCase();
      const mimeMap: Record<string, string> = {
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.ogg': 'audio/ogg',
        '.webm': 'audio/webm',
        '.m4a': 'audio/mp4',
      };
      const mimeType = mimeMap[ext] || 'audio/mpeg';

      const result = await model.generateContent([
        {
          inlineData: {
            data: audioBase64,
            mimeType,
          },
        },
        'Transcribe this audio accurately. Return ONLY the transcription text, no timestamps or labels.',
      ]);

      const transcript = result.response.text();
      logger.info(`Transcription completed (Gemini): ${transcript.split(' ').length} words`);
      return transcript.trim();
    } catch (error: any) {
      logger.error('Gemini transcription error:', error);
      throw new AppError(500, `Gemini transcription failed: ${error.message}`);
    }
  }

  private async mockTranscribe(audioPath: string): Promise<string> {
    logger.info(`[MOCK] Transcribing audio: ${path.basename(audioPath)}`);
    await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1000));
    const transcript = MOCK_TRANSCRIPTS[Math.floor(Math.random() * MOCK_TRANSCRIPTS.length)];
    logger.info(`[MOCK] Transcription complete: ${transcript.split(' ').length} words`);
    return transcript.trim();
  }
}

export const transcriptionService = new TranscriptionService();
