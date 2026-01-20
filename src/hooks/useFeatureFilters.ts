'use client';

import { useState, useMemo, useCallback } from 'react';
import { ScoredFeature, Product, CustomerTier } from '@/lib/types';

export interface FeatureFilters {
  products: Product[];
  tiers: CustomerTier[];
  scoreRange: [number, number];
  scoredOnly: boolean | null; // null = all, true = scored only, false = unscored only
  flags: string[];
}

export const defaultFilters: FeatureFilters = {
  products: [],
  tiers: [],
  scoreRange: [0, 10],
  scoredOnly: null,
  flags: [],
};

interface UseFeatureFiltersOptions {
  features: ScoredFeature[];
  initialFilters?: Partial<FeatureFilters>;
}

interface UseFeatureFiltersResult {
  filters: FeatureFilters;
  setFilters: React.Dispatch<React.SetStateAction<FeatureFilters>>;
  updateFilter: <K extends keyof FeatureFilters>(key: K, value: FeatureFilters[K]) => void;
  resetFilters: () => void;
  filteredFeatures: ScoredFeature[];
  availableFlags: string[];
  hasActiveFilters: boolean;
  activeFilterCount: number;
}

/**
 * Hook for advanced filtering of features
 */
export function useFeatureFilters({
  features,
  initialFilters,
}: UseFeatureFiltersOptions): UseFeatureFiltersResult {
  const [filters, setFilters] = useState<FeatureFilters>({
    ...defaultFilters,
    ...initialFilters,
  });

  // Get all available flags from features
  const availableFlags = useMemo(() => {
    const flagSet = new Set<string>();
    features.forEach((feature) => {
      feature.flags?.forEach((flag) => flagSet.add(flag));
    });
    return Array.from(flagSet).sort();
  }, [features]);

  // Update a single filter
  const updateFilter = useCallback(<K extends keyof FeatureFilters>(
    key: K,
    value: FeatureFilters[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Reset all filters
  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.products.length > 0 ||
      filters.tiers.length > 0 ||
      filters.scoreRange[0] !== 0 ||
      filters.scoreRange[1] !== 10 ||
      filters.scoredOnly !== null ||
      filters.flags.length > 0
    );
  }, [filters]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.products.length > 0) count++;
    if (filters.tiers.length > 0) count++;
    if (filters.scoreRange[0] !== 0 || filters.scoreRange[1] !== 10) count++;
    if (filters.scoredOnly !== null) count++;
    if (filters.flags.length > 0) count++;
    return count;
  }, [filters]);

  // Apply filters
  const filteredFeatures = useMemo(() => {
    return features.filter((feature) => {
      // Product filter
      if (filters.products.length > 0 && !filters.products.includes(feature.product)) {
        return false;
      }

      // Tier filter
      if (filters.tiers.length > 0 && !filters.tiers.includes(feature.customerTier)) {
        return false;
      }

      // Score range filter
      const [minScore, maxScore] = filters.scoreRange;
      if (feature.finalScore < minScore || feature.finalScore > maxScore) {
        return false;
      }

      // Scored/Unscored filter
      if (filters.scoredOnly !== null) {
        const hasAIScore = !!(feature.aiSuggestions?.anthropic || feature.aiSuggestions?.openai);
        const isScored = feature.finalScore > 0 || hasAIScore;
        if (filters.scoredOnly && !isScored) return false;
        if (!filters.scoredOnly && isScored) return false;
      }

      // Flags filter
      if (filters.flags.length > 0) {
        const hasMatchingFlag = filters.flags.some((flag) => feature.flags?.includes(flag));
        if (!hasMatchingFlag) return false;
      }

      return true;
    });
  }, [features, filters]);

  return {
    filters,
    setFilters,
    updateFilter,
    resetFilters,
    filteredFeatures,
    availableFlags,
    hasActiveFilters,
    activeFilterCount,
  };
}

export default useFeatureFilters;
