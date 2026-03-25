import { Request, Response, NextFunction } from 'express';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import https from 'https';
import http from 'http';
import { logger } from '@/utils/logger';
import { audioService } from '@/services/audio.service';
import { transcriptionService } from '@/services/transcription.service';
import { evaluationService } from '@/services/evaluation.service';
import { metricsCalculator } from '@/utils/metrics';
import { AppError } from '@/middleware/error.middleware';

/**
 * Downloads a file from a URL to a local temp path.
 */
function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = require('fs').createWriteStream(dest);
    const client = url.startsWith('https') ? https : http;

    client
      .get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          // Follow redirect
          const redirectUrl = response.headers.location;
          if (!redirectUrl) return reject(new Error('Redirect with no location header'));
          file.close();
          return downloadFile(redirectUrl, dest).then(resolve).catch(reject);
        }
        if (response.statusCode !== 200) {
          file.close();
          return reject(new Error(`Failed to download video: HTTP ${response.statusCode}`));
        }
        response.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
      })
      .on('error', (err) => {
        file.close();
        reject(err);
      });
  });
}

/**
 * POST /api/analyze
 *
 * Accepts a video URL (or uploaded file), processes the full pipeline
 * synchronously, and returns the complete report as JSON.
 *
 * Body (JSON):
 *   { videoUrl, role, interviewType, question? }
 *
 * Or multipart/form-data:
 *   video (file), role, interviewType, question?
 */
export const analyzeInterview = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let tempVideoPath: string | null = null;
  let audioPath: string | null = null;

  try {
    const { role, interviewType, question, videoUrl } = req.body;

    if (!role || !interviewType) {
      throw new AppError(400, 'role and interviewType are required');
    }

    if (!videoUrl && !req.file) {
      throw new AppError(400, 'Either videoUrl (JSON) or video file (multipart) is required');
    }

    const questionText =
      question || 'Tell me about your experience and what makes you a great fit for this role.';

    logger.info(`[analyze] Starting synchronous analysis for ${role} - ${interviewType}`);

    // Step 1: Get video to a local temp file
    const tempDir = os.tmpdir();
    const ext = req.file ? (path.extname(req.file.originalname) || '.webm') : '.webm';
    tempVideoPath = path.join(tempDir, `analyze-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);

    if (req.file) {
      await fs.writeFile(tempVideoPath, req.file.buffer);
      logger.info(`[analyze] Using uploaded file (${(req.file.size / 1024 / 1024).toFixed(1)} MB)`);
    } else {
      logger.info(`[analyze] Downloading video from URL...`);
      await downloadFile(videoUrl, tempVideoPath);
      const stat = await fs.stat(tempVideoPath);
      logger.info(`[analyze] Downloaded ${(stat.size / 1024 / 1024).toFixed(1)} MB`);
    }

    // Step 2: Extract audio
    logger.info(`[analyze] Extracting audio...`);
    audioPath = await audioService.extractAudio(tempVideoPath);

    // Step 3: Get audio duration
    const audioDuration = await audioService.getAudioDuration(audioPath);
    logger.info(`[analyze] Audio duration: ${audioDuration.toFixed(2)}s`);

    // Step 4: Transcribe
    logger.info(`[analyze] Transcribing audio...`);
    const transcript = await transcriptionService.transcribe(audioPath);

    if (!transcript || transcript.length === 0) {
      throw new AppError(422, 'Transcription returned empty result — audio may be silent or too short');
    }

    // Step 5: Speech metrics
    logger.info(`[analyze] Calculating speech metrics...`);
    const speechMetrics = metricsCalculator.calculateSpeechMetrics(transcript, audioDuration);
    const speechScore = metricsCalculator.calculateSpeechScore(speechMetrics);

    // Step 6: AI evaluation
    logger.info(`[analyze] Evaluating content...`);
    const evaluationResult = await evaluationService.evaluateInterview(
      transcript,
      questionText,
      role,
      interviewType,
      speechMetrics,
      speechScore
    );

    logger.info(`[analyze] Done! Final Score: ${evaluationResult.finalScore}/100`);

    res.json({
      status: 'completed',
      role,
      interviewType,
      question: questionText,
      transcript,
      audioDuration: Math.round(audioDuration),
      speechMetrics,
      contentScore: evaluationResult.contentScore,
      speechScore: evaluationResult.speechScore,
      bodyLanguageScore: evaluationResult.bodyLanguageScore,
      finalScore: evaluationResult.finalScore,
      evaluation: evaluationResult.evaluation,
      improvedAnswer: evaluationResult.improvedAnswer,
      tips: evaluationResult.tips,
    });
  } catch (error) {
    next(error);
  } finally {
    // Cleanup temp files
    if (audioPath) {
      try { await audioService.deleteAudioFile(audioPath); } catch {}
    }
    if (tempVideoPath) {
      try { await fs.unlink(tempVideoPath); } catch {}
    }
  }
};
