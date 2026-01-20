import { FeatureRequest, ScoreFactors, WeightConfig, TierMultipliers, ScoredFeature } from '@/lib/types';
import { getProductWeights, defaultTierMultipliers } from '@/config/products';

export interface WeightedScoringResult {
  baseScore: number;
  multiplier: number;
  finalScore: number;
  breakdown: {
    factor: string;
    weight: number;
    score: number;
    contribution: number;
  }[];
}

// Calculate weighted score for a feature
export function calculateWeightedScore(
  feature: FeatureRequest,
  scores: ScoreFactors,
  customWeights?: Partial<WeightConfig>,
  customMultipliers?: Partial<TierMultipliers>
): WeightedScoringResult {
  // Get base weights for this product
  const productWeights = getProductWeights(feature.product);
  const weights = { ...productWeights, ...customWeights };
  const multipliers = { ...defaultTierMultipliers, ...customMultipliers };

  // Calculate weighted sum
  const breakdown: WeightedScoringResult['breakdown'] = [];
  let baseScore = 0;

  // Check which weights apply based on product type (mature vs new)
  const isMatureProduct = feature.product === 'chat' || feature.product === 'calling';

  if (isMatureProduct) {
    // Mature product factors
    if (weights.revenueImpact > 0 && scores.revenueImpact !== undefined) {
      const contribution = weights.revenueImpact * scores.revenueImpact;
      breakdown.push({
        factor: 'Revenue Impact',
        weight: weights.revenueImpact,
        score: scores.revenueImpact,
        contribution,
      });
      baseScore += contribution;
    }

    if (weights.enterpriseReadiness > 0 && scores.enterpriseReadiness !== undefined) {
      const contribution = weights.enterpriseReadiness * scores.enterpriseReadiness;
      breakdown.push({
        factor: 'Enterprise Readiness',
        weight: weights.enterpriseReadiness,
        score: scores.enterpriseReadiness,
        contribution,
      });
      baseScore += contribution;
    }

    if (weights.requestVolume > 0 && scores.requestVolume !== undefined) {
      const contribution = weights.requestVolume * scores.requestVolume;
      breakdown.push({
        factor: 'Request Volume',
        weight: weights.requestVolume,
        score: scores.requestVolume,
        contribution,
      });
      baseScore += contribution;
    }

    if (weights.competitiveParity > 0 && scores.competitiveParity !== undefined) {
      const contribution = weights.competitiveParity * scores.competitiveParity;
      breakdown.push({
        factor: 'Competitive Parity',
        weight: weights.competitiveParity,
        score: scores.competitiveParity,
        contribution,
      });
      baseScore += contribution;
    }

    if (weights.strategicAlignment > 0 && scores.strategicAlignment !== undefined) {
      const contribution = weights.strategicAlignment * scores.strategicAlignment;
      breakdown.push({
        factor: 'Strategic Alignment',
        weight: weights.strategicAlignment,
        score: scores.strategicAlignment,
        contribution,
      });
      baseScore += contribution;
    }

    // Effort is inverse (lower effort = higher score contribution)
    if (weights.effort > 0 && scores.effort !== undefined) {
      const effortScore = 10 - scores.effort; // Inverse: high effort = low contribution
      const contribution = weights.effort * effortScore;
      breakdown.push({
        factor: 'Effort (inverse)',
        weight: weights.effort,
        score: effortScore,
        contribution,
      });
      baseScore += contribution;
    }
  } else {
    // New product factors (AI Agents, BYOA)
    if (weights.capabilityGap > 0 && scores.capabilityGap !== undefined) {
      const contribution = weights.capabilityGap * scores.capabilityGap;
      breakdown.push({
        factor: 'Capability Gap Filled',
        weight: weights.capabilityGap,
        score: scores.capabilityGap,
        contribution,
      });
      baseScore += contribution;
    }

    if (weights.strategicAlignment > 0 && scores.strategicAlignment !== undefined) {
      const contribution = weights.strategicAlignment * scores.strategicAlignment;
      breakdown.push({
        factor: 'Strategic Alignment',
        weight: weights.strategicAlignment,
        score: scores.strategicAlignment,
        contribution,
      });
      baseScore += contribution;
    }

    if (weights.competitiveDifferentiation > 0 && scores.competitiveDifferentiation !== undefined) {
      const contribution = weights.competitiveDifferentiation * scores.competitiveDifferentiation;
      breakdown.push({
        factor: 'Competitive Differentiation',
        weight: weights.competitiveDifferentiation,
        score: scores.competitiveDifferentiation,
        contribution,
      });
      baseScore += contribution;
    }

    if (weights.requestVolume > 0 && scores.requestVolume !== undefined) {
      const contribution = weights.requestVolume * scores.requestVolume;
      breakdown.push({
        factor: 'Request Volume',
        weight: weights.requestVolume,
        score: scores.requestVolume,
        contribution,
      });
      baseScore += contribution;
    }

    if (weights.effort > 0 && scores.effort !== undefined) {
      const effortScore = 10 - scores.effort;
      const contribution = weights.effort * effortScore;
      breakdown.push({
        factor: 'Effort (inverse)',
        weight: weights.effort,
        score: effortScore,
        contribution,
      });
      baseScore += contribution;
    }
  }

  // Apply customer tier multiplier
  const tierMultiplier = multipliers[feature.customerTier] || 1.0;

  return {
    baseScore: Math.round(baseScore * 100) / 100,
    multiplier: tierMultiplier,
    finalScore: Math.round(baseScore * tierMultiplier * 100) / 100,
    breakdown,
  };
}

