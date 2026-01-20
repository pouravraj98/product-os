import { FeatureRequest, ScoreFactors, TierMultipliers, ScoredFeature } from '@/lib/types';
import { defaultTierMultipliers } from '@/config/products';

export interface RICEScoringResult {
  reach: number;
  impact: number;
  confidence: number;
  effort: number;
  baseScore: number;
  multiplier: number;
  finalScore: number;
}

// RICE Formula: (Reach × Impact × Confidence) / Effort
// - Reach: How many customers will this affect? (scale 1-10, where 10 = 100% of users)
// - Impact: How much will it impact each customer? (scale: 0.25 = minimal, 0.5 = low, 1 = medium, 2 = high, 3 = massive)
// - Confidence: How confident are we in our estimates? (100%, 80%, 50%)
// - Effort: Person-months of work (1-10, where 1 = few days, 10 = several months)

export function calculateRICEScore(
  feature: FeatureRequest,
  scores: ScoreFactors,
  customMultipliers?: Partial<TierMultipliers>
): RICEScoringResult {
  const multipliers = { ...defaultTierMultipliers, ...customMultipliers };

  // Get RICE factors (with defaults)
  const reach = scores.reach ?? 5;
  const impact = scores.impact ?? 1;
  const confidence = scores.confidence ?? 0.8;
  const effort = Math.max(scores.effort ?? 5, 1); // Prevent division by zero

  // Calculate base RICE score
  // Normalize: Reach is 1-10, Impact is 0.25-3, Confidence is 0-1
  // We scale to get a 0-10 range result
  const rawScore = (reach * impact * confidence) / effort;
  const baseScore = Math.min(Math.round(rawScore * 10) / 10, 10);

  // Apply customer tier multiplier
  const tierMultiplier = multipliers[feature.customerTier] || 1.0;

  return {
    reach,
    impact,
    confidence,
    effort,
    baseScore,
    multiplier: tierMultiplier,
    finalScore: Math.round(baseScore * tierMultiplier * 100) / 100,
  };
}

// Apply RICE scoring to a feature request
export function applyRICEScoring(
  feature: FeatureRequest,
  scores: ScoreFactors,
  manualOverrides?: Partial<ScoreFactors>,
  customMultipliers?: Partial<TierMultipliers>
): Partial<ScoredFeature> {
  const mergedScores = { ...scores, ...manualOverrides };
  const result = calculateRICEScore(feature, mergedScores, customMultipliers);

  return {
    scores: mergedScores,
    manualOverrides,
    baseScore: result.baseScore,
    multiplier: result.multiplier,
    finalScore: result.finalScore,
    framework: 'rice',
  };
}

// Get the RICE factors for display
export function getRICEFactors(): {
  factor: string;
  key: keyof ScoreFactors;
  description: string;
  scale: string;
}[] {
  return [
    {
      factor: 'Reach',
      key: 'reach',
      description: 'How many customers will this affect per quarter?',
      scale: '1-10 (1 = few, 10 = all users)',
    },
    {
      factor: 'Impact',
      key: 'impact',
      description: 'How much will it impact each customer?',
      scale: '0.25 = minimal, 0.5 = low, 1 = medium, 2 = high, 3 = massive',
    },
    {
      factor: 'Confidence',
      key: 'confidence',
      description: 'How confident are we in our estimates?',
      scale: '0.5 = low, 0.8 = medium, 1.0 = high',
    },
    {
      factor: 'Effort',
      key: 'effort',
      description: 'Engineering effort in person-months',
      scale: '1-10 (1 = days, 10 = months)',
    },
  ];
}

// Convert impact description to number
export function getImpactValue(impact: 'minimal' | 'low' | 'medium' | 'high' | 'massive'): number {
  const impactMap = {
    minimal: 0.25,
    low: 0.5,
    medium: 1,
    high: 2,
    massive: 3,
  };
  return impactMap[impact];
}

// Convert confidence description to number
export function getConfidenceValue(confidence: 'low' | 'medium' | 'high'): number {
  const confidenceMap = {
    low: 0.5,
    medium: 0.8,
    high: 1.0,
  };
  return confidenceMap[confidence];
}
