import {
  FeatureRequest,
  ScoredFeature,
  ScoreFactors,
  ScoringFramework,
  WeightConfig,
  TierMultipliers,
  AIModelResult,
} from '@/lib/types';
import { applyWeightedScoring, getWeightedFactors } from './frameworks/weighted';
import { applyRICEScoring, getRICEFactors } from './frameworks/rice';
import { applyICEScoring, getICEFactors } from './frameworks/ice';
import { applyValueEffortScoring, getValueEffortFactors } from './frameworks/value-effort';
import { applyMoSCoWScoring, getAllMoSCoWCategories } from './frameworks/moscow';
import { StoredAIScore } from '@/lib/ai-score-store';

// Extract scores from AI results
export function extractAIScores(
  aiScore: StoredAIScore | null,
  defaultModel: 'openai' | 'anthropic' = 'anthropic'
): ScoreFactors {
  const scores: ScoreFactors = {};

  if (!aiScore) {
    return scores;
  }

  // Get the primary model result
  const primary = defaultModel === 'anthropic' ? aiScore.anthropic : aiScore.openai;
  const secondary = defaultModel === 'anthropic' ? aiScore.openai : aiScore.anthropic;
  const result = primary || secondary;

  if (!result || !result.suggestions) {
    return scores;
  }

  // Extract scores from AI suggestions
  for (const suggestion of result.suggestions) {
    const factor = suggestion.factor as keyof ScoreFactors;
    if (factor && typeof suggestion.score === 'number') {
      (scores as Record<string, number | undefined>)[factor] = suggestion.score;
    }
  }

  return scores;
}

// Apply scoring with the selected framework
export function applyFrameworkScoring(
  feature: FeatureRequest,
  scores: ScoreFactors,
  framework: ScoringFramework,
  manualOverrides?: Partial<ScoreFactors>,
  customWeights?: Partial<WeightConfig>,
  customMultipliers?: Partial<TierMultipliers>
): Partial<ScoredFeature> {
  switch (framework) {
    case 'weighted':
      return applyWeightedScoring(feature, scores, manualOverrides, customWeights, customMultipliers);
    case 'rice':
      return applyRICEScoring(feature, scores, manualOverrides, customMultipliers);
    case 'ice':
      return applyICEScoring(feature, scores, manualOverrides, customMultipliers);
    case 'value-effort':
      return applyValueEffortScoring(feature, scores, manualOverrides, customMultipliers);
    case 'moscow':
      return applyMoSCoWScoring(feature, scores, manualOverrides, customMultipliers);
    default:
      return applyWeightedScoring(feature, scores, manualOverrides, customWeights, customMultipliers);
  }
}

// Full scoring pipeline: AI scores + framework + overrides
export function scoreFeature(
  feature: FeatureRequest,
  framework: ScoringFramework,
  aiScore: StoredAIScore | null,
  manualOverrides?: Partial<ScoreFactors>,
  customWeights?: Partial<WeightConfig>,
  customMultipliers?: Partial<TierMultipliers>,
  defaultModel: 'openai' | 'anthropic' = 'anthropic'
): ScoredFeature {
  // Check if feature has been scored by AI
  const hasAIScore = aiScore && (aiScore.openai || aiScore.anthropic);

  // Extract AI scores
  const aiScores = extractAIScores(aiScore, defaultModel);

  // Merge with manual overrides (overrides take precedence)
  const scores: ScoreFactors = { ...aiScores, ...manualOverrides };

  // Apply framework-specific scoring
  const frameworkResult = applyFrameworkScoring(
    feature,
    scores,
    framework,
    manualOverrides,
    customWeights,
    customMultipliers
  );

  // Generate flags
  const flags: string[] = [];

  // Not scored flag
  if (!hasAIScore) {
    flags.push('pending-ai-score');
  }

  // High-priority customer flag
  if (feature.customerTier === 'C1' || feature.customerTier === 'C2') {
    flags.push('high-tier-customer');
  }

  // High request volume flag
  if (scores.requestVolume && scores.requestVolume >= 8) {
    flags.push('high-demand');
  }

  // Enterprise feature flag
  if (scores.enterpriseReadiness && scores.enterpriseReadiness >= 8) {
    flags.push('enterprise');
  }

  // Strategic priority flag
  if (scores.strategicAlignment && scores.strategicAlignment >= 8) {
    flags.push('strategic-priority');
  }

  // Add framework-specific flags
  if (frameworkResult.flags) {
    flags.push(...frameworkResult.flags);
  }

  // Map final score to Linear priority
  const finalScore = frameworkResult.finalScore || 0;
  let mappedLinearPriority: 1 | 2 | 3 | 4;
  if (finalScore >= 8) {
    mappedLinearPriority = 1; // Urgent
  } else if (finalScore >= 6) {
    mappedLinearPriority = 2; // High
  } else if (finalScore >= 4) {
    mappedLinearPriority = 3; // Normal
  } else {
    mappedLinearPriority = 4; // Low
  }

  // Build AI suggestions object
  const aiSuggestions: ScoredFeature['aiSuggestions'] = aiScore
    ? {
        openai: aiScore.openai ?? undefined,
        anthropic: aiScore.anthropic ?? undefined,
      }
    : undefined;

  return {
    ...feature,
    scores: frameworkResult.scores || scores,
    manualOverrides,
    aiSuggestions,
    baseScore: frameworkResult.baseScore || 0,
    multiplier: frameworkResult.multiplier || 1,
    finalScore,
    flags,
    mappedLinearPriority,
    framework,
  };
}

