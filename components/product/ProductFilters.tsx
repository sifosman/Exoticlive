import React from 'react';
import { Button } from '../ui/button';
import FilterPanel from '../FilterPanel';
import PriceRangeFilter from '../PriceRangeFilter';
import AttributeFilters from '../AttributeFilters';
import { Category } from './types';

interface ProductFiltersProps {
  categories: Category[];
  selectedCategories: string[];
  priceRange: { min: number; max: number };
  currentPriceRange: { min: number; max: number };
  availableColors: string[];
  selectedColors: string[];
  availableSizes: string[];
  selectedSizes: string[];
  onCategoryToggle: (category: string) => void;
  onPriceChange: (min: number, max: number) => void;
  onColorToggle: (colors: string[]) => void;
  onSizeToggle: (size: string) => void;
  onClose: () => void;
}

const ProductFilters: React.FC<ProductFiltersProps> = ({
  categories,
  selectedCategories,
  priceRange,
  currentPriceRange,
  availableColors,
  selectedColors,
  availableSizes,
  selectedSizes,
  onCategoryToggle,
  onPriceChange,
  onColorToggle,
  onSizeToggle,
  onClose,
}) => {
  return (
    <div className="w-full">
      <FilterPanel 
        categories={[
          {id: 'all', name: 'All', slug: 'all'}, 
          ...categories
        ]}
        selectedCategories={selectedCategories}
        onCategoryToggle={onCategoryToggle}
        onClose={onClose}
      />
      <PriceRangeFilter
        minPrice={priceRange.min}
        maxPrice={priceRange.max}
        currentMin={currentPriceRange.min}
        currentMax={currentPriceRange.max}
        onPriceChange={onPriceChange}
      />
      <AttributeFilters
        availableColors={availableColors}
        selectedColors={selectedColors}
        onColorToggle={onColorToggle}
        availableSizes={availableSizes}
        selectedSizes={selectedSizes}
        onSizeToggle={onSizeToggle}
      />
    </div>
  );
};

export default ProductFilters;
