'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { FeatureFilters, defaultFilters } from '@/hooks/useFeatureFilters';
import { Product, CustomerTier } from '@/lib/types';
import { productConfigs } from '@/config/products';
import {
  Filter,
  X,
  RotateCcw,
  Share2,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterPanelProps {
  filters: FeatureFilters;
  onFilterChange: <K extends keyof FeatureFilters>(key: K, value: FeatureFilters[K]) => void;
  onReset: () => void;
  availableFlags: string[];
  activeFilterCount: number;
  onShare?: () => void;
  className?: string;
}

const CUSTOMER_TIERS: CustomerTier[] = ['C1', 'C2', 'C3', 'C4', 'C5'];

export function FilterPanel({
  filters,
  onFilterChange,
  onReset,
  availableFlags,
  activeFilterCount,
  onShare,
  className,
}: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleProduct = (product: Product) => {
    const newProducts = filters.products.includes(product)
      ? filters.products.filter((p) => p !== product)
      : [...filters.products, product];
    onFilterChange('products', newProducts);
  };

  const toggleTier = (tier: CustomerTier) => {
    const newTiers = filters.tiers.includes(tier)
      ? filters.tiers.filter((t) => t !== tier)
      : [...filters.tiers, tier];
    onFilterChange('tiers', newTiers);
  };

  const toggleFlag = (flag: string) => {
    const newFlags = filters.flags.includes(flag)
      ? filters.flags.filter((f) => f !== flag)
      : [...filters.flags, flag];
    onFilterChange('flags', newFlags);
  };

  const handleScoreRangeChange = (values: number[]) => {
    onFilterChange('scoreRange', [values[0], values[1]]);
  };

  const handleScoredOnlyChange = (value: boolean | null) => {
    onFilterChange('scoredOnly', value);
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 justify-center">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filter Features
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto">
            {/* Products */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Products</Label>
              <div className="flex flex-wrap gap-2">
                {productConfigs.map((product) => (
                  <Badge
                    key={product.id}
                    variant={filters.products.includes(product.id) ? 'default' : 'outline'}
                    className={cn(
                      'cursor-pointer transition-colors',
                      filters.products.includes(product.id)
                        ? 'hover:bg-primary/80'
                        : 'hover:bg-accent'
                    )}
                    onClick={() => toggleProduct(product.id)}
                  >
                    {product.name}
                    {filters.products.includes(product.id) && (
                      <X className="w-3 h-3 ml-1" />
                    )}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Customer Tiers */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Customer Tiers</Label>
              <div className="flex flex-wrap gap-2">
                {CUSTOMER_TIERS.map((tier) => {
                  const tierVariant = `tier${tier}` as const;
                  return (
                    <Badge
                      key={tier}
                      variant={filters.tiers.includes(tier) ? tierVariant : 'outline'}
                      className={cn(
                        'cursor-pointer transition-colors',
                        !filters.tiers.includes(tier) && 'hover:bg-accent'
                      )}
                      onClick={() => toggleTier(tier)}
                    >
                      {tier}
                      {filters.tiers.includes(tier) && (
                        <X className="w-3 h-3 ml-1" />
                      )}
                    </Badge>
                  );
                })}
              </div>
            </div>

            {/* Score Range */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Score Range</Label>
                <span className="text-sm text-muted-foreground font-mono">
                  {filters.scoreRange[0].toFixed(1)} - {filters.scoreRange[1].toFixed(1)}
                </span>
              </div>
              <Slider
                value={filters.scoreRange}
                onValueChange={handleScoreRangeChange}
                min={0}
                max={10}
                step={0.5}
                className="w-full"
              />
            </div>

            {/* Scored/Unscored Filter */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Score Status</Label>
              <div className="flex gap-2">
                <Badge
                  variant={filters.scoredOnly === null ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => handleScoredOnlyChange(null)}
                >
                  All
                </Badge>
                <Badge
                  variant={filters.scoredOnly === true ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => handleScoredOnlyChange(true)}
                >
                  Scored Only
                </Badge>
                <Badge
                  variant={filters.scoredOnly === false ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => handleScoredOnlyChange(false)}
                >
                  Unscored Only
                </Badge>
              </div>
            </div>

            {/* Flags */}
            {availableFlags.length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Flags</Label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {availableFlags.map((flag) => (
                    <Badge
                      key={flag}
                      variant={filters.flags.includes(flag) ? 'secondary' : 'outline'}
                      className={cn(
                        'cursor-pointer transition-colors text-xs',
                        filters.flags.includes(flag)
                          ? 'hover:bg-secondary/80'
                          : 'hover:bg-accent'
                      )}
                      onClick={() => toggleFlag(flag)}
                    >
                      {flag}
                      {filters.flags.includes(flag) && (
                        <X className="w-3 h-3 ml-1" />
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="gap-1"
            >
              <RotateCcw className="w-4 h-4" />
              Reset All
            </Button>
            <DialogClose asChild>
              <Button size="sm" className="gap-1">
                <Check className="w-4 h-4" />
                Apply Filters
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {activeFilterCount > 0 && (
        <>
          {onShare && (
            <Button variant="ghost" size="sm" onClick={onShare} className="gap-1">
              <Share2 className="w-4 h-4" />
              Share
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onReset} className="gap-1">
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
        </>
      )}
    </div>
  );
}

export default FilterPanel;
