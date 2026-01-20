import { FeatureRequest, ScoreFactors, MoSCoWCategory, TierMultipliers, ScoredFeature } from '@/lib/types';
import { defaultTierMultipliers } from '@/config/products';

export interface MoSCoWScoringResult {
  category: MoSCoWCategory;
  baseScore: number;
  multiplier: number;
  finalScore: number;
}

// MoSCoW Categories:
// - Must: Critical requirements - the solution will fail without these
// - Should: Important but not vital - could be painful to leave out
// - Could: Nice to have - would be good but not essential
// - Won't: Not a priority for this timeframe - but may be revisited

const categoryScores: Record<MoSCoWCategory, number> = {
  must: 10,
  should: 7,
  could: 4,
  wont: 1,
};

export function getCategoryLabel(category: MoSCoWCategory): string {
  const labels: Record<MoSCoWCategory, string> = {
    must: 'Must Have',
    should: 'Should Have',
    could: 'Could Have',
    wont: "Won't Have",
  };
  return labels[category];
}

export function getCategoryDescription(category: MoSCoWCategory): string {
  const descriptions: Record<MoSCoWCategory, string> = {
    must: 'Critical - the solution will fail without this',
    should: 'Important but not vital - painful to leave out',
    could: 'Nice to have - desirable but not essential',
    wont: 'Not a priority for this timeframe',
  };
  return descriptions[category];
}

export function getCategoryColor(category: MoSCoWCategory): string {
  const colors: Record<MoSCoWCategory, string> = {
    must: 'red',
    should: 'orange',
    could: 'blue',
    wont: 'gray',
  };
  return colors[category];
}

// Infer MoSCoW category from other scores if not explicitly set
export function inferMoSCoWCategory(scores: ScoreFactors): MoSCoWCategory {
  if (scores.moscow) return scores.moscow;

  // Calculate an aggregate score from available factors
  const factors: number[] = [];

  if (scores.revenueImpact !== undefined) factors.push(scores.revenueImpact);
  if (scores.enterpriseReadiness !== undefined) factors.push(scores.enterpriseReadiness);
  if (scores.strategicAlignment !== undefined) factors.push(scores.strategicAlignment);
  if (scores.capabilityGap !== undefined) factors.push(scores.capabilityGap);
  if (scores.value !== undefined) factors.push(scores.value);
  if (scores.impact !== undefined) {
    // Impact might be on different scales depending on framework
    const normalizedImpact = scores.impact <= 3 ? scores.impact * 3.33 : scores.impact;
    factors.push(normalizedImpact);
  }

  if (factors.length === 0) return 'could'; // Default

  const avgScore = factors.reduce((a, b) => a + b, 0) / factors.length;

  if (avgScore >= 8) return 'must';
  if (avgScore >= 6) return 'should';
  if (avgScore >= 4) return 'could';
  return 'wont';
}

export function calculateMoSCoWScore(
  feature: FeatureRequest,
  scores: ScoreFactors,
  customMultipliers?: Partial<TierMultipliers>
): MoSCoWScoringResult {
  const multipliers = { ...defaultTierMultipliers, ...customMultipliers };

  // Get or infer category
  const category = inferMoSCoWCategory(scores);
  const baseScore = categoryScores[category];

  // Apply customer tier multiplier
  const tierMultiplier = multipliers[feature.customerTier] || 1.0;

  return {
    category,
    baseScore,
    multiplier: tierMultiplier,
    finalScore: Math.round(baseScore * tierMultiplier * 100) / 100,
  };
}

// Apply MoSCoW scoring to a feature request
export function applyMoSCoWScoring(
  feature: FeatureRequest,
  scores: ScoreFactors,
  manualOverrides?: Partial<ScoreFactors>,
  customMultipliers?: Partial<TierMultipliers>
): Partial<ScoredFeature> {
  const mergedScores = { ...scores, ...manualOverrides };
  const result = calculateMoSCoWScore(feature, mergedScores, customMultipliers);

  return {
    scores: mergedScores,
    manualOverrides,
    baseScore: result.baseScore,
    multiplier: result.multiplier,
    finalScore: result.finalScore,
    framework: 'moscow',
    flags: [result.category],
  };
}

// Get all categories for display
export function getAllMoSCoWCategories(): {
  id: MoSCoWCategory;
  label: string;
  description: string;
  color: string;
  score: number;
}[] {
  return [
    {
      id: 'must',
      label: 'Must Have',
      description: 'Critical - the solution will fail without this',
      color: 'red',
      score: 10,
    },
    {
      id: 'should',
      label: 'Should Have',
      description: 'Important but not vital - painful to leave out',
      color: 'orange',
      score: 7,
    },
    {
      id: 'could',
      label: 'Could Have',
      description: 'Nice to have - desirable but not essential',
      color: 'blue',
      score: 4,
    },
    {
      id: 'wont',
      label: "Won't Have",
      description: 'Not a priority for this timeframe',
      color: 'gray',
      score: 1,
    },
  ];
}
