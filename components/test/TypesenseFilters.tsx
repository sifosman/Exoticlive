"use client";

import { useState, useEffect } from 'react';
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { client as typesenseClient } from '@/utils/typesense-client';

interface FilterProps {
  onFilterChange: (filters: FilterState) => void;
  facets: {
    categories?: Array<{ value: string; count: number }>;
    stock_status?: Array<{ value: string; count: number }>;
  };
  priceRange: [number, number];
  minPrice: number;
  maxPrice: number;
}

export interface FilterState {
  categories: string[];
  priceRange: [number, number];
  stockStatus: string[];
}

const stockStatusLabels: Record<string, string> = {
  'instock': 'In Stock',
  'outofstock': 'Out of Stock',
  'onbackorder': 'On Backorder'
};

export const TypesenseFilters = ({ onFilterChange, facets, priceRange, minPrice, maxPrice }: FilterProps) => {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedStockStatus, setSelectedStockStatus] = useState<string[]>([]);
  const [localPriceRange, setLocalPriceRange] = useState<[number, number]>(priceRange);

  // Update local price range when prop changes
  useEffect(() => {
    setLocalPriceRange(priceRange);
  }, [priceRange]);

  const handleCategoryChange = (category: string, checked: boolean) => {
    const newCategories = checked
      ? [...selectedCategories, category]
      : selectedCategories.filter(c => c !== category);
    setSelectedCategories(newCategories);
    onFilterChange({
      categories: newCategories,
      priceRange: localPriceRange,
      stockStatus: selectedStockStatus,
    });
  };

  const handleStockStatusChange = (status: string, checked: boolean) => {
    const newStatus = checked
      ? [...selectedStockStatus, status]
      : selectedStockStatus.filter(s => s !== status);
    setSelectedStockStatus(newStatus);
    onFilterChange({
      categories: selectedCategories,
      priceRange: localPriceRange,
      stockStatus: newStatus,
    });
  };

  const handlePriceRangeChange = (value: number[]) => {
    const newRange: [number, number] = [value[0], value[1]];
    setLocalPriceRange(newRange);
    onFilterChange({
      categories: selectedCategories,
      priceRange: newRange,
      stockStatus: selectedStockStatus,
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(price);
  };

  return (
    <div className="space-y-6 p-4 bg-white rounded-lg shadow">
      {/* Categories */}
      {facets?.categories && facets.categories.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Categories</h3>
          <div className="space-y-2">
            {facets.categories.map((facet) => (
              <div key={facet.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`category-${facet.value}`}
                  checked={selectedCategories.includes(facet.value)}
                  onCheckedChange={(checked) => handleCategoryChange(facet.value, checked as boolean)}
                />
                <Label htmlFor={`category-${facet.value}`} className="text-sm">
                  {facet.value} ({facet.count})
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Price Range */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Price Range</h3>
        <div className="px-2">
          <Slider
            min={minPrice}
            max={maxPrice}
            step={1}
            value={localPriceRange}
            onValueChange={handlePriceRangeChange}
            className="my-6"
          />
          <div className="flex justify-between text-sm">
            <span>{formatPrice(localPriceRange[0])}</span>
            <span>{formatPrice(localPriceRange[1])}</span>
          </div>
        </div>
      </div>

      {/* Stock Status */}
      {facets?.stock_status && facets.stock_status.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Availability</h3>
          <div className="space-y-2">
            {facets.stock_status.map((facet) => (
              <div key={facet.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`stock-${facet.value}`}
                  checked={selectedStockStatus.includes(facet.value)}
                  onCheckedChange={(checked) => handleStockStatusChange(facet.value, checked as boolean)}
                />
                <Label htmlFor={`stock-${facet.value}`} className="text-sm">
                  {stockStatusLabels[facet.value] || facet.value} ({facet.count})
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
