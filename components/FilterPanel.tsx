'use client'
import React from 'react';
import Switch from '@/components/ui/switch';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface FilterPanelProps {
  categories?: Category[];
  selectedCategories: string[];
  onCategoryToggle: (category: string) => void;
  onClose: () => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({ 
  categories = [],
  selectedCategories, 
  onCategoryToggle,
  onClose
}) => {
  const filteredCategories = categories
    .filter(category => category.name.toLowerCase() !== 'all')
    .sort((a, b) => a.name.localeCompare(b.name));

  const isCategorySelected = (slug: string) => {
    return selectedCategories.includes(slug);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 lg:relative lg:bg-transparent lg:backdrop-blur-none"
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 20 }}
        className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-black p-6 shadow-xl lg:relative lg:w-full lg:max-w-none lg:p-0 lg:shadow-none"
      >
        <div className="relative w-full lg:w-full lg:mr-8 rounded-lg shadow-lg">
          <div 
            className="absolute inset-0 z-0 bg-cover bg-top"
            style={{ backgroundImage: "url('/footer-bg.webp')" }}
          />
          
          <motion.div 
            className="relative z-10 m-[5px] p-6 rounded-lg bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-md"
          >
            <button
              onClick={onClose}
              className="lg:hidden absolute top-2 right-2 p-2 text-white/90 hover:text-white"
            >
              <X size={20} />
            </button>

            {/* Categories Section */}
            <h3 className="text-lg font-lato font-semibold mb-4 text-white mt-8 lg:mt-0">
              Filter by Category
            </h3>
            
            <div className="space-y-3 mb-8">
              {/* All Categories option */}
              <motion.div 
                key="all"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-2 rounded-md hover:bg-white/10 transition-all duration-200 cursor-pointer"
                onClick={() => onCategoryToggle('all')}
              >
                <label 
                  htmlFor="category-all"
                  className="text-sm font-lato font-medium leading-none text-white/90 flex-grow cursor-pointer"
                >
                  All Categories
                </label>
                <Switch
                  id="category-all"
                  checked={selectedCategories.length === 0}
                  onCheckedChange={() => onCategoryToggle('all')}
                />
              </motion.div>

              {/* Category options */}
              {filteredCategories.map((category, index) => (
                <motion.div 
                  key={category.id} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-white/10 transition-all duration-200 cursor-pointer"
                  onClick={() => onCategoryToggle(category.slug)}
                >
                  <label 
                    htmlFor={`category-${category.slug}`} 
                    className="text-sm font-lato font-medium leading-none text-white/90 flex-grow cursor-pointer"
                  >
                    {category.name}
                  </label>
                  <Switch
                    id={`category-${category.slug}`}
                    checked={isCategorySelected(category.slug)}
                    onCheckedChange={() => onCategoryToggle(category.slug)}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
};

FilterPanel.defaultProps = {
  categories: [],
};

export default FilterPanel;
