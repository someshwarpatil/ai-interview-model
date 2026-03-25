import { logger } from './logger';

const FILLER_WORDS = [
  'um', 'uh', 'like', 'you know', 'i mean',
  'basically', 'actually', 'literally', 'sort of', 'kind of',
] as const;

export interface SpeechMetricsResult {
  wordsPerMinute: number;
  fillerWordsCount: number;
  pauseCount: number;
  duration: number;
}

export class MetricsCalculator {
  calculateSpeechMetrics(transcript: string, durationSeconds: number): SpeechMetricsResult {
    logger.info('📊 Calculating speech metrics...');

    // Count total words
    const words = transcript.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    const totalWords = words.length;

    // Calculate words per minute
    const durationMinutes = durationSeconds / 60;
    const wordsPerMinute = Math.round(totalWords / durationMinutes);

    // Count filler words
    const fillerWordsCount = this.countFillerWords(transcript);

    // Basic pause count estimation (periods, commas)
    const pauseCount = (transcript.match(/[,;.!?]/g) || []).length;

    const metrics: SpeechMetricsResult = {
      wordsPerMinute,
      fillerWordsCount,
      pauseCount,
      duration: Math.round(durationSeconds),
    };

    logger.info(`✅ Metrics: ${wordsPerMinute} WPM, ${fillerWordsCount} filler words`);

    return metrics;
  }

  private countFillerWords(transcript: string): number {
    const lowerTranscript = transcript.toLowerCase();
    let count = 0;

    for (const fillerWord of FILLER_WORDS) {
      // Use word boundaries to match whole words/phrases
      const regex = new RegExp(`\\b${fillerWord}\\b`, 'gi');
      const matches = lowerTranscript.match(regex);
      count += matches ? matches.length : 0;
    }

    return count;
  }

  calculateSpeechScore(metrics: SpeechMetricsResult): number {
    // Ideal WPM is 120-150
    const wpmScore = this.scoreWPM(metrics.wordsPerMinute);

    // Fewer filler words is better
    const fillerWordsScore = this.scoreFillerWords(metrics.fillerWordsCount, metrics.duration);

    // Balanced speech with some natural pauses
    const pauseScore = this.scorePauses(metrics.pauseCount, metrics.duration);

    // Weighted average
    const speechScore = wpmScore * 0.5 + fillerWordsScore * 0.3 + pauseScore * 0.2;

    return Math.round(Math.max(0, Math.min(100, speechScore)));
  }

  private scoreWPM(wpm: number): number {
    // Optimal range: 120-150 WPM
    if (wpm >= 120 && wpm <= 150) return 100;
    if (wpm >= 100 && wpm < 120) return 85;
    if (wpm > 150 && wpm <= 180) return 85;
    if (wpm >= 80 && wpm < 100) return 70;
    if (wpm > 180 && wpm <= 200) return 70;
    if (wpm >= 60 && wpm < 80) return 50;
    if (wpm > 200) return 50;
    return 30;
  }

  private scoreFillerWords(fillerCount: number, duration: number): number {
    // Filler words per minute
    const fillerPerMinute = (fillerCount / duration) * 60;

    if (fillerPerMinute <= 1) return 100;
    if (fillerPerMinute <= 2) return 85;
    if (fillerPerMinute <= 3) return 70;
    if (fillerPerMinute <= 5) return 50;
    return 30;
  }

  private scorePauses(pauseCount: number, duration: number): number {
    // Pauses per minute (natural pauses from punctuation)
    const pausesPerMinute = (pauseCount / duration) * 60;

    // 5-10 pauses per minute is good (natural speaking)
    if (pausesPerMinute >= 5 && pausesPerMinute <= 10) return 100;
    if (pausesPerMinute >= 3 && pausesPerMinute < 5) return 85;
    if (pausesPerMinute > 10 && pausesPerMinute <= 15) return 85;
    if (pausesPerMinute >= 2 && pausesPerMinute < 3) return 70;
    if (pausesPerMinute > 15) return 60;
    return 50;
  }
}

export const metricsCalculator = new MetricsCalculator();
