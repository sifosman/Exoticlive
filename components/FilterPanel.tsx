import React from 'react';
import Switch from '@/components/ui/switch';

interface FilterPanelProps {
  categories: Array<{ id: string; name: string; slug: string }>;
  selectedCategories: string[];
  onCategoryToggle: (category: string) => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({ categories, selectedCategories, onCategoryToggle }) => {
  // Filter out the category with the name "ALL"
  const filteredCategories = categories.filter(category => category.name.toLowerCase() !== 'all');

  return (
    <div className="relative w-64 mr-8 rounded-lg shadow-lg overflow-hidden">
      {/* Background image container */}
      <div 
        className="absolute inset-0 z-0" 
        style={{
          backgroundImage: "url('/footer-bg.webp')",
          backgroundSize: 'cover',
          backgroundPosition: 'top',
        }}
      />
      
      {/* Improved gradient overlay with smaller border space */}
      <div 
        className="relative z-10 m-[5px] p-5 rounded-lg"
        style={{
          background: 'linear-gradient(145deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.08) 100%)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
        }}
      >
        <h3 className="text-lg font-lato font-semibold mb-4 text-white">
          Filter by Category
        </h3>
        {filteredCategories.map((category) => (
          <div 
            key={category.id} 
            className="flex items-center justify-between mb-3 p-2 rounded-md hover:bg-white/10 transition-all duration-200 cursor-pointer"
            onClick={() => onCategoryToggle(category.name)}
          >
            <label 
              htmlFor={`category-${category.slug}`} 
              className="text-sm font-lato font-medium leading-none text-white/90 flex-grow cursor-pointer"
            >
              {category.name}
            </label>
            <Switch
              id={`category-${category.slug}`}
              checked={selectedCategories.includes(category.name.toLowerCase())}
              onCheckedChange={() => onCategoryToggle(category.name)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default FilterPanel;
