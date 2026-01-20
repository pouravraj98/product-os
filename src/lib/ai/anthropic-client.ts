import Anthropic from '@anthropic-ai/sdk';
import { AIScoringSuggestion, AIModelResult, FeatureRequest, ScoreFactors, AnthropicModelVersion } from '@/lib/types';
import { getEffectiveAPIKey, getAPIKeyStatus } from '@/lib/api-keys-store';

// Default model to use
const DEFAULT_ANTHROPIC_MODEL: AnthropicModelVersion = 'claude-sonnet-4-20250514';

// Cost per token varies by model
const MODEL_COSTS: Record<AnthropicModelVersion, { input: number; output: number }> = {
  'claude-sonnet-4-20250514': { input: 0.000003, output: 0.000015 },    // $3/M input, $15/M output
  'claude-3-5-sonnet-20241022': { input: 0.000003, output: 0.000015 }, // $3/M input, $15/M output
  'claude-3-opus-20240229': { input: 0.000015, output: 0.000075 },     // $15/M input, $75/M output
  'claude-3-haiku-20240307': { input: 0.00000025, output: 0.00000125 }, // $0.25/M input, $1.25/M output
};

// API Key Error type for better error handling
export class AnthropicKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AnthropicKeyError';
  }
}

// Initialize Anthropic client (async to support stored keys)
async function getAnthropicClient(): Promise<Anthropic | null> {
  const apiKey = await getEffectiveAPIKey('anthropic');
  if (!apiKey) {
    console.warn('Anthropic API key not configured');
    return null;
  }
  return new Anthropic({ apiKey });
}

// Get Anthropic configuration status
export async function getAnthropicConfigStatus(): Promise<{
  configured: boolean;
  source: 'stored' | 'env' | 'none';
}> {
  const status = await getAPIKeyStatus();
  return {
    configured: status.anthropic.configured,
    source: status.anthropic.source,
  };
}

// Get cost for a specific model
function getModelCost(model: AnthropicModelVersion): { input: number; output: number } {
  return MODEL_COSTS[model] || MODEL_COSTS[DEFAULT_ANTHROPIC_MODEL];
}

export interface AnthropicScoringResponse {
  suggestions: AIScoringSuggestion[];
  summary: string;
}

// Parse AI response into structured suggestions
function parseAIResponse(content: string): AnthropicScoringResponse {
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
    console.error('Failed to parse Anthropic response:', content);
    return { suggestions: [], summary: 'Failed to parse response' };
  }
}

// Score a feature using Anthropic Claude
export async function scoreWithAnthropic(
  feature: FeatureRequest,
  systemPrompt: string,
  userPrompt: string,
  temperature: number = 0.3,
  modelVersion: AnthropicModelVersion = DEFAULT_ANTHROPIC_MODEL
): Promise<AIModelResult | null> {
  const client = await getAnthropicClient();
  if (!client) {
    // Return a result with error information instead of null
    return {
      model: 'anthropic',
      suggestions: [],
      totalScore: 0,
      summary: 'Anthropic API key not configured. Please add your Anthropic API key in Settings > API Keys.',
      tokensUsed: 0,
      cost: 0,
      error: 'API_KEY_MISSING',
    };
  }

  try {
    const response = await client.messages.create({
      model: modelVersion,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt },
      ],
      temperature,
    });

    const content = response.content[0]?.type === 'text' ? response.content[0].text : '';
    const parsed = parseAIResponse(content);

    // Calculate tokens and cost based on model
    const inputTokens = response.usage?.input_tokens || 0;
    const outputTokens = response.usage?.output_tokens || 0;
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
      model: 'anthropic',
      suggestions: parsed.suggestions,
      totalScore,
      summary: parsed.summary,
      tokensUsed: totalTokens,
      cost: Math.round(cost * 10000) / 10000,
    };
  } catch (error) {
    console.error('Anthropic scoring error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      model: 'anthropic',
      suggestions: [],
      totalScore: 0,
      summary: `Anthropic API error: ${errorMessage}`,
      tokensUsed: 0,
      cost: 0,
      error: errorMessage.includes('API key') ? 'API_KEY_INVALID' : 'API_ERROR',
    };
  }
}

// Check if Anthropic is configured
export async function isAnthropicConfigured(): Promise<boolean> {
  const apiKey = await getEffectiveAPIKey('anthropic');
  return !!apiKey;
}
