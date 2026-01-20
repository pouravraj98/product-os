import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIScoringSuggestion, AIModelResult, FeatureRequest, ScoreFactors, GeminiModelVersion } from '@/lib/types';
import { getEffectiveAPIKey, getAPIKeyStatus } from '@/lib/api-keys-store';

// Default model to use
const DEFAULT_GEMINI_MODEL: GeminiModelVersion = 'gemini-2.5-flash';

// Cost per token (Gemini has very generous free tier)
const MODEL_COSTS: Record<GeminiModelVersion, { input: number; output: number }> = {
  'gemini-2.5-flash': { input: 0.000000075, output: 0.0000003 },      // $0.075/M input, $0.30/M output
  'gemini-2.5-flash-lite': { input: 0.0000000375, output: 0.00000015 }, // $0.0375/M input, $0.15/M output
  'gemini-2.5-pro': { input: 0.00000125, output: 0.000005 },          // $1.25/M input, $5/M output
};

// API Key Error type for better error handling
export class GeminiKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeminiKeyError';
  }
}

// Initialize Gemini client (async to support stored keys)
async function getGeminiClient(): Promise<GoogleGenerativeAI | null> {
  const apiKey = await getEffectiveAPIKey('gemini');
  if (!apiKey) {
    console.warn('Gemini API key not configured');
    return null;
  }
  return new GoogleGenerativeAI(apiKey);
}

// Get Gemini configuration status
export async function getGeminiConfigStatus(): Promise<{
  configured: boolean;
  source: 'stored' | 'env' | 'none';
}> {
  const status = await getAPIKeyStatus();
  return {
    configured: status.gemini.configured,
    source: status.gemini.source,
  };
}

// Get cost for a specific model
function getModelCost(model: GeminiModelVersion): { input: number; output: number } {
  return MODEL_COSTS[model] || MODEL_COSTS[DEFAULT_GEMINI_MODEL];
}

export interface GeminiScoringResponse {
  suggestions: AIScoringSuggestion[];
  summary: string;
}

// Parse AI response into structured suggestions
function parseAIResponse(content: string): GeminiScoringResponse {
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
    console.error('Failed to parse Gemini response:', content);
    return { suggestions: [], summary: 'Failed to parse response' };
  }
}

// Score a feature using Google Gemini
export async function scoreWithGemini(
  feature: FeatureRequest,
  systemPrompt: string,
  userPrompt: string,
  temperature: number = 0.3,
  modelVersion: GeminiModelVersion = DEFAULT_GEMINI_MODEL
): Promise<AIModelResult | null> {
  const client = await getGeminiClient();
  if (!client) {
    // Return a result with error information instead of null
    return {
      model: 'gemini',
      suggestions: [],
      totalScore: 0,
      summary: 'Gemini API key not configured. Please add your Gemini API key in Settings > API Keys.',
      tokensUsed: 0,
      cost: 0,
      error: 'API_KEY_MISSING',
    };
  }

  try {
    // Use the model version directly
    const model = client.getGenerativeModel({
      model: modelVersion,
      generationConfig: {
        temperature,
        maxOutputTokens: 4096,
      },
    });

    // Combine system and user prompts (Gemini doesn't have separate system prompt in basic API)
    const fullPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}`;

    const result = await model.generateContent(fullPrompt);
    const response = result.response;
    const content = response.text();
    const parsed = parseAIResponse(content);

    // Get token counts from response metadata
    const usageMetadata = response.usageMetadata;
    const inputTokens = usageMetadata?.promptTokenCount || 0;
    const outputTokens = usageMetadata?.candidatesTokenCount || 0;
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
      model: 'gemini',
      suggestions: parsed.suggestions,
      totalScore,
      summary: parsed.summary,
      tokensUsed: totalTokens,
      cost: Math.round(cost * 10000) / 10000,
    };
  } catch (error) {
    console.error('Gemini scoring error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      model: 'gemini',
      suggestions: [],
      totalScore: 0,
      summary: `Gemini API error: ${errorMessage}`,
      tokensUsed: 0,
      cost: 0,
      error: errorMessage.includes('API key') ? 'API_KEY_INVALID' : 'API_ERROR',
    };
  }
}

// Check if Gemini is configured
export async function isGeminiConfigured(): Promise<boolean> {
  const apiKey = await getEffectiveAPIKey('gemini');
  return !!apiKey;
}
