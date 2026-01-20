'use client';

import { Product } from '@/lib/types';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { productConfigs } from '@/config/products';

interface ProductFilterProps {
  selectedProduct: Product | 'all';
  onSelect: (product: Product | 'all') => void;
  counts?: Record<Product | 'all', number>;
}

export function ProductFilter({ selectedProduct, onSelect, counts }: ProductFilterProps) {
  return (
    <Tabs value={selectedProduct} onValueChange={(v) => onSelect(v as Product | 'all')}>
      <TabsList>
        <TabsTrigger value="all" className="gap-2">
          All
          {counts?.all !== undefined && (
            <span className="text-xs text-muted-foreground">({counts.all})</span>
          )}
        </TabsTrigger>
        {productConfigs.map((product) => (
          <TabsTrigger key={product.id} value={product.id} className="gap-2">
            {product.name}
            {counts?.[product.id] !== undefined && (
              <span className="text-xs text-muted-foreground">({counts[product.id]})</span>
            )}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

export default ProductFilter;
