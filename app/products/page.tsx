'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ProductList from '@/components/ProductList';

export default function ProductsPage() {
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const category = searchParams?.get('category') ?? null;
    setCategoryFilter(category);
  }, [searchParams]);

  return (
    <div className="container mx-auto px-4 py-8" style={{ marginTop: '50px' }}>
      <div className="max-w-7xl mx-auto">
        
        <ProductList categoryFilter={categoryFilter} />
      </div>
    </div>
  );
}
