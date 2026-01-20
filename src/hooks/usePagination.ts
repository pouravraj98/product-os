'use client';

import { useState, useMemo, useCallback } from 'react';

export interface PaginationState {
  page: number;
  pageSize: number;
}

interface UsePaginationOptions<T> {
  items: T[];
  initialPage?: number;
  initialPageSize?: number;
  resetOnItemsChange?: boolean;
}

interface UsePaginationResult<T> {
  // State
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;

  // Computed
  paginatedItems: T[];
  startIndex: number;
  endIndex: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;

  // Actions
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;
  reset: () => void;

  // Utilities
  getPageRange: (maxVisible?: number) => number[];
}

export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
export type PageSizeOption = typeof PAGE_SIZE_OPTIONS[number];

/**
 * Hook for paginating arrays of items
 */
export function usePagination<T>({
  items,
  initialPage = 1,
  initialPageSize = 25,
  resetOnItemsChange = true,
}: UsePaginationOptions<T>): UsePaginationResult<T> {
  const [page, setPageState] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Ensure page is within bounds
  const boundedPage = Math.min(Math.max(1, page), totalPages);

  // Reset page when items change (e.g., after filtering)
  useMemo(() => {
    if (resetOnItemsChange && page > totalPages) {
      setPageState(1);
    }
  }, [totalItems, totalPages, page, resetOnItemsChange]);

  // Calculate indices
  const startIndex = (boundedPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  // Get paginated items
  const paginatedItems = useMemo(() => {
    return items.slice(startIndex, endIndex);
  }, [items, startIndex, endIndex]);

  // Navigation helpers
  const hasNextPage = boundedPage < totalPages;
  const hasPreviousPage = boundedPage > 1;

  const setPage = useCallback((newPage: number) => {
    const clampedPage = Math.min(Math.max(1, newPage), totalPages);
    setPageState(clampedPage);
  }, [totalPages]);

  const setPageSize = useCallback((newSize: number) => {
    setPageSizeState(newSize);
    // Reset to first page when page size changes
    setPageState(1);
  }, []);

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setPageState((p) => p + 1);
    }
  }, [hasNextPage]);

  const previousPage = useCallback(() => {
    if (hasPreviousPage) {
      setPageState((p) => p - 1);
    }
  }, [hasPreviousPage]);

  const goToFirstPage = useCallback(() => {
    setPageState(1);
  }, []);

  const goToLastPage = useCallback(() => {
    setPageState(totalPages);
  }, [totalPages]);

  const reset = useCallback(() => {
    setPageState(initialPage);
    setPageSizeState(initialPageSize);
  }, [initialPage, initialPageSize]);

  // Generate page range for pagination UI
  const getPageRange = useCallback((maxVisible: number = 5): number[] => {
    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const halfVisible = Math.floor(maxVisible / 2);
    let start = boundedPage - halfVisible;
    let end = boundedPage + halfVisible;

    if (start < 1) {
      start = 1;
      end = maxVisible;
    }

    if (end > totalPages) {
      end = totalPages;
      start = totalPages - maxVisible + 1;
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [boundedPage, totalPages]);

  return {
    page: boundedPage,
    pageSize,
    totalPages,
    totalItems,
    paginatedItems,
    startIndex: startIndex + 1, // 1-indexed for display
    endIndex,
    hasNextPage,
    hasPreviousPage,
    setPage,
    setPageSize,
    nextPage,
    previousPage,
    goToFirstPage,
    goToLastPage,
    reset,
    getPageRange,
  };
}

export default usePagination;
