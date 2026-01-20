import OpenAI from 'openai';
import { AIScoringSuggestion, AIModelResult, FeatureRequest, ScoreFactors, OpenAIModelVersion } from '@/lib/types';
import { getEffectiveAPIKey, getAPIKeyStatus } from '@/lib/api-keys-store';

// Default model to use
const DEFAULT_OPENAI_MODEL: OpenAIModelVersion = 'gpt-4-turbo-preview';

// Cost per token varies by model
const MODEL_COSTS: Record<OpenAIModelVersion, { input: number; output: number }> = {
  'gpt-4-turbo-preview': { input: 0.00001, output: 0.00003 },  // $10/M input, $30/M output
  'gpt-4': { input: 0.00003, output: 0.00006 },                // $30/M input, $60/M output
  'gpt-4o': { input: 0.0000025, output: 0.00001 },             // $2.50/M input, $10/M output
  'gpt-4o-mini': { input: 0.00000015, output: 0.0000006 },     // $0.15/M input, $0.60/M output
};

// API Key Error type for better error handling
export class OpenAIKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OpenAIKeyError';
  }
}

// Initialize OpenAI client (async to support stored keys)
async function getOpenAIClient(): Promise<OpenAI | null> {
  const apiKey = await getEffectiveAPIKey('openai');
  if (!apiKey) {
    console.warn('OpenAI API key not configured');
    return null;
  }
  return new OpenAI({ apiKey });
}

// Get OpenAI configuration status
export async function getOpenAIConfigStatus(): Promise<{
  configured: boolean;
  source: 'stored' | 'env' | 'none';
}> {
  const status = await getAPIKeyStatus();
  return {
    configured: status.openai.configured,
    source: status.openai.source,
  };
}

// Get cost for a specific model
function getModelCost(model: OpenAIModelVersion): { input: number; output: number } {
  return MODEL_COSTS[model] || MODEL_COSTS[DEFAULT_OPENAI_MODEL];
}

export interface OpenAIScoringResponse {
  suggestions: AIScoringSuggestion[];
  summary: string;
}

// Parse AI response into structured suggestions
function parseAIResponse(content: string): OpenAIScoringResponse {
  try {
    // Try to parse as JSON first
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }

    // Try direct JSON parse
    if (content.trim().startsWith('{')) {
      return JSON.parse(content);
    }

    // Fallback: extract scores from text
    const suggestions: AIScoringSuggestion[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      // Match patterns like "Revenue Impact: 8/10" or "- Revenue Impact: 8"
      const scoreMatch = line.match(/([\w\s]+):\s*(\d+)(?:\/10)?/i);
      if (scoreMatch) {
        const factorName = scoreMatch[1].trim().toLowerCase().replace(/\s+/g, '');
        const score = parseInt(scoreMatch[2], 10);

        // Map common factor names
        const factorMap: Record<string, keyof ScoreFactors> = {
          'revenueimpact': 'revenueImpact',
          'enterprisereadiness': 'enterpriseReadiness',
          'requestvolume': 'requestVolume',
          'competitiveparity': 'competitiveParity',
          'strategicalignment': 'strategicAlignment',
          'capabilitygap': 'capabilityGap',
          'competitivedifferentiation': 'competitiveDifferentiation',
          'effort': 'effort',
          'reach': 'reach',
          'impact': 'impact',
          'confidence': 'confidence',
          'ease': 'ease',
          'value': 'value',
        };

        const factor = factorMap[factorName];
        if (factor && score >= 1 && score <= 10) {
          suggestions.push({
            factor,
            score,
            reasoning: line,
            confidence: 'medium',
          });
        }
      }
    }

    return {
      suggestions,
      summary: content.substring(0, 500),
    };
  } catch {
    console.error('Failed to parse OpenAI response:', content);
    return { suggestions: [], summary: 'Failed to parse response' };
  }
}

// Score a feature using OpenAI
export async function scoreWithOpenAI(
  feature: FeatureRequest,
  systemPrompt: string,
  userPrompt: string,
  temperature: number = 0.3,
  modelVersion: OpenAIModelVersion = DEFAULT_OPENAI_MODEL
): Promise<AIModelResult | null> {
  const client = await getOpenAIClient();
  if (!client) {
    // Return a result with error information instead of null
    return {
      model: 'openai',
      suggestions: [],
      totalScore: 0,
      summary: 'OpenAI API key not configured. Please add your OpenAI API key in Settings > API Keys.',
      tokensUsed: 0,
      cost: 0,
      error: 'API_KEY_MISSING',
    };
  }

  try {
    const response = await client.chat.completions.create({
      model: modelVersion,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content || '';
    const parsed = parseAIResponse(content);

    // Calculate tokens and cost based on model
    const inputTokens = response.usage?.prompt_tokens || 0;
    const outputTokens = response.usage?.completion_tokens || 0;
    const totalTokens = inputTokens + outputTokens;
    const modelCost = getModelCost(modelVersion);
    const cost = (inputTokens * modelCost.input) + (outputTokens * modelCost.output);

    // Calculate total score from suggestions
    let totalScore = 0;
    if (parsed.suggestions.length > 0) {
      const sum = parsed.suggestions.reduce((acc, s) => acc + s.score, 0);
      totalScore = Math.round((sum / parsed.suggestions.length) * 10) / 10;
    }

    return {
      model: 'openai',
      suggestions: parsed.suggestions,
      totalScore,
      summary: parsed.summary,
      tokensUsed: totalTokens,
      cost: Math.round(cost * 10000) / 10000,
    };
  } catch (error) {
    console.error('OpenAI scoring error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      model: 'openai',
      suggestions: [],
      totalScore: 0,
      summary: `OpenAI API error: ${errorMessage}`,
      tokensUsed: 0,
      cost: 0,
      error: errorMessage.includes('API key') ? 'API_KEY_INVALID' : 'API_ERROR',
    };
  }
}

// Check if OpenAI is configured
export async function isOpenAIConfigured(): Promise<boolean> {
  const apiKey = await getEffectiveAPIKey('openai');
  return !!apiKey;
}
