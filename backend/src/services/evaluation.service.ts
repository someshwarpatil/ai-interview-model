import { getOpenAI, getGemini, getAnthropic } from '@/config/ai';
import { logger } from '@/utils/logger';
import { AppError } from '@/middleware/error.middleware';
import { config } from '@/config';
import {
  EVALUATION_PROMPT_V1,
  calculateContentScore,
  calculateFinalScore,
} from '@/prompts/evaluation-prompts.v1';
import { SpeechMetricsResult } from '@/utils/metrics';

export interface EvaluationResult {
  contentScore: number;
  speechScore: number;
  bodyLanguageScore: number;
  finalScore: number;
  evaluation: {
    relevance: number;
    structure: number;
    clarity: number;
    depth: number;
    confidence: number;
  };
  improvedAnswer: string;
  tips: string[];
}

// Realistic mock evaluation templates per interview type
const MOCK_EVALUATIONS = {
  technical: {
    relevance: 78,
    structure: 72,
    clarity: 75,
    depth: 80,
    confidence: 68,
    improvedAnswer: `A strong technical answer should begin with a concise problem statement, then walk through your solution approach systematically.
For example: "The core challenge was scaling our monolithic application under peak load. I started by profiling the system to identify bottlenecks—the database layer was the primary constraint.
I proposed and led the migration to a microservices architecture over 3 sprints: first extracting the authentication service, then the payment processor, then the core business logic.
We used Docker containers orchestrated by Kubernetes, with Redis for session management and RabbitMQ for async inter-service communication.
Post-migration, p99 latency dropped from 2.1s to 340ms and we achieved 99.97% uptime over the next quarter."`,
    tips: [
      'Lead with quantifiable impact — numbers (latency, throughput, uptime) make your answer memorable',
      'Use the STAR format: Situation → Task → Action → Result for behavioral technical questions',
      'Mention specific technologies but explain the "why" behind each choice, not just the "what"',
      'Acknowledge trade-offs you considered — it shows senior engineering thinking',
      'Prepare a 30-second summary version and a 3-minute deep-dive version of the same answer',
    ],
  },
  behavioral: {
    relevance: 82,
    structure: 76,
    clarity: 80,
    depth: 70,
    confidence: 74,
    improvedAnswer: `An ideal behavioral answer uses the STAR method with specific, concrete details.
"When our team missed a critical deadline, I took immediate ownership. [Situation] We were 2 weeks behind on a feature that 3 enterprise clients were waiting on. [Task] As tech lead, I needed to recover the timeline without burning out the team.
[Action] I ran a quick retrospective to understand the root cause—unclear requirements had caused three rework cycles. I renegotiated scope with the PM, cutting two edge-case features for a later sprint, and pair-programmed with the junior devs on the riskiest components.
[Result] We shipped 5 days late instead of 2 weeks, and the clients appreciated the proactive communication. I introduced a Definition of Done checklist that reduced rework by 60% in subsequent sprints."`,
    tips: [
      'Always close the loop with measurable results — what changed because of your actions?',
      'Include how you handled emotions or conflict — interviewers want to see self-awareness',
      'Avoid using "we" when describing your specific actions — be clear about your individual contribution',
      'Prepare 5-6 core stories that can be adapted to different behavioral questions',
      'Practice pausing before answering — it shows you are thoughtful, not rehearsed',
    ],
  },
  system_design: {
    relevance: 74,
    structure: 85,
    clarity: 78,
    depth: 82,
    confidence: 70,
    improvedAnswer: `System design answers should follow a structured framework: clarify requirements → estimate scale → design high-level → dive deep → identify bottlenecks → discuss trade-offs.
"For designing a URL shortener at Twitter scale: [Requirements] 100M URLs/day writes, 10B reads/day, low latency, high availability. [Scale] ~1150 writes/sec, 115K reads/sec, store ~3.6T URLs/year.
[Design] Write path: API Gateway → App Servers → Cassandra (partition by short code). Read path: CDN → App Servers → Redis cache (hit rate ~95%) → Cassandra.
Base62 encoding on auto-incremented IDs for short codes. [Trade-offs] Cassandra gives us horizontal scalability but eventual consistency — acceptable for URL redirection."`,
    tips: [
      'Always clarify functional and non-functional requirements first — never assume scale',
      'Draw the architecture out loud, narrating each component as you add it',
      'Proactively identify single points of failure and explain how you would mitigate them',
      'Discuss trade-offs explicitly — SQL vs NoSQL, consistency vs availability',
      'Allocate time wisely: 5 min requirements, 10 min high-level design, 10 min deep dive',
    ],
  },
};

