import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs/promises';
import { logger } from '@/utils/logger';
import { AppError } from '@/middleware/error.middleware';

export class AudioService {
  async extractAudio(videoPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const audioPath = path.join(
        path.dirname(videoPath),
        `audio-${Date.now()}-${Math.random().toString(36).substring(7)}.mp3`
      );

      logger.info(`🎵 Extracting audio from: ${path.basename(videoPath)}`);

      ffmpeg(videoPath)
        .output(audioPath)
        .audioCodec('libmp3lame')
        .audioBitrate('128k')
        .noVideo()
        .on('end', () => {
          logger.info(`✅ Audio extracted: ${path.basename(audioPath)}`);
          resolve(audioPath);
        })
        .on('error', (error) => {
          logger.error('❌ FFmpeg error:', error);
          reject(new AppError(500, `Audio extraction failed: ${error.message}`));
        })
        .run();
    });
  }

  async deleteAudioFile(audioPath: string): Promise<void> {
    try {
      await fs.unlink(audioPath);
      logger.info(`🗑️  Deleted temporary audio file: ${path.basename(audioPath)}`);
    } catch (error) {
      logger.warn(`Failed to delete audio file ${audioPath}:`, error);
    }
  }

  async getAudioDuration(audioPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(audioPath, (error, metadata) => {
        if (error) {
          reject(new AppError(500, `Failed to get audio duration: ${error.message}`));
        } else {
          resolve(metadata.format.duration || 0);
        }
      });
    });
  }
}

export const audioService = new AudioService();