// Apply weighted scoring to a feature request
export function applyWeightedScoring(
  feature: FeatureRequest,
  scores: ScoreFactors,
  manualOverrides?: Partial<ScoreFactors>,
  customWeights?: Partial<WeightConfig>,
  customMultipliers?: Partial<TierMultipliers>
): Partial<ScoredFeature> {
  const mergedScores = { ...scores, ...manualOverrides };
  const result = calculateWeightedScore(feature, mergedScores, customWeights, customMultipliers);

  return {
    scores: mergedScores,
    manualOverrides,
    baseScore: result.baseScore,
    multiplier: result.multiplier,
    finalScore: result.finalScore,
    framework: 'weighted',
  };
}

// Get the factor weights for display
export function getWeightedFactors(product: 'chat' | 'calling' | 'ai-agents' | 'byoa'): {
  factor: string;
  key: keyof ScoreFactors;
  weight: number;
  description: string;
}[] {
  const isMature = product === 'chat' || product === 'calling';

  if (isMature) {
    return [
      { factor: 'Revenue Impact', key: 'revenueImpact', weight: 0.30, description: 'Potential revenue from this feature' },
      { factor: 'Enterprise Readiness', key: 'enterpriseReadiness', weight: 0.20, description: 'How much this enables enterprise sales' },
      { factor: 'Request Volume', key: 'requestVolume', weight: 0.15, description: 'Number of customer requests for this' },
      { factor: 'Competitive Parity', key: 'competitiveParity', weight: 0.15, description: 'Do competitors have this?' },
      { factor: 'Strategic Alignment', key: 'strategicAlignment', weight: 0.10, description: 'Alignment with company strategy' },
      { factor: 'Effort (inverse)', key: 'effort', weight: 0.10, description: 'Development effort required' },
    ];
  }

  return [
    { factor: 'Capability Gap Filled', key: 'capabilityGap', weight: 0.30, description: 'How much this fills a product capability gap' },
    { factor: 'Strategic Alignment', key: 'strategicAlignment', weight: 0.25, description: 'Alignment with company strategy' },
    { factor: 'Competitive Differentiation', key: 'competitiveDifferentiation', weight: 0.15, description: 'How much this differentiates from competitors' },
    { factor: 'Request Volume', key: 'requestVolume', weight: 0.15, description: 'Number of customer requests for this' },
    { factor: 'Effort (inverse)', key: 'effort', weight: 0.15, description: 'Development effort required' },
  ];
}
