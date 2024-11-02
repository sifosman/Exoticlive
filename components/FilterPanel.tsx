'use client'
import React from 'react';
import Switch from '@/components/ui/switch';
import { motion } from 'framer-motion';
import { X } from 'lucide-react'; // Import close icon

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface FilterPanelProps {
  categories: Category[];
  selectedCategories: string[];
  onCategoryToggle: (category: string) => void;
  onClose: () => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({ categories, selectedCategories, onCategoryToggle, onClose }) => {
  const filteredCategories = categories.filter(category => 
    category.name.toLowerCase() !== 'all'
  );

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="relative w-full lg:w-64 lg:mr-8 rounded-lg shadow-lg overflow-hidden"
    >
      <div 
        className="absolute inset-0 z-0 bg-cover bg-top"
        style={{ backgroundImage: "url('/footer-bg.webp')" }}
      />
      
      <motion.div 
        className="relative z-10 m-[5px] p-5 rounded-lg bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-md"
      >
        {/* Mobile Close Button */}
        <button 
          onClick={onClose}
          className="lg:hidden absolute top-2 right-2 p-2 text-white/90 hover:text-white"
        >
          <X size={20} />
        </button>

        <h3 className="text-lg font-lato font-semibold mb-4 text-white mt-8 lg:mt-0">
          Filter by Category
        </h3>
        
        <div className="max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
          {filteredCategories.map((category, index) => (
            <motion.div 
              key={category.id} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
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
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default FilterPanel;
