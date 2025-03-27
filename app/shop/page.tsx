"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import TypesenseProductGrid from '@/components/test/TypesenseProductGrid';
import ProductFilters from '@/components/test/ProductFilters';
import ProductSearch from '@/components/test/ProductSearch';
import { Button } from '@/components/ui/button';
import { X, SlidersHorizontal } from 'lucide-react';

// Map of category slugs to proper category names
const CATEGORY_MAP: Record<string, string> = {
  'bags': 'Bags',
  'boots': 'Boots',
  'heels': 'Heels',
  'mens': 'Mens',
  'pumps': 'Pumps',
  'sandals': 'Sandals',
  'takkies': 'Takkies',
  'bargain-box': 'Bargain Box'
};

export default function ShopPage() {
  const searchParams = useSearchParams();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // Initialize with categories from URL if available
  const initialCategorySlug = searchParams.get('category');
  const initialCategory = initialCategorySlug && CATEGORY_MAP[initialCategorySlug] 
    ? [CATEGORY_MAP[initialCategorySlug]] 
    : [];
  
  const [filters, setFilters] = useState({
    sizes: [] as string[],
    priceRange: [0, 10000] as [number, number],
    colors: [] as string[],
    categories: initialCategory
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  
  // Log filters for debugging
  useEffect(() => {
    console.log('Current filters:', filters);
  }, [filters]);
  
  // Update filters when URL parameters change
  useEffect(() => {
    const categorySlug = searchParams.get('category');
    if (categorySlug && CATEGORY_MAP[categorySlug]) {
      const categoryName = CATEGORY_MAP[categorySlug];
      console.log('Setting category from URL:', categoryName);
      
      setFilters(prev => ({
        ...prev,
        categories: [categoryName]
      }));
    }
  }, [searchParams]);

  // Toggle filter panel
  const toggleFilter = () => {
    setIsFilterOpen(!isFilterOpen);
  };

  // Generate heading based on selected category
  const getHeadingText = () => {
    if (filters.categories.length === 1) {
      return `Shop ${filters.categories[0]}`;
    } else if (filters.categories.length > 1) {
      return `Shop ${filters.categories.join(', ')}`;
    }
    return 'Shop';
  };

  return (
    <main className="min-h-screen bg-white font-sans">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 pt-10 text-center font-sans">
          {getHeadingText()}
        </h1>
        
        {/* Search Bar */}
        <ProductSearch onSearch={setSearchQuery} />
        
        {/* Mobile Filter Toggle Button */}
        <div className="md:hidden mb-4">
          <Button 
            onClick={toggleFilter} 
            variant="outline" 
            className="w-full flex items-center justify-center gap-2 font-sans"
          >
            <SlidersHorizontal size={16} />
            {isFilterOpen ? 'Hide Filters' : 'Show Filters'}
          </Button>
        </div>
        
        <div className="flex flex-col md:flex-row gap-8 font-sans relative">
          {/* Mobile Filter Overlay */}
          <div 
            className={`${isFilterOpen ? 'fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden' : 'hidden'}`}
            onClick={() => setIsFilterOpen(false)}
          />
          
          {/* Filter Panel - Hidden by default on mobile, slides in when toggled */}
          <div 
            className={`
              ${isFilterOpen ? 'translate-x-0' : '-translate-x-full'} 
              md:translate-x-0 fixed md:relative z-50 md:z-auto left-0 top-0 h-full md:h-auto
              transition-transform duration-300 ease-in-out bg-white md:bg-transparent
              w-3/4 md:w-auto overflow-y-auto md:overflow-visible
              shadow-xl md:shadow-none pb-20 md:pb-0
            `}
          >
            {/* Close button for mobile filter */}
            <div className="flex justify-between items-center p-4 border-b md:hidden">
              <h2 className="text-lg font-bold">Filters</h2>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setIsFilterOpen(false)}
              >
                <X size={24} />
              </Button>
            </div>
            
            <ProductFilters 
              onFilterChange={setFilters} 
              initialCategories={filters.categories}
            />
          </div>
          
          <TypesenseProductGrid 
            filters={filters} 
            searchQuery={searchQuery} 
          />
        </div>
      </div>
    </main>
  );
}
