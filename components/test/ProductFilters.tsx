import React from 'react';
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { X } from "lucide-react";

interface FilterProps {
  onFilterChange: (filters: {
    sizes: string[];
    priceRange: [number, number];
    colors: string[];
    categories: string[];
  }) => void;
  initialCategories?: string[];
}

const SIZES = ['5', '6', '7', '8', '9', '10', '11', '12'];
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
  'Bargain Box'
];
const MIN_PRICE = 0;
const MAX_PRICE = 2500;

export default function ProductFilters({ onFilterChange, initialCategories = [] }: FilterProps) {
  const [selectedSizes, setSelectedSizes] = React.useState<string[]>([]);
  const [priceRange, setPriceRange] = React.useState<[number, number]>([MIN_PRICE, MAX_PRICE]);
  const [selectedColors, setSelectedColors] = React.useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>(initialCategories);

  // Apply initialCategories when it changes
  React.useEffect(() => {
    if (initialCategories.length > 0) {
      setSelectedCategories(initialCategories);
      updateFilters(selectedSizes, priceRange, selectedColors, initialCategories);
    }
  }, [initialCategories]);

  const handleSizeChange = (size: string) => {
    const newSizes = selectedSizes.includes(size)
      ? selectedSizes.filter(s => s !== size)
      : [...selectedSizes, size];
    setSelectedSizes(newSizes);
    updateFilters(newSizes, priceRange, selectedColors, selectedCategories);
  };

  const handlePriceChange = (value: number[]) => {
    const newRange: [number, number] = [value[0], value[1]];
    setPriceRange(newRange);
    updateFilters(selectedSizes, newRange, selectedColors, selectedCategories);
  };

  const handleColorChange = (color: string) => {
    const newColors = selectedColors.includes(color)
      ? selectedColors.filter(c => c !== color)
      : [...selectedColors, color];
    setSelectedColors(newColors);
    updateFilters(selectedSizes, priceRange, newColors, selectedCategories);
  };

  const handleCategoryChange = (category: string) => {
    const newCategories = selectedCategories.includes(category)
      ? selectedCategories.filter(c => c !== category)
      : [...selectedCategories, category];
    setSelectedCategories(newCategories);
    updateFilters(selectedSizes, priceRange, selectedColors, newCategories);
  };

  const clearAllFilters = () => {
    setSelectedSizes([]);
    setPriceRange([MIN_PRICE, MAX_PRICE]);
    setSelectedColors([]);
    setSelectedCategories([]);
    updateFilters([], [MIN_PRICE, MAX_PRICE], [], []);
  };

  const updateFilters = (
    sizes: string[],
    price: [number, number],
    colors: string[],
    categories: string[]
  ) => {
    onFilterChange({
      sizes,
      priceRange: price,
      colors,
      categories,
    });
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
            className="mb-6"
          />
          <div className="flex justify-between mt-2">
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
