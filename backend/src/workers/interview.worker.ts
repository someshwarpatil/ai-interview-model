import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import { storageBucket } from '@/config/database';
import { logger } from '@/utils/logger';
import { InterviewSessionHelper } from '@/models/InterviewSession.model';
import { audioService } from '@/services/audio.service';
import { transcriptionService } from '@/services/transcription.service';
import { evaluationService } from '@/services/evaluation.service';
import { metricsCalculator } from '@/utils/metrics';

export interface InterviewJobData {
  sessionId: string;
  videoStoragePath: string;
}

export interface MockInterviewJobData {
  sessionId: string;
}

// Mock question-answer pairs that simulate realistic interview scenarios
interface MockQA {
  question: string;
  answer: string;
}

const MOCK_QA_PAIRS: Record<string, MockQA[]> = {
  technical: [
    {
      question: 'Explain how you would design a URL shortening service like bit.ly.',
      answer: `In my previous role, I designed a URL shortening service that handled around 10 million requests per day. The architecture used a load balancer distributing traffic across multiple application servers. For storage, I chose a combination of PostgreSQL for the URL mappings and Redis for caching the most frequently accessed short URLs. The key challenge was generating unique short codes efficiently. I implemented a base62 encoding approach using an auto-incrementing ID from the database, which gave us short, unique codes without collision risks. For scalability, we used consistent hashing to partition the data across multiple database shards. We also implemented rate limiting at the API gateway level to prevent abuse. The system achieved 99.95 percent uptime and sub-50ms response times for redirects thanks to the Redis cache layer which had about a 92 percent hit rate.`,
    },
    {
      question: 'Walk me through how you would optimize a slow database query.',
      answer: `I recently optimized a slow database query that was causing timeouts in our payment processing system. The query was joining five tables and scanning over 2 million rows. First, I used EXPLAIN ANALYZE to understand the execution plan and found that the optimizer was doing a sequential scan on the largest table instead of using the available index. The root cause was that the statistics were stale, so I ran ANALYZE on the affected tables. Then I added a composite index on the two columns used in the WHERE clause and the JOIN condition. I also rewrote the subquery as a Common Table Expression which allowed the optimizer to materialize the intermediate results. After these changes, the query went from 12 seconds to 180 milliseconds. I also set up automated monitoring alerts so we would catch similar performance regressions early.`,
    },
  ],
  behavioral: [
    {
      question: 'Describe a situation where you disagreed with a team member on a technical decision.',
      answer: `There was a situation last year where I disagreed with our tech lead about adopting a new framework for our frontend. They wanted to migrate to a newer framework for its performance benefits, but I felt the migration cost was too high given our upcoming deadline. Instead of pushing back directly in the team meeting, I prepared a comparison document showing the estimated migration effort, potential risks, and an alternative approach where we could optimize our current codebase. I scheduled a one-on-one with the tech lead to walk through my analysis. They appreciated the thorough approach and we agreed on a compromise: we would optimize the current codebase for the immediate release and plan the migration for the next quarter when we had more bandwidth. This taught me that coming with data and solutions rather than just objections leads to much better outcomes.`,
    },
    {
      question: 'Tell me about a time when you had to manage a project that was falling behind schedule.',
      answer: `In my last project, we were two weeks behind schedule on a critical feature that three enterprise clients were waiting for. As the team lead, I took ownership of the situation. First, I ran a quick retrospective to understand why we fell behind and discovered that unclear requirements had caused multiple rework cycles. I then met with the product manager to renegotiate scope, identifying two edge-case features we could push to the next sprint without impacting the core value for clients. I also reorganized the team's workload, pairing junior developers with senior ones on the riskiest components. I kept all three clients informed proactively about the revised timeline. We ended up delivering five days late instead of two weeks, and the clients appreciated the transparent communication. After the release, I introduced a Definition of Done checklist that reduced rework by about 60 percent in subsequent sprints.`,
    },
  ],
  system_design: [
    {
      question: 'How would you design a real-time notification system?',
      answer: `For designing a real-time notification system, I would start by clarifying the requirements. We need to support push notifications, in-app notifications, email, and SMS for approximately 50 million users. The system should deliver notifications within 2 seconds for real-time channels. At the high level, I would have a Notification Service that receives events from various microservices through a message queue like Kafka. This decouples the producers from the notification system. The Notification Service would determine which channels to use based on user preferences stored in a dedicated User Preferences Service backed by Redis for fast lookups. For real-time delivery, I would use WebSockets with a connection manager that tracks which server each user is connected to, storing this mapping in Redis. For reliability, each notification would be persisted to a database before delivery attempts, and we would use exponential backoff for retries on failures. I would also implement a priority queue so critical notifications like security alerts get processed before promotional ones.`,
    },
  ],
};

/**
 * Processes a mock interview without video — uses a random mock transcript
 * and runs it through the evaluation pipeline.
 */
