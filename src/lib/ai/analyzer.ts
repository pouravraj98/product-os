import { FeatureRequest, FeaturebasePost, ZendeskTicket, AIModel, ScoredFeature, Settings, AIModelResult, AIPromptConfig } from '@/lib/types';
import { runModelComparison, runSingleModel, getAvailableModels, ModelComparisonResult } from './model-compare';
import { getRelatedFeaturebasePosts, getRelatedZendeskTickets } from '@/lib/correlator';
import { scoreFeature } from '@/lib/scoring/engine';

export interface AnalysisResult {
  feature: ScoredFeature;
  aiResults: {
    openai: AIModelResult | null;
    anthropic: AIModelResult | null;
  };
  comparison: ModelComparisonResult['comparison'];
  tokensUsed: number;
  cost: number;
}

// Analyze a single feature with AI scoring
export async function analyzeFeature(
  feature: FeatureRequest,
  featurebasePosts: FeaturebasePost[],
  zendeskTickets: ZendeskTicket[],
  settings: Settings,
  customPromptConfig?: AIPromptConfig
): Promise<AnalysisResult> {
  // Get related data for context
  const relatedPosts = getRelatedFeaturebasePosts(
    { ...feature, description: feature.description || '' },
    featurebasePosts
  );
  const relatedTickets = getRelatedZendeskTickets(
    { ...feature, description: feature.description || '' },
    zendeskTickets
  );

  let aiResults: AnalysisResult['aiResults'] = {
    openai: null,
    anthropic: null,
  };
  let comparison: ModelComparisonResult['comparison'] = null;
  let tokensUsed = 0;
  let cost = 0;

  // Use custom prompt config or settings prompt config
  const promptConfig = customPromptConfig || settings.promptConfig;

  // Run AI analysis based on settings
  if (settings.aiModel.enabled !== 'both') {
    // Single model
    const model = settings.aiModel.enabled as 'openai' | 'anthropic';
    const result = await runSingleModel(
      model,
      feature,
      relatedPosts,
      relatedTickets,
      settings.activeFramework,
      promptConfig,
      settings.aiModel.temperature
    );

    if (result) {
      aiResults[model] = result;
      tokensUsed = result.tokensUsed;
      cost = result.cost;
    }
  } else {
    // Both models
    const comparisonResult = await runModelComparison(
      feature,
      relatedPosts,
      relatedTickets,
      settings.activeFramework,
      promptConfig,
      settings.aiModel.temperature
    );

    aiResults = {
      openai: comparisonResult.openai,
      anthropic: comparisonResult.anthropic,
    };
    comparison = comparisonResult.comparison;
    tokensUsed = comparisonResult.totalTokens;
    cost = comparisonResult.totalCost;
  }

  // Score the feature with AI suggestions (create a temporary AI score structure)
  const tempAIScore = aiResults.openai || aiResults.anthropic ? {
    featureId: feature.id,
    openai: aiResults.openai || null,
    anthropic: aiResults.anthropic || null,
    scoredAt: new Date().toISOString(),
    settingsHash: '',
    framework: settings.activeFramework,
    modelUsed: settings.aiModel.enabled as 'openai' | 'anthropic' | 'both',
  } : null;

  const scoredFeature = scoreFeature(
    feature,
    settings.activeFramework,
    tempAIScore,
    undefined, // No manual overrides during initial analysis
    settings.weights[feature.product === 'chat' || feature.product === 'calling' ? 'mature' : 'new'],
    settings.tierMultipliers,
    settings.aiModel.defaultModel
  );

  return {
    feature: scoredFeature,
    aiResults,
    comparison,
    tokensUsed,
    cost,
  };
}

// Analyze multiple features (batch)
export async function analyzeFeatures(
  features: FeatureRequest[],
  featurebasePosts: FeaturebasePost[],
  zendeskTickets: ZendeskTicket[],
  settings: Settings,
  onProgress?: (completed: number, total: number) => void
): Promise<AnalysisResult[]> {
  const results: AnalysisResult[] = [];

  // Process features sequentially to avoid rate limits
  for (let i = 0; i < features.length; i++) {
    const result = await analyzeFeature(
      features[i],
      featurebasePosts,
      zendeskTickets,
      settings
    );
    results.push(result);

    if (onProgress) {
      onProgress(i + 1, features.length);
    }

    // Small delay between requests to avoid rate limits
    if (i < features.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return results;
}

// Get AI configuration status
export async function getAIStatus(): Promise<{
  openai: boolean;
  anthropic: boolean;
  available: AIModel[];
}> {
  const available = await getAvailableModels();

  return {
    openai: available.includes('openai'),
    anthropic: available.includes('anthropic'),
    available,
  };
}

// Estimate cost for analyzing features
export function estimateAnalysisCost(
  featureCount: number,
  model: AIModel
): { minCost: number; maxCost: number; tokenEstimate: number } {
  // Rough estimates based on typical prompts
  const avgTokensPerFeature = 2000;
  const tokenEstimate = featureCount * avgTokensPerFeature;

  // GPT-4: ~$0.03/1K input, $0.06/1K output
  // Claude: ~$0.015/1K input, $0.075/1K output
  const costPerToken = {
    openai: 0.00004, // blended average
    anthropic: 0.00004, // blended average
    both: 0.00008, // both models
  };

  const estimatedCost = tokenEstimate * costPerToken[model];

  return {
    minCost: Math.round(estimatedCost * 0.7 * 100) / 100,
    maxCost: Math.round(estimatedCost * 1.3 * 100) / 100,
    tokenEstimate,
  };
}
