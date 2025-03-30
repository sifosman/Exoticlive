import React from 'react';
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { X } from "lucide-react";

// Updated interface to match how it's used in shop page
interface FilterProps {
  // Old API for backward compatibility
  onFilterChange?: (filters: {
    sizes: string[];
    priceRange: [number, number];
    colors: string[];
    categories: string[];
  }) => void;
  initialCategories?: string[];
  
  // New API as used in the shop page
  selectedCategories?: string[];
  setSelectedCategories?: React.Dispatch<React.SetStateAction<string[]>>;
  selectedColors?: string[];
  setSelectedColors?: React.Dispatch<React.SetStateAction<string[]>>;
  selectedSizes?: string[];
  setSelectedSizes?: React.Dispatch<React.SetStateAction<string[]>>;
  priceRange?: [number, number];
  setPriceRange?: React.Dispatch<React.SetStateAction<[number, number]>>;
}

const SIZES = ['3', '3.5', '4', '4.5', '5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12', '13', '14'];
const COLORS = [
  'All Black', 'Animal Print', 'Beige', 'Bisque', 'Black', 'Black Denim', 'Black PU', 
  'Black Sunflower', 'Black Suede', 'Black white', 'Black-White', 'Blue', 'Blush', 
  'Bronze', 'Brown', 'Brown Orange', 'Burgandy', 'Camo', 'Camel', 'Choc', 'Clear', 
  'Coffee', 'Color 2', 'Cream', 'Dark Blue', 'Dark Blue Denim', 'Dark Brown', 
  'Dark Green', 'Darkgrey', 'Denim', 'Fatigue', 'Gold', 'Gray', 'Green', 'Grey', 
  'Grey/Blue', 'Honey', 'Irredecent', 'Ivory', 'Khaki', 'Khaki/Orange', 'Leopard', 
  'Light Blue', 'Light Blue Denim', 'Light Brown', 'Light Green', 'Light Rose', 
  'Lilac', 'Lime Green', 'Maroon', 'Mink', 'Mixed', 'Multi', 'Natural', 'Navy', 
  'Nude', 'Off White', 'Olive', 'Orange', 'Patent Black', 'Pewter', 'Pink', 
  'Plush Mink', 'Purple', 'Red', 'Sage', 'Sand', 'Sea Shells', 'Silver', 'Skyblue', 
  'Snake', 'Tan', 'Taupe', 'Teal', 'Violet', 'W.pink', 'White', 'White/Blue', 
  'White/Green', 'Wine', 'Yellow'
].sort();
const CATEGORIES = [
  'Bags',
  'Boots',
  'Heels',
  'Mens',
  'Pumps',
  'Sandals',
  'Takkies',
  'Bargain Box',
  'Safety Boots'
];
const MIN_PRICE = 0;
const MAX_PRICE = 2500;

