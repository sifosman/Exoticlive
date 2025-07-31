"use client";

import { Suspense } from 'react';
import ProductListTypesense from '@/components/product/ProductListTypesense';
import { searchProducts } from '@/utils/typesense-search';

// Loading component
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin mx-auto mb-4"></div>
    </div>
  </div>
);

export default function ProductsPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="pt-6 md:pt-6 pb-12 md:pb-16">
        <Suspense fallback={<LoadingFallback />}>
          <ProductListTypesense />
        </Suspense>
      </div>
    </main>
  );
}
