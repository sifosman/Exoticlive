"use client";

import { useState } from 'react';
import TypesenseProductGrid from '@/components/test/TypesenseProductGrid';
import ProductFilters from '@/components/test/ProductFilters';
import ProductSearch from '@/components/test/ProductSearch';

export default function TestPage() {
  const [filters, setFilters] = useState({
    sizes: [] as string[],
    priceRange: [0, 10000] as [number, number],
    colors: [] as string[]
  });
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <main className="min-h-screen bg-white font-lato">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-lato font-bold text-gray-900 mb-8">Test Page - Product List</h1>
        
        {/* Search Bar */}
        <ProductSearch onSearch={setSearchQuery} />
        
        <div className="flex gap-8">
          <ProductFilters onFilterChange={setFilters} />
          <TypesenseProductGrid filters={filters} searchQuery={searchQuery} />
        </div>
      </div>
    </main>
  );
}