export async function processMockInterview(data: MockInterviewJobData): Promise<void> {
  const { sessionId } = data;

  logger.info(`[MOCK] Processing interview session: ${sessionId}`);

  try {
    const session = await InterviewSessionHelper.findById(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Pick a random mock Q&A pair based on interview type
    const typeKey = session.interviewType.toLowerCase().replace(/\s+/g, '_');
    const pairs = MOCK_QA_PAIRS[typeKey] || MOCK_QA_PAIRS.behavioral;
    const picked = pairs[Math.floor(Math.random() * pairs.length)];
    const transcript = picked.answer;

    // Override the session question to match the mock answer
    await InterviewSessionHelper.updateById(sessionId, { question: picked.question });

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 2000));

    // Calculate mock speech metrics (simulated 60-120s audio)
    const mockDuration = 60 + Math.random() * 60;
    const speechMetrics = metricsCalculator.calculateSpeechMetrics(transcript, mockDuration);
    const speechScore = metricsCalculator.calculateSpeechScore(speechMetrics);

    // Evaluate content (uses mock evaluation if MOCK_MODE, or real AI)
    const evaluationResult = await evaluationService.evaluateInterview(
      transcript,
      picked.question,
      session.role,
      session.interviewType,
      speechMetrics,
      speechScore
    );

    await InterviewSessionHelper.updateById(sessionId, {
      transcript,
      speechMetrics,
      contentScore: evaluationResult.contentScore,
      speechScore: evaluationResult.speechScore,
      bodyLanguageScore: evaluationResult.bodyLanguageScore,
      finalScore: evaluationResult.finalScore,
      evaluation: evaluationResult.evaluation,
      improvedAnswer: evaluationResult.improvedAnswer,
      tips: evaluationResult.tips,
      status: 'completed',
      completedAt: new Date(),
    });

    logger.info(`[MOCK] Processing complete for ${sessionId}! Final Score: ${evaluationResult.finalScore}/100`);
  } catch (error: any) {
    logger.error(`[MOCK] Processing failed for ${sessionId}:`, error);
    try {
      await InterviewSessionHelper.updateById(sessionId, {
        status: 'failed',
        error: error.message || 'Unknown error during mock processing',
      });
    } catch (updateError) {
      logger.error(`[MOCK] Failed to update session status:`, updateError);
    }
  }
}

/**
 * Downloads video from Firebase Storage to a temp file,
 * processes it through the audio/transcription/evaluation pipeline,
 * updates Firestore with results, and cleans up temp files.
 */
export async function processInterview(data: InterviewJobData): Promise<void> {
  const { sessionId, videoStoragePath } = data;

  logger.info(`Processing interview session: ${sessionId}`);

  let tempVideoPath: string | null = null;
  let audioPath: string | null = null;

  try {
    // Fetch session details
    const session = await InterviewSessionHelper.findById(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Step 1: Download video from Firebase Storage to temp dir
    logger.info(`[${sessionId}] Step 1/5: Downloading video from storage...`);
    const tempDir = os.tmpdir();
    tempVideoPath = path.join(tempDir, `video-${sessionId}-${Date.now()}.webm`);
    await storageBucket().file(videoStoragePath).download({
      destination: tempVideoPath,
    });

    // Step 2: Extract audio from video
    logger.info(`[${sessionId}] Step 2/5: Extracting audio...`);
    audioPath = await audioService.extractAudio(tempVideoPath);

    // Get audio duration
    const audioDuration = await audioService.getAudioDuration(audioPath);
    logger.info(`[${sessionId}] Audio duration: ${audioDuration.toFixed(2)}s`);

    // Step 3: Transcribe audio with Whisper
    logger.info(`[${sessionId}] Step 3/5: Transcribing audio...`);
    const transcript = await transcriptionService.transcribe(audioPath);

    if (!transcript || transcript.length === 0) {
      throw new Error('Transcription returned empty result');
    }

    // Step 4: Calculate speech metrics
    logger.info(`[${sessionId}] Step 4/5: Calculating speech metrics...`);
    const speechMetrics = metricsCalculator.calculateSpeechMetrics(
      transcript,
      audioDuration
    );
    const speechScore = metricsCalculator.calculateSpeechScore(speechMetrics);

    // Step 5: Evaluate content with GPT-4
    logger.info(`[${sessionId}] Step 5/5: Evaluating content...`);
    const evaluationResult = await evaluationService.evaluateInterview(
      transcript,
      session.question,
      session.role,
      session.interviewType,
      speechMetrics,
      speechScore
    );

    // Save results to Firestore
    await InterviewSessionHelper.updateById(sessionId, {
      transcript,
      speechMetrics,
      contentScore: evaluationResult.contentScore,
      speechScore: evaluationResult.speechScore,
      bodyLanguageScore: evaluationResult.bodyLanguageScore,
      finalScore: evaluationResult.finalScore,
      evaluation: evaluationResult.evaluation,
      improvedAnswer: evaluationResult.improvedAnswer,
      tips: evaluationResult.tips,
      status: 'completed',
      completedAt: new Date(),
    });

    logger.info(
      `[${sessionId}] Processing complete! Final Score: ${evaluationResult.finalScore}/100`
    );
  } catch (error: any) {
    logger.error(`[${sessionId}] Processing failed:`, error);

    // Update session status to failed
    try {
      await InterviewSessionHelper.updateById(sessionId, {
        status: 'failed',
        error: error.message || 'Unknown error during processing',
      });
    } catch (updateError) {
      logger.error(
        `[${sessionId}] Failed to update session status:`,
        updateError
      );
    }
  } finally {
    // Cleanup temp files
    if (audioPath) {
      try {
        await audioService.deleteAudioFile(audioPath);
      } catch {}
    }
    if (tempVideoPath) {
      try {
        await fs.unlink(tempVideoPath);
      } catch {}
    }
  }
}
