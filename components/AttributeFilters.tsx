'use client'
import React, { Fragment } from 'react';
import { motion } from 'framer-motion';
import { Listbox, Transition } from '@headlessui/react';
import { ChevronUpDownIcon, CheckIcon } from '@heroicons/react/20/solid';

interface AttributeFiltersProps {
  availableColors: string[];
  selectedColors: string[];
  onColorToggle: (colors: string[]) => void;
  availableSizes: string[];
  selectedSizes: string[];
  onSizeToggle: (size: string) => void;
}

const AttributeFilters: React.FC<AttributeFiltersProps> = ({
  availableColors,
  selectedColors,
  onColorToggle,
  availableSizes,
  selectedSizes,
  onSizeToggle
}) => {
  // Color mapping for visual representation
  const colorMap: { [key: string]: string } = {
    black: '#000000',
    white: '#FFFFFF',
    red: '#FF0000',
    blue: '#0000FF',
    green: '#008000',
    yellow: '#FFFF00',
    purple: '#800080',
    orange: '#FFA500',
    pink: '#FFC0CB',
    grey: '#808080',
    brown: '#A52A2A',
    navy: '#000080',
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="relative w-full lg:w-full lg:mr-8 rounded-lg shadow-lg mt-6"
    >
      <div 
        className="absolute inset-0 z-0 bg-cover bg-top"
        style={{ backgroundImage: "url('/footer-bg.webp')" }}
      />
      
      <motion.div 
        className="relative z-10 m-[5px] p-6 rounded-lg bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-md min-h-[200px]"
      >
        <div className="space-y-6">
          {/* Color Filter */}
          {availableColors.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-3">Colors</h4>
              <div className="flex flex-wrap gap-2">
                {availableColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => onColorToggle([color])}
                    className={`
                      w-8 h-8 rounded-full border-2 
                      ${selectedColors.includes(color) ? 'border-black' : 'border-gray-200'}
                      transition-all duration-200
                    `}
                    style={{
                      backgroundColor: colorMap[color.toLowerCase()] || color.toLowerCase(),
                      boxShadow: selectedColors.includes(color) ? '0 0 0 2px white, 0 0 0 4px black' : 'none'
                    }}
                    aria-label={color}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Size Filter */}
          {availableSizes.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-3">Sizes</h4>
              <div className="flex flex-wrap gap-2">
                {availableSizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => onSizeToggle(size)}
                    className={`
                      px-4 py-2 rounded-md text-sm font-medium
                      ${selectedSizes.includes(size) 
                        ? 'bg-black text-white' 
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }
                      transition-all duration-200
                    `}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AttributeFilters;
