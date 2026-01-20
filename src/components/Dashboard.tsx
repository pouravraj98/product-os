'use client';

import { ScoredFeature, Product, DashboardStats } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FeatureCard } from './FeatureCard';
import { productConfigs } from '@/config/products';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, CircleAlert, CircleDot, Circle, LayoutGrid } from 'lucide-react';

interface DashboardProps {
  stats: DashboardStats;
  topFeaturesByProduct: Record<Product, ScoredFeature[]>;
}

export function Dashboard({ stats, topFeaturesByProduct }: DashboardProps) {
  const router = useRouter();

  const handlePriorityClick = (priority: 'all' | 'high' | 'medium' | 'low') => {
    if (priority === 'all') {
      router.push('/products/all');
    } else {
      router.push(`/products/all?priority=${priority}`);
    }
  };

  return (
    <div className="space-y-8">
      {/* Quick Stats */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-muted-foreground">Quick Stats</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card
            className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 group"
            onClick={() => handlePriorityClick('all')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <LayoutGrid className="w-4 h-4" />
                Total Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalFeatures}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                View all
                <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 group"
            onClick={() => handlePriorityClick('high')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CircleAlert className="w-4 h-4 text-priority-high" />
                High Priority (8.0+)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-priority-high-foreground">
                {(stats.byPriority['1'] || 0) + (stats.byPriority['2'] || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                View high priority
                <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 group"
            onClick={() => handlePriorityClick('medium')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CircleDot className="w-4 h-4 text-priority-medium" />
                Medium Priority (5.0-7.9)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-priority-medium-foreground">
                {stats.byPriority['3'] || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                View medium priority
                <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 group"
            onClick={() => handlePriorityClick('low')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Circle className="w-4 h-4 text-priority-low" />
                Low Priority (&lt;5.0)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-priority-low-foreground">
                {stats.byPriority['4'] || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                View low priority
                <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* By Product */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-muted-foreground">By Product</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {productConfigs.map((product) => (
            <Link key={product.id} href={`/products/${product.id}`}>
              <Card className="transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer h-full group">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>{product.name}</span>
                    <Badge variant={product.stage === 'mature' ? 'default' : 'secondary'}>
                      {product.stage}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.byProduct[product.id] || 0}</div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    features in icebox
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Top Features */}
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-muted-foreground">Top Features</h2>

        {/* Top Features by Product */}
        {productConfigs.map((product) => {
          const features = topFeaturesByProduct[product.id] || [];
          if (features.length === 0) return null;

          return (
            <div key={product.id} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Top {product.name} Features
                </h3>
                <Link href={`/products/${product.id}`}>
                  <Button variant="ghost" size="sm">
                    View all
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {features.slice(0, 3).map((feature, index) => (
                  <FeatureCard
                    key={feature.id}
                    feature={feature}
                    rank={index + 1}
                    showProduct={false}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {/* Global Top Features */}
        {stats.topFeatures.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Overall Top Priorities</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.topFeatures.slice(0, 6).map((feature, index) => (
                <FeatureCard
                  key={feature.id}
                  feature={feature}
                  rank={index + 1}
                  showProduct={true}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