// Score multiple features and sort by final score
export function scoreAndSortFeatures(
  features: FeatureRequest[],
  framework: ScoringFramework,
  aiScoresMap: Map<string, StoredAIScore>,
  overridesMap: Map<string, Partial<ScoreFactors>>,
  customWeights?: Partial<WeightConfig>,
  customMultipliers?: Partial<TierMultipliers>,
  defaultModel: 'openai' | 'anthropic' = 'anthropic'
): ScoredFeature[] {
  const scored = features.map(feature =>
    scoreFeature(
      feature,
      framework,
      aiScoresMap.get(feature.id) || null,
      overridesMap.get(feature.id),
      customWeights,
      customMultipliers,
      defaultModel
    )
  );

  // Sort by final score (descending), then by whether it has AI score
  return scored.sort((a, b) => {
    // Features with AI scores come first
    const aHasScore = !a.flags.includes('pending-ai-score');
    const bHasScore = !b.flags.includes('pending-ai-score');
    if (aHasScore !== bHasScore) {
      return aHasScore ? -1 : 1;
    }
    // Then by final score
    return b.finalScore - a.finalScore;
  });
}

// Get framework display info
export function getFrameworkInfo(framework: ScoringFramework): {
  id: ScoringFramework;
  name: string;
  description: string;
  formula: string;
  methodology?: string;
  bestFor?: string;
} {
  const frameworks: Record<ScoringFramework, { name: string; description: string; formula: string; methodology: string; bestFor: string }> = {
    weighted: {
      name: 'Weighted Scoring',
      description: 'Multi-factor analysis with customizable weights for comprehensive prioritization',
      formula: 'Σ(Weight × Score)',
      methodology: 'Evaluates features across multiple dimensions (revenue, enterprise readiness, request volume, competitive parity, strategic alignment, effort), each weighted by importance. Ideal for balanced consideration of business, technical, and strategic factors.',
      bestFor: 'Teams wanting comprehensive, balanced prioritization across multiple factors',
    },
    rice: {
      name: 'RICE',
      description: 'Data-driven framework developed by Intercom',
      formula: '(Reach × Impact × Confidence) / Effort',
      methodology: 'Quantitative framework that produces objective, comparable scores. Reach = users affected, Impact = degree of effect (0.25-3), Confidence = estimate certainty (0-100%), Effort = person-months required.',
      bestFor: 'Teams with good data who want objective, comparable scores',
    },
    ice: {
      name: 'ICE',
      description: 'Simple scoring for rapid decision-making',
      formula: 'Impact × Confidence × Ease',
      methodology: 'Simplified prioritization using three 1-10 factors. Impact = effect on metrics, Confidence = certainty of success, Ease = implementation simplicity (inverse of effort).',
      bestFor: 'Fast-moving teams, early-stage products, quick prioritization sessions',
    },
    'value-effort': {
      name: 'Value vs Effort',
      description: '2×2 matrix prioritization',
      formula: 'Value / Effort → Quadrant',
      methodology: 'Plots features on a 2D matrix. Quick Wins (high value, low effort) → do first. Big Bets (high value, high effort) → plan carefully. Fill-ins (low value, low effort) → nice to have. Time Sinks (low value, high effort) → avoid.',
      bestFor: 'Maximum simplicity, visual prioritization, stakeholder communication',
    },
    moscow: {
      name: 'MoSCoW',
      description: 'Categorical prioritization for releases',
      formula: 'Must / Should / Could / Won\'t',
      methodology: 'Categorizes features into four buckets: Must Have (critical, non-negotiable), Should Have (important but not critical), Could Have (nice to have), Won\'t Have (out of scope this time).',
      bestFor: 'Release planning, scope definition, stakeholder alignment',
    },
  };

  return { id: framework, ...frameworks[framework] };
}

// Get all frameworks
export function getAllFrameworks(): {
  id: ScoringFramework;
  name: string;
  description: string;
  formula: string;
  methodology?: string;
  bestFor?: string;
}[] {
  const frameworks: ScoringFramework[] = ['weighted', 'rice', 'ice', 'value-effort', 'moscow'];
  return frameworks.map(getFrameworkInfo);
}

// Get factors for a specific framework
export function getFrameworkFactors(framework: ScoringFramework, product?: 'chat' | 'calling' | 'ai-agents' | 'byoa') {
  switch (framework) {
    case 'weighted':
      return getWeightedFactors(product || 'chat');
    case 'rice':
      return getRICEFactors();
    case 'ice':
      return getICEFactors();
    case 'value-effort':
      return getValueEffortFactors();
    case 'moscow':
      return getAllMoSCoWCategories();
    default:
      return getWeightedFactors(product || 'chat');
  }
}

// Compare scores across frameworks
export function compareFrameworkScores(
  feature: FeatureRequest,
  aiScore: StoredAIScore | null,
  manualOverrides?: Partial<ScoreFactors>,
  customWeights?: Partial<WeightConfig>,
  customMultipliers?: Partial<TierMultipliers>
): Record<ScoringFramework, { baseScore: number; finalScore: number }> {
  const frameworks: ScoringFramework[] = ['weighted', 'rice', 'ice', 'value-effort', 'moscow'];
  const results: Record<ScoringFramework, { baseScore: number; finalScore: number }> = {} as Record<ScoringFramework, { baseScore: number; finalScore: number }>;

  for (const framework of frameworks) {
    const scored = scoreFeature(feature, framework, aiScore, manualOverrides, customWeights, customMultipliers);
    results[framework] = {
      baseScore: scored.baseScore,
      finalScore: scored.finalScore,
    };
  }

  return results;
}