export class EvaluationService {
  async evaluateInterview(
    transcript: string,
    question: string,
    role: string,
    interviewType: string,
    speechMetrics: SpeechMetricsResult,
    speechScore: number
  ): Promise<EvaluationResult> {
    if (config.mockMode) {
      return this.mockEvaluate(interviewType, speechScore);
    }

    const provider = config.ai.provider;
    logger.info(`Evaluating interview with provider: ${provider}`);

    switch (provider) {
      case 'gemini':
        return this.evaluateWithGemini(transcript, question, role, interviewType, speechScore);
      case 'claude':
        return this.evaluateWithClaude(transcript, question, role, interviewType, speechScore);
      case 'openai':
        return this.evaluateWithOpenAI(transcript, question, role, interviewType, speechScore);
      default:
        throw new AppError(500, `Unknown AI provider: ${provider}`);
    }
  }

  private async evaluateWithOpenAI(
    transcript: string, question: string, role: string,
    interviewType: string, speechScore: number
  ): Promise<EvaluationResult> {
    try {
      const openai = getOpenAI();
      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: EVALUATION_PROMPT_V1.systemPrompt },
          {
            role: 'user',
            content: EVALUATION_PROMPT_V1.userPromptTemplate(transcript, question, role, interviewType),
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 4096,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new AppError(500, 'No response from OpenAI');

      return this.parseAndScore(content, speechScore, 'OpenAI');
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      logger.error('OpenAI evaluation error:', error);
      throw new AppError(500, `OpenAI evaluation failed: ${error.message}`);
    }
  }

