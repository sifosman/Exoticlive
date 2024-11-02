import React from 'react';
import { ProductsOrderByEnum, OrderEnum } from '@/@types/graphql';

interface SortDropdownProps {
  onSortChange: (sortBy: ProductsOrderByEnum, sortOrder: OrderEnum) => void;
}

const SortDropdown: React.FC<SortDropdownProps> = ({ onSortChange }) => {
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const [sortBy, sortOrder] = event.target.value.split('-') as [ProductsOrderByEnum, OrderEnum];
    onSortChange(sortBy, sortOrder);
  };

  return (
    <div className="relative">
      <select
        onChange={handleChange}
        className="
          appearance-none
          w-full
          px-3
          py-1.5
          bg-white
          border
          border-gray-300
          rounded-lg
          shadow-sm
          font-lato
          text-xs
          md:text-sm
          text-gray-700
          focus:outline-none
          focus:ring-2
          focus:ring-black/5
          focus:border-black/10
          transition-all
          duration-200
        "
      >
        <option value={`${ProductsOrderByEnum.DATE}-${OrderEnum.DESC}`}>Newest to Oldest</option>
        <option value={`${ProductsOrderByEnum.DATE}-${OrderEnum.ASC}`}>Oldest to Newest</option>
        <option value={`${ProductsOrderByEnum.PRICE}-${OrderEnum.ASC}`}>Price: Low to High</option>
        <option value={`${ProductsOrderByEnum.PRICE}-${OrderEnum.DESC}`}>Price: High to Low</option>
        <option value={`${ProductsOrderByEnum.RATING}-${OrderEnum.DESC}`}>Highest Rated</option>
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
};

export default SortDropdown;
