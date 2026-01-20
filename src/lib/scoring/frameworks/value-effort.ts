import { FeatureRequest, ScoreFactors, TierMultipliers, ScoredFeature } from '@/lib/types';
import { defaultTierMultipliers } from '@/config/products';

export type ValueEffortQuadrant = 'quick-wins' | 'big-bets' | 'fill-ins' | 'time-sinks';

export interface ValueEffortScoringResult {
  value: number;
  effort: number;
  quadrant: ValueEffortQuadrant;
  baseScore: number;
  multiplier: number;
  finalScore: number;
}

// Value vs Effort 2D Matrix
// - Value: Overall business value of this feature (1-10)
// - Effort: Development effort required (1-10)
//
// Quadrants:
// - Quick Wins: High Value (>5), Low Effort (<=5) → Prioritize
// - Big Bets: High Value (>5), High Effort (>5) → Plan carefully
// - Fill-ins: Low Value (<=5), Low Effort (<=5) → Nice to have
// - Time Sinks: Low Value (<=5), High Effort (>5) → Avoid

export function getQuadrant(value: number, effort: number): ValueEffortQuadrant {
  const isHighValue = value > 5;
  const isHighEffort = effort > 5;

  if (isHighValue && !isHighEffort) return 'quick-wins';
  if (isHighValue && isHighEffort) return 'big-bets';
  if (!isHighValue && !isHighEffort) return 'fill-ins';
  return 'time-sinks';
}

export function getQuadrantLabel(quadrant: ValueEffortQuadrant): string {
  const labels: Record<ValueEffortQuadrant, string> = {
    'quick-wins': 'Quick Wins',
    'big-bets': 'Big Bets',
    'fill-ins': 'Fill-ins',
    'time-sinks': 'Time Sinks',
  };
  return labels[quadrant];
}

export function getQuadrantPriority(quadrant: ValueEffortQuadrant): number {
  // Quick wins = highest priority, time sinks = lowest
  const priorities: Record<ValueEffortQuadrant, number> = {
    'quick-wins': 4,
    'big-bets': 3,
    'fill-ins': 2,
    'time-sinks': 1,
  };
  return priorities[quadrant];
}

export function calculateValueEffortScore(
  feature: FeatureRequest,
  scores: ScoreFactors,
  customMultipliers?: Partial<TierMultipliers>
): ValueEffortScoringResult {
  const multipliers = { ...defaultTierMultipliers, ...customMultipliers };

  // Get value and effort (with defaults)
  const value = scores.value ?? 5;
  const effort = scores.effort ?? 5;

  // Determine quadrant
  const quadrant = getQuadrant(value, effort);

  // Calculate score: value / effort, scaled to 0-10
  // Higher value and lower effort = higher score
  const rawScore = (value / Math.max(effort, 1)) * 2;
  const baseScore = Math.min(Math.round(rawScore * 10) / 10, 10);

  // Apply customer tier multiplier
  const tierMultiplier = multipliers[feature.customerTier] || 1.0;

  return {
    value,
    effort,
    quadrant,
    baseScore,
    multiplier: tierMultiplier,
    finalScore: Math.round(baseScore * tierMultiplier * 100) / 100,
  };
}

// Apply Value vs Effort scoring to a feature request
export function applyValueEffortScoring(
  feature: FeatureRequest,
  scores: ScoreFactors,
  manualOverrides?: Partial<ScoreFactors>,
  customMultipliers?: Partial<TierMultipliers>
): Partial<ScoredFeature> {
  const mergedScores = { ...scores, ...manualOverrides };
  const result = calculateValueEffortScore(feature, mergedScores, customMultipliers);

  return {
    scores: mergedScores,
    manualOverrides,
    baseScore: result.baseScore,
    multiplier: result.multiplier,
    finalScore: result.finalScore,
    framework: 'value-effort',
    flags: [result.quadrant],
  };
}

// Get the Value vs Effort factors for display
export function getValueEffortFactors(): {
  factor: string;
  key: keyof ScoreFactors;
  description: string;
  scale: string;
}[] {
  return [
    {
      factor: 'Value',
      key: 'value',
      description: 'Overall business value of this feature',
      scale: '1-10 (1 = minimal value, 10 = critical value)',
    },
    {
      factor: 'Effort',
      key: 'effort',
      description: 'Development effort required',
      scale: '1-10 (1 = trivial, 10 = major project)',
    },
  ];
}

// Get all quadrants for display
export function getAllQuadrants(): {
  id: ValueEffortQuadrant;
  label: string;
  description: string;
  color: string;
}[] {
  return [
    {
      id: 'quick-wins',
      label: 'Quick Wins',
      description: 'High value, low effort - do these first',
      color: 'green',
    },
    {
      id: 'big-bets',
      label: 'Big Bets',
      description: 'High value, high effort - plan carefully',
      color: 'blue',
    },
    {
      id: 'fill-ins',
      label: 'Fill-ins',
      description: 'Low value, low effort - nice to have',
      color: 'yellow',
    },
    {
      id: 'time-sinks',
      label: 'Time Sinks',
      description: 'Low value, high effort - avoid',
      color: 'red',
    },
  ];
}