  private async evaluateWithGemini(
    transcript: string, question: string, role: string,
    interviewType: string, speechScore: number
  ): Promise<EvaluationResult> {
    try {
      const gemini = getGemini();
      const model = gemini.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
        },
      });

      const prompt = `${EVALUATION_PROMPT_V1.systemPrompt}\n\n${EVALUATION_PROMPT_V1.userPromptTemplate(transcript, question, role, interviewType)}`;

      const result = await model.generateContent(prompt);
      const content = result.response.text();
      if (!content) throw new AppError(500, 'No response from Gemini');

      return this.parseAndScore(content, speechScore, 'Gemini');
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      logger.error('Gemini evaluation error:', error);
      throw new AppError(500, `Gemini evaluation failed: ${error.message}`);
    }
  }

  private async evaluateWithClaude(
    transcript: string, question: string, role: string,
    interviewType: string, speechScore: number
  ): Promise<EvaluationResult> {
    try {
      const anthropic = getAnthropic();
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: `${EVALUATION_PROMPT_V1.systemPrompt}\n\n${EVALUATION_PROMPT_V1.userPromptTemplate(transcript, question, role, interviewType)}`,
          },
        ],
      });

      const textBlock = response.content.find((block) => block.type === 'text');
      const content = textBlock?.type === 'text' ? textBlock.text : null;
      if (!content) throw new AppError(500, 'No response from Claude');

      // Claude may wrap JSON in markdown code blocks, extract it
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      const jsonStr = jsonMatch[1]?.trim() || content.trim();

      return this.parseAndScore(jsonStr, speechScore, 'Claude');
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      logger.error('Claude evaluation error:', error);
      throw new AppError(500, `Claude evaluation failed: ${error.message}`);
    }
  }

  private extractJSON(content: string): any {
    // Try direct parse first
    try {
      return JSON.parse(content);
    } catch {
      // Extract JSON object from surrounding text/markdown
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
      throw new AppError(500, 'Could not extract valid JSON from AI response');
    }
  }

  private parseAndScore(
    content: string,
    speechScore: number,
    providerName: string
  ): EvaluationResult {
    logger.debug(`Raw ${providerName} response (${content.length} chars): ${content.substring(0, 200)}...`);
    const evaluation = this.extractJSON(content);
    this.validateEvaluationResponse(evaluation);

    const contentScore = calculateContentScore({
      relevance: evaluation.relevance,
      structure: evaluation.structure,
      clarity: evaluation.clarity,
      depth: evaluation.depth,
      confidence: evaluation.confidence,
    });

    const bodyLanguageScore = 50; // Placeholder for MVP
    const finalScore = calculateFinalScore(contentScore, speechScore, bodyLanguageScore);

    logger.info(
      `Evaluation complete (${providerName}): Content ${contentScore}, Speech ${speechScore}, Final ${finalScore}`
    );

    return {
      contentScore,
      speechScore,
      bodyLanguageScore,
      finalScore,
      evaluation: {
        relevance: evaluation.relevance,
        structure: evaluation.structure,
        clarity: evaluation.clarity,
        depth: evaluation.depth,
        confidence: evaluation.confidence,
      },
      improvedAnswer: evaluation.improvedAnswer,
      tips: evaluation.tips,
    };
  }

  private async mockEvaluate(interviewType: string, speechScore: number): Promise<EvaluationResult> {
    logger.info(`[MOCK] Evaluating interview (type: ${interviewType})...`);
    await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 1200));

    const template =
      MOCK_EVALUATIONS[interviewType as keyof typeof MOCK_EVALUATIONS] ||
      MOCK_EVALUATIONS.behavioral;

    const jitter = () => Math.floor((Math.random() - 0.5) * 10);
    const clamp = (v: number) => Math.min(100, Math.max(0, v));

    const evaluation = {
      relevance: clamp(template.relevance + jitter()),
      structure: clamp(template.structure + jitter()),
      clarity: clamp(template.clarity + jitter()),
      depth: clamp(template.depth + jitter()),
      confidence: clamp(template.confidence + jitter()),
    };

    const contentScore = calculateContentScore(evaluation);
    const bodyLanguageScore = clamp(52 + jitter());
    const finalScore = calculateFinalScore(contentScore, speechScore, bodyLanguageScore);

    logger.info(
      `[MOCK] Evaluation complete: Content ${contentScore}, Speech ${speechScore}, Final ${finalScore}`
    );

    return {
      contentScore,
      speechScore,
      bodyLanguageScore,
      finalScore,
      evaluation,
      improvedAnswer: template.improvedAnswer,
      tips: template.tips,
    };
  }

  private validateEvaluationResponse(evaluation: any): void {
    const requiredFields = [
      'relevance', 'structure', 'clarity', 'depth', 'confidence', 'improvedAnswer', 'tips',
    ];

    for (const field of requiredFields) {
      if (!(field in evaluation)) {
        throw new AppError(500, `Missing field in AI response: ${field}`);
      }
    }

    const scores = ['relevance', 'structure', 'clarity', 'depth', 'confidence'];
    for (const score of scores) {
      const value = evaluation[score];
      if (typeof value !== 'number' || value < 0 || value > 100) {
        throw new AppError(500, `Invalid score for ${score}: ${value}`);
      }
    }

    if (!Array.isArray(evaluation.tips) || evaluation.tips.length === 0) {
      throw new AppError(500, 'Tips must be a non-empty array');
    }
  }
}

export const evaluationService = new EvaluationService();
