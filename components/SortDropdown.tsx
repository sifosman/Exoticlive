import React from 'react';

interface SortDropdownProps {
  onSortChange: (sortBy: string, sortOrder: string) => void;
}

const SortDropdown: React.FC<SortDropdownProps> = ({ onSortChange }) => {
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const [sortBy, sortOrder] = event.target.value.split('-');
    onSortChange(sortBy, sortOrder);
  };

  return (
    <select
      onChange={handleChange}
      className="p-2 border rounded font-lato"
    >
      <option value="DATE-DESC">Newest to Oldest</option>
      <option value="DATE-ASC">Oldest to Newest</option>
      <option value="PRICE-ASC">Price: Low to High</option>
      <option value="PRICE-DESC">Price: High to Low</option>
      <option value="RATING-DESC">Highest Rated</option>
    </select>
  );
};

export default SortDropdown;
