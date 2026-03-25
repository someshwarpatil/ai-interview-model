import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from './index';
import { logger } from '@/utils/logger';

// OpenAI client (lazy initialized)
let _openai: OpenAI | null = null;
export const getOpenAI = (): OpenAI => {
  if (!_openai) {
    if (!config.ai.openai.apiKey) {
      throw new Error('OPENAI_API_KEY not set');
    }
    _openai = new OpenAI({
      apiKey: config.ai.openai.apiKey,
      maxRetries: 3,
      timeout: 60 * 1000,
    });
  }
  return _openai;
};

// Anthropic/Claude client (lazy initialized)
let _anthropic: Anthropic | null = null;
export const getAnthropic = (): Anthropic => {
  if (!_anthropic) {
    if (!config.ai.claude.apiKey) {
      throw new Error('CLAUDE_API_KEY not set');
    }
    _anthropic = new Anthropic({
      apiKey: config.ai.claude.apiKey,
    });
  }
  return _anthropic;
};

// Google Gemini client (lazy initialized)
let _gemini: GoogleGenerativeAI | null = null;
export const getGemini = (): GoogleGenerativeAI => {
  if (!_gemini) {
    if (!config.ai.gemini.apiKey) {
      throw new Error('GEMINI_API_KEY not set');
    }
    _gemini = new GoogleGenerativeAI(config.ai.gemini.apiKey);
  }
  return _gemini;
};

logger.info(`AI provider configured: ${config.ai.provider}`);
