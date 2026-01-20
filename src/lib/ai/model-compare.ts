import { AIModelResult, AIModel, FeatureRequest, FeaturebasePost, ZendeskTicket, ScoringFramework, AIPromptConfig } from '@/lib/types';
import { scoreWithOpenAI, isOpenAIConfigured } from './openai-client';
import { scoreWithAnthropic, isAnthropicConfigured } from './anthropic-client';
import { buildUserPrompt, buildSystemPrompt } from './prompt-builder';

interface Disagreement {
  factor: string;
  openaiScore: number;
  anthropicScore: number;
  difference: number;
}

export interface ModelComparisonResult {
  openai: AIModelResult | null;
  anthropic: AIModelResult | null;
  comparison: {
    agreementScore: number;
    disagreements: Disagreement[];
  } | null;
  totalTokens: number;
  totalCost: number;
}

// Run both models in parallel and compare results
export async function runModelComparison(
  feature: FeatureRequest,
  relatedPosts?: FeaturebasePost[],
  relatedTickets?: ZendeskTicket[],
  framework: ScoringFramework = 'weighted',
  promptConfig?: AIPromptConfig,
  temperature?: number,
  masterSourceContext?: string
): Promise<ModelComparisonResult> {
  const systemPrompt = buildSystemPrompt(framework, feature.product, promptConfig, masterSourceContext);
  const userPrompt = buildUserPrompt(feature, relatedPosts, relatedTickets, undefined, framework);

  // Check which models are configured
  const [openaiConfigured, anthropicConfigured] = await Promise.all([
    isOpenAIConfigured(),
    isAnthropicConfigured(),
  ]);

  // Run both models in parallel
  const [openaiResult, anthropicResult] = await Promise.all([
    openaiConfigured
      ? scoreWithOpenAI(feature, systemPrompt, userPrompt, temperature)
      : Promise.resolve(null),
    anthropicConfigured
      ? scoreWithAnthropic(feature, systemPrompt, userPrompt, temperature)
      : Promise.resolve(null),
  ]);

  // Calculate comparison metrics if both models returned results
  let comparison: ModelComparisonResult['comparison'] = null;

  if (openaiResult && anthropicResult && openaiResult.suggestions.length > 0 && anthropicResult.suggestions.length > 0) {
    const disagreements: Disagreement[] = [];

    // Find matching factors and compare
    for (const openaiSuggestion of openaiResult.suggestions) {
      const anthropicSuggestion = anthropicResult.suggestions.find(
        s => s.factor === openaiSuggestion.factor
      );

      if (anthropicSuggestion) {
        const difference = Math.abs(openaiSuggestion.score - anthropicSuggestion.score);
        if (difference >= 2) {
          // Significant disagreement (2+ points)
          disagreements.push({
            factor: openaiSuggestion.factor,
            openaiScore: openaiSuggestion.score,
            anthropicScore: anthropicSuggestion.score,
            difference,
          });
        }
      }
    }

    // Calculate agreement score (percentage of factors within 1 point)
    const matchingFactors = openaiResult.suggestions.filter(os =>
      anthropicResult.suggestions.some(as => as.factor === os.factor)
    );

    if (matchingFactors.length > 0) {
      const agreements = matchingFactors.filter(os => {
        const as = anthropicResult.suggestions.find(s => s.factor === os.factor);
        return as && Math.abs(os.score - as.score) <= 1;
      });
      const agreementScore = Math.round((agreements.length / matchingFactors.length) * 100);

      comparison = {
        agreementScore,
        disagreements: disagreements.sort((a, b) => b.difference - a.difference),
      };
    }
  }

  const totalTokens = (openaiResult?.tokensUsed || 0) + (anthropicResult?.tokensUsed || 0);
  const totalCost = (openaiResult?.cost || 0) + (anthropicResult?.cost || 0);

  return {
    openai: openaiResult,
    anthropic: anthropicResult,
    comparison,
    totalTokens,
    totalCost,
  };
}

// Run single model
export async function runSingleModel(
  model: 'openai' | 'anthropic',
  feature: FeatureRequest,
  relatedPosts?: FeaturebasePost[],
  relatedTickets?: ZendeskTicket[],
  framework: ScoringFramework = 'weighted',
  promptConfig?: AIPromptConfig,
  temperature?: number,
  masterSourceContext?: string
): Promise<AIModelResult | null> {
  const systemPrompt = buildSystemPrompt(framework, feature.product, promptConfig, masterSourceContext);
  const userPrompt = buildUserPrompt(feature, relatedPosts, relatedTickets, undefined, framework);

  if (model === 'openai') {
    return scoreWithOpenAI(feature, systemPrompt, userPrompt, temperature);
  } else {
    return scoreWithAnthropic(feature, systemPrompt, userPrompt, temperature);
  }
}

// Get available models
export async function getAvailableModels(): Promise<AIModel[]> {
  const models: AIModel[] = [];

  const [openaiConfigured, anthropicConfigured] = await Promise.all([
    isOpenAIConfigured(),
    isAnthropicConfigured(),
  ]);

  if (openaiConfigured) {
    models.push('openai');
  }
  if (anthropicConfigured) {
    models.push('anthropic');
  }
  if (models.length === 2) {
    models.push('both');
  }

  return models;
}

// Merge results from both models (uses default model's scores where available)
export function mergeModelResults(
  openai: AIModelResult | null,
  anthropic: AIModelResult | null,
  defaultModel: 'openai' | 'anthropic' = 'openai'
): AIModelResult | null {
  const primary = defaultModel === 'openai' ? openai : anthropic;
  const secondary = defaultModel === 'openai' ? anthropic : openai;

  if (!primary && !secondary) return null;
  if (!primary) return secondary;
  if (!secondary) return primary;

  // Use primary model's scores, but add secondary model's suggestions for factors not covered
  const mergedSuggestions = [...primary.suggestions];
  const primaryFactors = new Set(primary.suggestions.map(s => s.factor));

  for (const suggestion of secondary.suggestions) {
    if (!primaryFactors.has(suggestion.factor)) {
      mergedSuggestions.push(suggestion);
    }
  }

  return {
    model: defaultModel,
    suggestions: mergedSuggestions,
    totalScore: primary.totalScore,
    summary: primary.summary,
    tokensUsed: primary.tokensUsed + secondary.tokensUsed,
    cost: primary.cost + secondary.cost,
  };
}
