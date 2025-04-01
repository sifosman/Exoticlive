"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import TypesenseProductGrid from '@/components/test/TypesenseProductGrid';
import ProductFilters from '@/components/test/ProductFilters';
import ProductSearch from '@/components/test/ProductSearch';
import { Button } from '@/components/ui/button';
import { X, SlidersHorizontal } from 'lucide-react';
import ShopBanner from '@/components/ShopBanner';

// Map of category slugs to proper category names
const CATEGORY_MAP: Record<string, string> = {
  'bags': 'Bags',
  'boots': 'Boots',
  'heels': 'Heels',
  'mens': 'Mens',
  'pumps': 'Pumps',
  'sandals': 'Sandals',
  'takkies': 'Takkies',
  'bargain-box': 'Bargain Box',
  'safety-boots': 'Safety Boots'
};

// Create a wrapper component to use searchParams
function ShopPageContent() {
  const searchParams = useSearchParams();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // Initialize with categories from URL if available
  const initialCategorySlug = searchParams.get('category');
  const initialCategory = initialCategorySlug && CATEGORY_MAP[initialCategorySlug] 
    ? CATEGORY_MAP[initialCategorySlug] 
    : '';

  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    initialCategory ? [initialCategory] : []
  );
  
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000]);
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('q') || '');
  
  // Function to scroll to top of the page with smooth behavior
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // Update filters when URL parameters change
  useEffect(() => {
    const category = searchParams.get('category');
    const query = searchParams.get('q');
    
    // Always update search query when URL changes
    setSearchQuery(query || '');
    
    // Handle category parameter changes
    if (category) {
      // If there's a category in the URL and it's valid
      const categoryName = CATEGORY_MAP[category];
      if (categoryName) {
        // Always update the category when URL changes
        setSelectedCategories([categoryName]);
      }
    } else {
      // If there's no category in the URL, clear selected categories
      setSelectedCategories([]);
    }
  }, [searchParams]); // Only depend on searchParams to avoid circular dependencies

  const toggleFilterMobile = () => {
    setIsFilterOpen(!isFilterOpen);
  };

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setSelectedColors([]);
    setSelectedSizes([]);
    setPriceRange([0, 5000]);
    setSearchQuery('');
    scrollToTop();
  };

  const hasActiveFilters = selectedCategories.length > 0 || 
                          selectedColors.length > 0 || 
                          selectedSizes.length > 0 || 
                          priceRange[0] > 0 || 
                          priceRange[1] < 5000 ||
                          searchQuery.length > 0;

  // Generate heading based on selected category
  const getHeadingText = () => {
    if (selectedCategories.length === 1) {
      return `Shop ${selectedCategories[0]}`;
    } else if (selectedCategories.length > 1) {
      return `Shop ${selectedCategories.join(', ')}`;
    }
    return 'Shop';
  };

  return (
    <>
      <ShopBanner heading={getHeadingText()} />
      
      <div className="container mx-auto px-4 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row justify-between items-start gap-6">
          {/* Mobile filter toggle */}
          <div className="w-full flex justify-between items-center md:hidden mb-4">
            <Button 
              onClick={toggleFilterMobile}
              variant="outline"
              className="flex items-center gap-2"
            >
              <SlidersHorizontal size={18} />
              Filters
            </Button>
            
            <ProductSearch 
              searchQuery={searchQuery} 
              setSearchQuery={(query) => {
                setSearchQuery(query);
                scrollToTop();
              }} 
              className="flex-1 mx-2"
            />
          </div>
          
          {/* Filters sidebar - desktop always visible, mobile conditional */}
          <div className={`
            ${isFilterOpen ? 'block' : 'hidden'} md:block
            w-full md:w-64 lg:w-72 bg-white md:sticky md:top-24 overflow-auto
            ${isFilterOpen ? 'h-auto fixed top-0 left-0 right-0 bottom-0 z-50 p-4 overflow-y-auto' : ''} 
          `}>
            {isFilterOpen && (
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Filters</h2>
                <Button onClick={toggleFilterMobile} variant="ghost" size="icon">
                  <X size={24} />
                </Button>
              </div>
            )}
            
            <ProductFilters 
              selectedCategories={selectedCategories}
              setSelectedCategories={(categories) => {
                setSelectedCategories(categories);
                scrollToTop();
              }}
              selectedColors={selectedColors}
              setSelectedColors={(colors) => {
                setSelectedColors(colors);
                scrollToTop();
              }}
              selectedSizes={selectedSizes}
              setSelectedSizes={(sizes) => {
                setSelectedSizes(sizes);
                scrollToTop();
              }}
              priceRange={priceRange}
              setPriceRange={(range) => {
                setPriceRange(range);
                scrollToTop();
              }}
            />
            
            {hasActiveFilters && (
              <Button 
                onClick={clearAllFilters}
                variant="outline" 
                className="mt-4 w-full"
              >
                Clear All Filters
              </Button>
            )}
          </div>
          
          {/* Product grid area */}
          <div className="flex-1">
            {/* Search bar - desktop only */}
            <div className="hidden md:flex justify-between items-center mb-6">
              <ProductSearch 
                searchQuery={searchQuery} 
                setSearchQuery={(query) => {
                  setSearchQuery(query);
                  scrollToTop();
                }} 
              />
            </div>
            
            {/* Product grid */}
            <TypesenseProductGrid 
              categories={selectedCategories}
              colors={selectedColors}
              sizes={selectedSizes}
              priceRange={priceRange}
              searchQuery={searchQuery}
            />
          </div>
        </div>
      </div>
    </>
  );
}

// Main component with Suspense boundary
export default function ShopPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading products...</div>}>
      <ShopPageContent />
    </Suspense>
  );
}
