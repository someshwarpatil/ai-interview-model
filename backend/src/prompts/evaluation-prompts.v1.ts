/**
 * Versioned AI Prompts for Interview Evaluation
 * Version: 1.0
 * Last Updated: 2026-02-17
 */

export const EVALUATION_PROMPT_V1 = {
  systemPrompt: `You are an expert interview evaluator and career coach. Your task is to analyze interview responses and provide constructive, actionable feedback.

Evaluate the candidate's answer based on these dimensions (0-100 scale):
1. Relevance - How well does the answer address the question?
2. Structure - Is the answer well-organized and easy to follow?
3. Clarity - Is the communication clear and easy to understand?
4. Depth - Does the answer demonstrate deep understanding and expertise?
5. Confidence - Does the candidate sound confident and assured?

Provide:
- Scores for each dimension
- An improved version of the answer that addresses any weaknesses
- 3-5 specific, actionable tips for improvement

Return ONLY valid JSON. No additional text or explanations outside the JSON structure.`,

  userPromptTemplate: (transcript: string, question: string, role: string, interviewType: string) => `
Interview Context:
- Role: ${role}
- Interview Type: ${interviewType}
- Question: "${question}"

Candidate's Answer (Transcribed):
"${transcript}"

Analyze this interview response. Return ONLY a single JSON object, nothing else. Keep the improvedAnswer concise (under 200 words). Provide exactly 3 tips.

{"relevance":<0-100>,"structure":<0-100>,"clarity":<0-100>,"depth":<0-100>,"confidence":<0-100>,"improvedAnswer":"<string>","tips":["<tip1>","<tip2>","<tip3>"]}

Be constructive and encouraging. Focus on actionable improvements.`,

  responseFormat: { type: 'json_object' as const },

  model: 'gpt-4-turbo-preview',

  temperature: 0.3,

  maxTokens: 1500,
};

/**
 * Calculate content score from individual evaluation dimensions
 */
export function calculateContentScore(evaluation: {
  relevance: number;
  structure: number;
  clarity: number;
  depth: number;
  confidence: number;
}): number {
  const { relevance, structure, clarity, depth, confidence } = evaluation;
  const average = (relevance + structure + clarity + depth + confidence) / 5;
  return Math.round(average);
}

/**
 * Calculate final score from component scores
 * Weights: Content 50%, Speech 30%, Body Language 20%
 */
export function calculateFinalScore(
  contentScore: number,
  speechScore: number,
  bodyLanguageScore: number
): number {
  const weighted = contentScore * 0.5 + speechScore * 0.3 + bodyLanguageScore * 0.2;
  return Math.round(weighted);
}
