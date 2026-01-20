'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface FeatureCardSkeletonProps {
  showProduct?: boolean;
}

export function FeatureCardSkeleton({ showProduct = true }: FeatureCardSkeletonProps) {
  return (
    <Card className="border">
      <CardHeader className="pb-2 pt-3 px-4">
        {/* Score and Priority Row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Skeleton className="w-5 h-5 rounded-full" />
            <Skeleton className="w-10 h-6" />
          </div>
          <div className="flex items-center gap-2">
            {showProduct && <Skeleton className="w-16 h-5 rounded-full" />}
            <Skeleton className="w-8 h-5 rounded-full" />
          </div>
        </div>

        {/* Title and Identifier */}
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0 space-y-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 px-4 pb-3 space-y-2">
        {/* Factor Scores */}
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="w-12 h-4" />
          <Skeleton className="w-12 h-4" />
          <Skeleton className="w-12 h-4" />
        </div>

        {/* Flags */}
        <div className="flex flex-wrap gap-1">
          <Skeleton className="w-16 h-5 rounded-full" />
          <Skeleton className="w-20 h-5 rounded-full" />
        </div>

        {/* AI Summary */}
        <Skeleton className="h-8 w-full" />
      </CardContent>
    </Card>
  );
}

interface FeatureCardSkeletonGridProps {
  count?: number;
  showProduct?: boolean;
}

export function FeatureCardSkeletonGrid({ count = 6, showProduct = true }: FeatureCardSkeletonGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <FeatureCardSkeleton key={i} showProduct={showProduct} />
      ))}
    </div>
  );
}

export default FeatureCardSkeleton;
