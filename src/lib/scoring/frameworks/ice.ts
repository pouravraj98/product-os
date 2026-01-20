import { FeatureRequest, ScoreFactors, TierMultipliers, ScoredFeature } from '@/lib/types';
import { defaultTierMultipliers } from '@/config/products';

export interface ICEScoringResult {
  impact: number;
  confidence: number;
  ease: number;
  baseScore: number;
  multiplier: number;
  finalScore: number;
}

// ICE Formula: Impact × Confidence × Ease
// All factors are on a 1-10 scale
// - Impact: How much will this feature impact key metrics? (1-10)
// - Confidence: How confident are we that this will work? (1-10)
// - Ease: How easy is this to implement? (1-10, where 10 = very easy)

export function calculateICEScore(
  feature: FeatureRequest,
  scores: ScoreFactors,
  customMultipliers?: Partial<TierMultipliers>
): ICEScoringResult {
  const multipliers = { ...defaultTierMultipliers, ...customMultipliers };

  // Get ICE factors (with defaults, all on 1-10 scale)
  const impact = scores.impact ?? 5;
  const confidence = scores.confidence !== undefined
    ? scores.confidence * 10  // Convert 0-1 to 1-10 if using RICE confidence scale
    : 5;
  const ease = scores.ease ?? (scores.effort !== undefined ? 11 - scores.effort : 5); // Inverse of effort

  // Calculate ICE score (normalize to 0-10 range)
  // Raw ICE can range from 1 to 1000, we normalize by dividing by 100
  const rawScore = (impact * confidence * ease) / 100;
  const baseScore = Math.min(Math.round(rawScore * 10) / 10, 10);

  // Apply customer tier multiplier
  const tierMultiplier = multipliers[feature.customerTier] || 1.0;

  return {
    impact,
    confidence,
    ease,
    baseScore,
    multiplier: tierMultiplier,
    finalScore: Math.round(baseScore * tierMultiplier * 100) / 100,
  };
}

// Apply ICE scoring to a feature request
export function applyICEScoring(
  feature: FeatureRequest,
  scores: ScoreFactors,
  manualOverrides?: Partial<ScoreFactors>,
  customMultipliers?: Partial<TierMultipliers>
): Partial<ScoredFeature> {
  const mergedScores = { ...scores, ...manualOverrides };
  const result = calculateICEScore(feature, mergedScores, customMultipliers);

  return {
    scores: mergedScores,
    manualOverrides,
    baseScore: result.baseScore,
    multiplier: result.multiplier,
    finalScore: result.finalScore,
    framework: 'ice',
  };
}

// Get the ICE factors for display
export function getICEFactors(): {
  factor: string;
  key: keyof ScoreFactors;
  description: string;
  scale: string;
}[] {
  return [
    {
      factor: 'Impact',
      key: 'impact',
      description: 'How much will this impact our key metrics?',
      scale: '1-10 (1 = minimal, 10 = transformative)',
    },
    {
      factor: 'Confidence',
      key: 'confidence',
      description: 'How confident are we in success?',
      scale: '1-10 (1 = guess, 10 = certain)',
    },
    {
      factor: 'Ease',
      key: 'ease',
      description: 'How easy is this to implement?',
      scale: '1-10 (1 = very hard, 10 = very easy)',
    },
  ];
}
