'use client';

import { useMemo } from 'react';
import { ScoredFeature } from '@/lib/types';

interface UseFeatureSearchOptions {
  features: ScoredFeature[];
  searchQuery: string;
}

interface UseFeatureSearchResult {
  filteredFeatures: ScoredFeature[];
  matchCount: number;
}

/**
 * Hook for searching/filtering features by text query
 * Searches: title, identifier, description, labels
 */
export function useFeatureSearch({
  features,
  searchQuery,
}: UseFeatureSearchOptions): UseFeatureSearchResult {
  const filteredFeatures = useMemo(() => {
    if (!searchQuery.trim()) {
      return features;
    }

    const query = searchQuery.toLowerCase().trim();
    const queryTerms = query.split(/\s+/).filter(Boolean);

    return features.filter((feature) => {
      // Create searchable text from various fields
      const searchableText = [
        feature.title,
        feature.identifier,
        feature.description || '',
        ...(feature.labels || []),
        feature.product,
        feature.customerTier,
        ...(feature.flags || []),
      ]
        .join(' ')
        .toLowerCase();

      // All search terms must match (AND logic)
      return queryTerms.every((term) => searchableText.includes(term));
    });
  }, [features, searchQuery]);

  return {
    filteredFeatures,
    matchCount: filteredFeatures.length,
  };
}

export default useFeatureSearch;
