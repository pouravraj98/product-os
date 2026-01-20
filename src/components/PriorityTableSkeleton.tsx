'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

interface PriorityTableSkeletonProps {
  rows?: number;
  showProduct?: boolean;
}

export function PriorityTableSkeleton({ rows = 10, showProduct = true }: PriorityTableSkeletonProps) {
  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20">Score</TableHead>
            <TableHead>Feature</TableHead>
            {showProduct && <TableHead className="w-24">Product</TableHead>}
            <TableHead className="w-16">Tier</TableHead>
            <TableHead className="w-20">Votes</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRow key={i}>
              {/* Score Column */}
              <TableCell>
                <div className="flex items-center gap-2">
                  <Skeleton className="w-5 h-5 rounded-full" />
                  <Skeleton className="w-10 h-6" />
                </div>
              </TableCell>

              {/* Feature Column */}
              <TableCell>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-3" />
                    <Skeleton className="w-10 h-3" />
                    <Skeleton className="w-10 h-3" />
                  </div>
                  <div className="flex gap-1">
                    <Skeleton className="w-16 h-5 rounded-full" />
                    <Skeleton className="w-20 h-5 rounded-full" />
                  </div>
                </div>
              </TableCell>

              {/* Product Column */}
              {showProduct && (
                <TableCell>
                  <Skeleton className="w-16 h-5 rounded-full" />
                </TableCell>
              )}

              {/* Tier Column */}
              <TableCell>
                <Skeleton className="w-8 h-5 rounded-full" />
              </TableCell>

              {/* Votes Column */}
              <TableCell>
                <Skeleton className="w-8 h-4" />
              </TableCell>

              {/* Action Column */}
              <TableCell>
                <Skeleton className="w-8 h-8 rounded" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default PriorityTableSkeleton;
