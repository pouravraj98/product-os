'use client';

import { useState, useEffect, useCallback, use, useMemo } from 'react';
import { ScoredFeature, Product, ScoringFramework } from '@/lib/types';
import Header from '@/components/Header';
import ProductFilter from '@/components/ProductFilter';
import PriorityTable from '@/components/PriorityTable';
import PriorityTableSkeleton from '@/components/PriorityTableSkeleton';
import FeatureCard from '@/components/FeatureCard';
import { FeatureCardSkeletonGrid } from '@/components/FeatureCardSkeleton';
import SearchInput from '@/components/SearchInput';
import FilterPanel from '@/components/FilterPanel';
import { Pagination } from '@/components/ui/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { productConfigs, getProductDisplayName } from '@/config/products';
import { LayoutGrid, List, X } from 'lucide-react';
import { useFeatureSearch } from '@/hooks/useFeatureSearch';
import { useFeatureFilters, defaultFilters } from '@/hooks/useFeatureFilters';
import { usePagination } from '@/hooks/usePagination';
import { useFilterPersistence } from '@/hooks/useFilterPersistence';

interface ProductPageProps {
  params: Promise<{ product: string }>;
}

export default function ProductPage({ params }: ProductPageProps) {
  const resolvedParams = use(params);
  const productId = resolvedParams.product as Product | 'all';
  const isAllProducts = productId === 'all';

  const [features, setFeatures] = useState<ScoredFeature[]>([]);
  const [activeFramework, setActiveFramework] = useState<ScoringFramework>('weighted');
  const [aiModel, setAIModel] = useState<'openai' | 'anthropic' | 'gemini'>('gemini');
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [usage, setUsage] = useState<{ tokens: number; cost: number }>({ tokens: 0, cost: 0 });
  const [productCounts, setProductCounts] = useState<Record<Product | 'all', number>>({
    all: 0,
    chat: 0,
    calling: 0,
    'ai-agents': 0,
    byoa: 0,
  });

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Search hook
  const { filteredFeatures: searchFilteredFeatures } = useFeatureSearch({
    features,
    searchQuery,
  });

  // Filters hook
  const {
    filters,
    setFilters,
    updateFilter,
    resetFilters,
    filteredFeatures: filterAndSearchFilteredFeatures,
    availableFlags,
    hasActiveFilters,
    activeFilterCount,
  } = useFeatureFilters({
    features: searchFilteredFeatures,
  });

  // Pagination hook
  const {
    page,
    pageSize,
    totalPages,
    totalItems,
    paginatedItems,
    startIndex,
    endIndex,
    hasNextPage,
    hasPreviousPage,
    setPage,
    setPageSize,
    getPageRange,
  } = usePagination({
    items: filterAndSearchFilteredFeatures,
    initialPageSize: 25,
  });

  // URL persistence
  const { syncFiltersToUrl, getShareableUrl } = useFilterPersistence({
    filters,
    setFilters,
    searchQuery,
    setSearchQuery,
  });

  // Sync filters to URL when they change
  useEffect(() => {
    if (!isLoading) {
      syncFiltersToUrl();
    }
  }, [filters, searchQuery, isLoading, syncFiltersToUrl]);

  // Reset pagination when search/filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, filters, setPage]);

  const fetchFeatures = useCallback(async (product?: string, framework?: ScoringFramework) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (product && product !== 'all') params.set('product', product);
      if (framework) params.set('framework', framework);

      const response = await fetch(`/api/features?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch features');

      const data = await response.json();

      setFeatures(data.features);
      setLastSynced(data.stats.lastSynced);
      setActiveFramework(data.settings.activeFramework);
      setAIModel(data.settings.aiModel.enabled);
      setProductCounts({
        all: data.stats.totalFeatures,
        ...data.stats.byProduct,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load features');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchUsage = useCallback(async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setUsage(data.todayUsage || { tokens: 0, cost: 0 });
      }
    } catch {
      // Ignore usage fetch errors
    }
  }, []);

  useEffect(() => {
    fetchFeatures(productId);
    fetchUsage();
  }, [productId, fetchFeatures, fetchUsage]);

  const handleFrameworkChange = async (framework: ScoringFramework) => {
    setActiveFramework(framework);
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'setFramework', framework }),
    });
    fetchFeatures(productId, framework);
  };

  const handleSyncFromLinear = async () => {
    try {
      setIsSyncing(true);
      const response = await fetch('/api/sync', { method: 'POST' });
      if (!response.ok) throw new Error('Sync failed');

      const data = await response.json();
      setLastSynced(data.lastSynced);
      await fetchFeatures(productId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePushToLinear = async () => {
    try {
      setIsPushing(true);
      const response = await fetch('/api/linear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: productId, addComments: false }),
      });
      if (!response.ok) throw new Error('Push to Linear failed');

      const data = await response.json();
      alert(`Synced ${data.syncedCount} features to Linear`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Push failed');
    } finally {
      setIsPushing(false);
    }
  };

  const handleProductChange = (product: Product | 'all') => {
    // Preserve current search params when switching products
    const params = new URLSearchParams(window.location.search);
    const queryString = params.toString();
    const basePath = `/products/${product}`;
    window.location.href = queryString ? `${basePath}?${queryString}` : basePath;
  };

  const handleShare = () => {
    const url = getShareableUrl();
    navigator.clipboard.writeText(url);
    // Could add a toast notification here
    alert('URL copied to clipboard!');
  };

  const handleClearAll = () => {
    setSearchQuery('');
    resetFilters();
  };

  const productConfig = isAllProducts ? null : productConfigs.find(p => p.id === productId);

  // Calculate active filter + search count
  const totalActiveCount = activeFilterCount + (searchQuery ? 1 : 0);

  return (
    <div className="min-h-screen">
      <Header
        activeFramework={activeFramework}
        onFrameworkChange={handleFrameworkChange}
        lastSynced={lastSynced}
        isSyncing={isSyncing}
        onSyncFromLinear={handleSyncFromLinear}
        onPushToLinear={handlePushToLinear}
        isPushing={isPushing}
        aiModel={aiModel}
        usage={usage}
      />

      <main className="container mx-auto px-4 py-8">
        {/* Product Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">
              {isAllProducts ? 'All Features' : (productConfig?.name || getProductDisplayName(productId))}
            </h1>
            <p className="text-muted-foreground">
              {totalItems} of {features.length} features
              {searchQuery || hasActiveFilters ? ' (filtered)' : ' in Product Icebox'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'table' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('table')}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Product Filter */}
        <div className="mb-6">
          <ProductFilter
            selectedProduct={productId}
            onSelect={handleProductChange}
            counts={productCounts}
          />
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by title, identifier, description, labels..."
              className="flex-1 max-w-md"
            />
            <FilterPanel
              filters={filters}
              onFilterChange={updateFilter}
              onReset={resetFilters}
              availableFlags={availableFlags}
              activeFilterCount={activeFilterCount}
              onShare={handleShare}
            />
          </div>

          {/* Active filters display */}
          {totalActiveCount > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Active:</span>
              {searchQuery && (
                <Badge variant="secondary" className="gap-1">
                  Search: &quot;{searchQuery.length > 20 ? searchQuery.slice(0, 20) + '...' : searchQuery}&quot;
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => setSearchQuery('')}
                  />
                </Badge>
              )}
              {filters.products.length > 0 && (
                <Badge variant="secondary" className="gap-1">
                  {filters.products.length} product{filters.products.length > 1 ? 's' : ''}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => updateFilter('products', [])}
                  />
                </Badge>
              )}
              {filters.tiers.length > 0 && (
                <Badge variant="secondary" className="gap-1">
                  {filters.tiers.length} tier{filters.tiers.length > 1 ? 's' : ''}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => updateFilter('tiers', [])}
                  />
                </Badge>
              )}
              {(filters.scoreRange[0] !== 0 || filters.scoreRange[1] !== 10) && (
                <Badge variant="secondary" className="gap-1">
                  Score: {filters.scoreRange[0]}-{filters.scoreRange[1]}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => updateFilter('scoreRange', [0, 10])}
                  />
                </Badge>
              )}
              {filters.scoredOnly !== null && (
                <Badge variant="secondary" className="gap-1">
                  {filters.scoredOnly ? 'Scored only' : 'Unscored only'}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => updateFilter('scoredOnly', null)}
                  />
                </Badge>
              )}
              {filters.flags.length > 0 && (
                <Badge variant="secondary" className="gap-1">
                  {filters.flags.length} flag{filters.flags.length > 1 ? 's' : ''}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => updateFilter('flags', [])}
                  />
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="h-6 px-2 text-xs"
              >
                Clear all
              </Button>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg">
            {error}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          viewMode === 'table' ? (
            <PriorityTableSkeleton rows={10} showProduct={isAllProducts} />
          ) : (
            <FeatureCardSkeletonGrid count={9} showProduct={isAllProducts} />
          )
        )}

        {/* Features Display */}
        {!isLoading && paginatedItems.length > 0 && (
          <div className="space-y-6">
            {viewMode === 'table' ? (
              <PriorityTable features={paginatedItems} showProduct={isAllProducts} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedItems.map((feature, index) => (
                  <FeatureCard
                    key={feature.id}
                    feature={feature}
                    rank={startIndex + index}
                    showProduct={isAllProducts}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination
                page={page}
                pageSize={pageSize}
                totalPages={totalPages}
                totalItems={totalItems}
                startIndex={startIndex}
                endIndex={endIndex}
                hasNextPage={hasNextPage}
                hasPreviousPage={hasPreviousPage}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                getPageRange={getPageRange}
                className="border-t pt-6"
              />
            )}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filterAndSearchFilteredFeatures.length === 0 && (
          <div className="text-center py-12">
            {features.length === 0 ? (
              <>
                <p className="text-muted-foreground">No features found for this product.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Check that the Product Icebox project exists in Linear.
                </p>
              </>
            ) : (
              <>
                <p className="text-muted-foreground">No features match your search or filters.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearAll}
                  className="mt-4"
                >
                  Clear all filters
                </Button>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
