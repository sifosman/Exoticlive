import React from 'react';
import * as Slider from '@radix-ui/react-slider';

interface PriceRangeFilterProps {
  minPrice: number;
  maxPrice: number;
  currentMin: number;
  currentMax: number;
  onPriceChange: (min: number, max: number) => void;
}

const PriceRangeFilter: React.FC<PriceRangeFilterProps> = ({
  minPrice,
  maxPrice,
  currentMin,
  currentMax,
  onPriceChange,
}) => {
  return (
    <div className=" bg-white p-4 rounded-lg space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-md font-lato font-bold text-black">Price Range</h3>
      </div>
      <Slider.Root
        className="relative flex items-center select-none touch-none w-full h-5"
        value={[currentMin, currentMax]}
        min={minPrice}
        max={maxPrice}
        step={1}
        minStepsBetweenThumbs={1}
        onValueChange={(newValues) => onPriceChange(newValues[0], newValues[1])}
      >
        <Slider.Track className="bg-gray-600 relative grow rounded-full h-[3px]">
          <Slider.Range className="absolute bg-green-700 rounded-full h-full" />
        </Slider.Track>
        <Slider.Thumb
          className="block font-lato text-black w-5 h-5 bg-white shadow-md rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-green-700"
          aria-label="Min price"
        />
        <Slider.Thumb
          className="block font-lato text-black w-5 h-5 bg-white shadow-md rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-green-700"
          aria-label="Max price"
        />
      </Slider.Root>
      <div className="flex justify-between mt-1">
        <span className="text-sm font-lato text-black">
          R{Math.round(currentMin).toLocaleString()}
        </span>
        <span className="text-sm font-lato text-black">
          R{Math.round(currentMax).toLocaleString()}
        </span>
      </div>
    </div>
  );
};

export default PriceRangeFilter;