export default function ProductFilters({
  // Handle both APIs
  onFilterChange,
  initialCategories = [],
  selectedCategories: externalSelectedCategories,
  setSelectedCategories: externalSetSelectedCategories,
  selectedColors: externalSelectedColors,
  setSelectedColors: externalSetSelectedColors,
  selectedSizes: externalSelectedSizes,
  setSelectedSizes: externalSetSelectedSizes,
  priceRange: externalPriceRange,
  setPriceRange: externalSetPriceRange
}: FilterProps) {
  // Determine if we're using the new controlled API
  const isControlled = 
    externalSetSelectedCategories !== undefined &&
    externalSetSelectedColors !== undefined &&
    externalSetSelectedSizes !== undefined &&
    externalSetPriceRange !== undefined;
  
  // Internal state for old API
  const [internalSelectedSizes, setInternalSelectedSizes] = React.useState<string[]>([]);
  const [internalPriceRange, setInternalPriceRange] = React.useState<[number, number]>([MIN_PRICE, MAX_PRICE]);
  const [internalSelectedColors, setInternalSelectedColors] = React.useState<string[]>([]);
  const [internalSelectedCategories, setInternalSelectedCategories] = React.useState<string[]>(initialCategories);

  // Use either external state or internal state
  const selectedSizes = isControlled ? (externalSelectedSizes || []) : internalSelectedSizes;
  const selectedColors = isControlled ? (externalSelectedColors || []) : internalSelectedColors;
  const selectedCategories = isControlled ? (externalSelectedCategories || []) : internalSelectedCategories;
  const priceRange = isControlled ? (externalPriceRange || [MIN_PRICE, MAX_PRICE]) : internalPriceRange;
  
  // Use either external or internal state setters
  const setSelectedSizes = isControlled ? externalSetSelectedSizes! : setInternalSelectedSizes;
  const setSelectedColors = isControlled ? externalSetSelectedColors! : setInternalSelectedColors;
  const setSelectedCategories = isControlled ? externalSetSelectedCategories! : setInternalSelectedCategories;
  const setPriceRange = isControlled ? externalSetPriceRange! : setInternalPriceRange;

  // Apply initialCategories when it changes (for old API)
  React.useEffect(() => {
    if (!isControlled && initialCategories.length > 0) {
      setInternalSelectedCategories(initialCategories);
      if (onFilterChange) {
        onFilterChange({
          sizes: selectedSizes,
          priceRange: internalPriceRange,
          colors: selectedColors,
          categories: initialCategories,
        });
      }
    }
  }, [initialCategories, isControlled]);

  // Handlers for all filter types
  const handleSizeChange = (size: string) => {
    const newSizes = selectedSizes.includes(size)
      ? selectedSizes.filter(s => s !== size)
      : [...selectedSizes, size];
    
    setSelectedSizes(newSizes);
    
    // Call onFilterChange if using old API
    if (!isControlled && onFilterChange) {
      onFilterChange({
        sizes: newSizes,
        priceRange,
        colors: selectedColors,
        categories: selectedCategories,
      });
    }
  };

  const handlePriceChange = (value: number[]) => {
    const newRange: [number, number] = [value[0], value[1]];
    
    setPriceRange(newRange);
    
    // Call onFilterChange if using old API
    if (!isControlled && onFilterChange) {
      onFilterChange({
        sizes: selectedSizes,
        priceRange: newRange,
        colors: selectedColors,
        categories: selectedCategories,
      });
    }
  };

  const handleColorChange = (color: string) => {
    const newColors = selectedColors.includes(color)
      ? selectedColors.filter(c => c !== color)
      : [...selectedColors, color];
    
    setSelectedColors(newColors);
    
    // Call onFilterChange if using old API
    if (!isControlled && onFilterChange) {
      onFilterChange({
        sizes: selectedSizes,
        priceRange,
        colors: newColors,
        categories: selectedCategories,
      });
    }
  };

  const handleCategoryChange = (category: string) => {
    const newCategories = selectedCategories.includes(category)
      ? selectedCategories.filter(c => c !== category)
      : [...selectedCategories, category];
    
    setSelectedCategories(newCategories);
    
    // Call onFilterChange if using old API
    if (!isControlled && onFilterChange) {
      onFilterChange({
        sizes: selectedSizes,
        priceRange,
        colors: selectedColors,
        categories: newCategories,
      });
    }
  };

  const clearAllFilters = () => {
    setSelectedSizes([]);
    setPriceRange([MIN_PRICE, MAX_PRICE]);
    setSelectedColors([]);
    setSelectedCategories([]);
    
    // Call onFilterChange if using old API
    if (!isControlled && onFilterChange) {
      onFilterChange({
        sizes: [],
        priceRange: [MIN_PRICE, MAX_PRICE],
        colors: [],
        categories: [],
      });
    }
  };

  const hasActiveFilters = selectedSizes.length > 0 || 
    selectedColors.length > 0 || 
    priceRange[0] !== MIN_PRICE || 
    priceRange[1] !== MAX_PRICE || 
    selectedCategories.length > 0;

  return (
    <div className="w-64 bg-white rounded-lg shadow-sm border border-gray-100">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold font-lato">Filters</h2>
          {hasActiveFilters && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearAllFilters}
              className="text-sm text-gray-500 hover:text-gray-700 font-lato"
            >
              Clear all
            </Button>
          )}
        </div>

        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2">
            {selectedSizes.map(size => (
              <Badge 
                key={size} 
                variant="secondary"
                className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200"
              >
                Size {size}
                <X 
                  size={14} 
                  className="cursor-pointer" 
                  onClick={() => handleSizeChange(size)}
                />
              </Badge>
            ))}
            {selectedColors.map(color => (
              <Badge 
                key={color} 
                variant="secondary"
                className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200"
              >
                {color}
                <X 
                  size={14} 
                  className="cursor-pointer" 
                  onClick={() => handleColorChange(color)}
                />
              </Badge>
            ))}
            {selectedCategories.map(category => (
              <Badge 
                key={category} 
                variant="secondary"
                className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200"
              >
                {category}
                <X 
                  size={14} 
                  className="cursor-pointer" 
                  onClick={() => handleCategoryChange(category)}
                />
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Category Filter */}
      <div className="p-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold font-lato mb-4">Category</h3>
        <div className="space-y-2">
          {CATEGORIES.map((category) => (
            <Button
              key={category}
              variant={selectedCategories.includes(category) ? "default" : "outline"}
              size="sm"
              onClick={() => handleCategoryChange(category)}
              className={`w-full px-3 py-2 text-sm rounded-lg font-lato
                ${selectedCategories.includes(category)
                  ? 'bg-gray-900 text-white'
                  : 'hover:bg-gray-100 text-gray-700'
                }
                transition-colors duration-200 text-left
              `}
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      {/* Size Filter */}
      <div className="p-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold font-lato mb-4">Size</h3>
        <div className="grid grid-cols-4 gap-2">
          {SIZES.map(size => (
            <Button
              key={size}
              variant={selectedSizes.includes(size) ? "default" : "outline"}
              size="sm"
              onClick={() => handleSizeChange(size)}
              className={`w-full px-3 py-2 rounded-md border text-center text-sm font-lato
                ${selectedSizes.includes(size) 
                  ? 'bg-gray-900 text-white border-gray-900' 
                  : 'border-gray-300 hover:border-gray-400 text-gray-700'
                }
              `}
            >
              {size}
            </Button>
          ))}
        </div>
      </div>

      {/* Price Range Filter */}
      <div className="p-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold font-lato mb-4">Price Range</h3>
        <div className="px-2">
          <Slider
            defaultValue={[MIN_PRICE, MAX_PRICE]}
            max={MAX_PRICE}
            min={MIN_PRICE}
            step={50}
            value={priceRange}
            onValueChange={handlePriceChange}
            className="mb-4"
          />
          <div className="flex justify-between mt-4 gap-4">
            <div className="w-1/2">
              <label htmlFor="min-price" className="block text-xs text-gray-500 mb-1 font-lato">Min Price</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R</span>
                <input
                  id="min-price"
                  type="number"
                  min={MIN_PRICE}
                  max={priceRange[1]}
                  value={priceRange[0]}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    if (value >= MIN_PRICE && value <= priceRange[1]) {
                      handlePriceChange([value, priceRange[1]]);
                    }
                  }}
                  className="w-full pl-7 pr-2 py-2 border border-gray-300 rounded-md text-sm font-lato"
                />
              </div>
            </div>
            <div className="w-1/2">
              <label htmlFor="max-price" className="block text-xs text-gray-500 mb-1 font-lato">Max Price</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R</span>
                <input
                  id="max-price"
                  type="number"
                  min={priceRange[0]}
                  max={MAX_PRICE}
                  value={priceRange[1]}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    if (value >= priceRange[0] && value <= MAX_PRICE) {
                      handlePriceChange([priceRange[0], value]);
                    }
                  }}
                  className="w-full pl-7 pr-2 py-2 border border-gray-300 rounded-md text-sm font-lato"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-between mt-4">
            <span className="text-sm text-gray-600 font-lato">
              {new Intl.NumberFormat('en-ZA', {
                style: 'currency',
                currency: 'ZAR',
              }).format(priceRange[0])}
            </span>
            <span className="text-sm text-gray-600 font-lato">
              {new Intl.NumberFormat('en-ZA', {
                style: 'currency',
                currency: 'ZAR',
              }).format(priceRange[1])}
            </span>
          </div>
        </div>
      </div>

      {/* Color Filter */}
      <div className="p-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold font-lato mb-4">Color</h3>
        <div className="space-y-2 overflow-y-auto max-h-36">
          {COLORS.map((color) => (
            <Button
              key={color}
              variant={selectedColors.includes(color) ? "default" : "outline"}
              size="sm"
              onClick={() => handleColorChange(color)}
              className={`w-full text-sm rounded text-left px-3 py-1.5 font-lato
                ${selectedColors.includes(color)
                  ? 'bg-gray-900 text-white' 
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }
              `}
            >
              {color}
            </Button>
          ))}
        </div>
      </div>
      <div className="p-4">
        <Button
          onClick={clearAllFilters}
          className="w-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-lato"
          variant="outline"
        >
          Reset all filters
        </Button>
      </div>
    </div>
  );
}
