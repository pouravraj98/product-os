'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { FeatureFilters, defaultFilters } from './useFeatureFilters';
import { Product, CustomerTier } from '@/lib/types';

interface UseFilterPersistenceOptions {
  filters: FeatureFilters;
  setFilters: React.Dispatch<React.SetStateAction<FeatureFilters>>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

interface UseFilterPersistenceResult {
  syncFiltersToUrl: () => void;
  getShareableUrl: () => string;
}

const PARAM_KEYS = {
  search: 'q',
  products: 'products',
  tiers: 'tiers',
  scoreMin: 'scoreMin',
  scoreMax: 'scoreMax',
  scored: 'scored',
  flags: 'flags',
  priority: 'priority',
};

// Priority to score range mapping
const PRIORITY_SCORE_RANGES: Record<string, [number, number]> = {
  high: [8.0, 10.0],
  medium: [5.0, 7.9],
  low: [0, 4.9],
};

/**
 * Hook for syncing filters to/from URL search params
 * Enables shareable filtered views
 */
export function useFilterPersistence({
  filters,
  setFilters,
  searchQuery,
  setSearchQuery,
}: UseFilterPersistenceOptions): UseFilterPersistenceResult {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Parse filters from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());

    // Search query
    const q = params.get(PARAM_KEYS.search);
    if (q) {
      setSearchQuery(q);
    }

    // Products
    const products = params.get(PARAM_KEYS.products);
    const parsedProducts = products
      ? (products.split(',').filter(Boolean) as Product[])
      : [];

    // Tiers
    const tiers = params.get(PARAM_KEYS.tiers);
    const parsedTiers = tiers
      ? (tiers.split(',').filter(Boolean) as CustomerTier[])
      : [];

    // Priority param (takes precedence over scoreMin/scoreMax)
    const priority = params.get(PARAM_KEYS.priority);
    let parsedScoreRange: [number, number];

    if (priority && PRIORITY_SCORE_RANGES[priority]) {
      // Priority param takes precedence
      parsedScoreRange = PRIORITY_SCORE_RANGES[priority];
    } else {
      // Fall back to explicit score range params
      const scoreMin = params.get(PARAM_KEYS.scoreMin);
      const scoreMax = params.get(PARAM_KEYS.scoreMax);
      parsedScoreRange = [
        scoreMin ? parseFloat(scoreMin) : defaultFilters.scoreRange[0],
        scoreMax ? parseFloat(scoreMax) : defaultFilters.scoreRange[1],
      ];
    }

    // Scored filter
    const scored = params.get(PARAM_KEYS.scored);
    const parsedScored = scored === 'true' ? true : scored === 'false' ? false : null;

    // Flags
    const flags = params.get(PARAM_KEYS.flags);
    const parsedFlags = flags ? flags.split(',').filter(Boolean) : [];

    // Only update if there are params to parse
    if (products || tiers || priority || params.get(PARAM_KEYS.scoreMin) || params.get(PARAM_KEYS.scoreMax) || scored || flags) {
      setFilters({
        products: parsedProducts,
        tiers: parsedTiers,
        scoreRange: parsedScoreRange,
        scoredOnly: parsedScored,
        flags: parsedFlags,
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Build URL params from current filters
  const buildUrlParams = useCallback(() => {
    const params = new URLSearchParams();

    // Search query
    if (searchQuery.trim()) {
      params.set(PARAM_KEYS.search, searchQuery.trim());
    }

    // Products
    if (filters.products.length > 0) {
      params.set(PARAM_KEYS.products, filters.products.join(','));
    }

    // Tiers
    if (filters.tiers.length > 0) {
      params.set(PARAM_KEYS.tiers, filters.tiers.join(','));
    }

    // Score range - check if it matches a priority range first
    const matchedPriority = Object.entries(PRIORITY_SCORE_RANGES).find(
      ([, range]) => filters.scoreRange[0] === range[0] && filters.scoreRange[1] === range[1]
    );

    if (matchedPriority) {
      // Use semantic priority param for cleaner URLs
      params.set(PARAM_KEYS.priority, matchedPriority[0]);
    } else {
      // Fall back to explicit score range (only if non-default)
      if (filters.scoreRange[0] !== defaultFilters.scoreRange[0]) {
        params.set(PARAM_KEYS.scoreMin, filters.scoreRange[0].toString());
      }
      if (filters.scoreRange[1] !== defaultFilters.scoreRange[1]) {
        params.set(PARAM_KEYS.scoreMax, filters.scoreRange[1].toString());
      }
    }

    // Scored filter
    if (filters.scoredOnly !== null) {
      params.set(PARAM_KEYS.scored, filters.scoredOnly.toString());
    }

    // Flags
    if (filters.flags.length > 0) {
      params.set(PARAM_KEYS.flags, filters.flags.join(','));
    }

    return params;
  }, [filters, searchQuery]);

  // Sync filters to URL
  const syncFiltersToUrl = useCallback(() => {
    const params = buildUrlParams();
    const paramString = params.toString();
    const newUrl = paramString ? `${pathname}?${paramString}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [buildUrlParams, pathname, router]);

  // Get shareable URL
  const getShareableUrl = useCallback(() => {
    const params = buildUrlParams();
    const paramString = params.toString();
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return paramString ? `${origin}${pathname}?${paramString}` : `${origin}${pathname}`;
  }, [buildUrlParams, pathname]);

  return {
    syncFiltersToUrl,
    getShareableUrl,
  };
}

export default useFilterPersistence;
