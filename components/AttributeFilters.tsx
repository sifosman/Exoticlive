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
        {/* Colors Section */}
        {availableColors.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-lato font-semibold mb-4 text-white">
              Filter by Color
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {availableColors.map((color, index) => (
                <motion.button
                  key={color}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => onColorToggle([color])}
                  className={`
                    py-2 px-3 rounded-lg font-lato text-sm font-medium
                    ${selectedColors.includes(color)
                      ? 'bg-white text-black'
                      : 'bg-white/10 text-white hover:bg-white/20'}
                    transition-all duration-200
                  `}
                >
                  {color}
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* Sizes Section */}
        {availableSizes.length > 0 && (
          <div>
            <h3 className="text-lg font-lato font-semibold mb-4 text-white">
              Filter by Size
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {availableSizes.map((size, index) => (
                <motion.button
                  key={size}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => onSizeToggle(size)}
                  className={`
                    py-2 px-3 rounded-lg font-lato text-sm font-medium
                    ${selectedSizes.includes(size)
                      ? 'bg-white text-black'
                      : 'bg-white/10 text-white hover:bg-white/20'}
                    transition-all duration-200
                  `}
                >
                  {size}
                </motion.button>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default AttributeFilters;
