'use client';

import { useState } from 'react';
import FilterPanel from '@/components/FilterPanel';

export default function FilterWrapper({ categories }: { categories: any[] }) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['all']);

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  return (
    <FilterPanel
      categories={[
        { id: 'all', name: 'All', slug: 'all' },
        ...categories
      ]}
      selectedCategories={selectedCategories}
      onCategoryToggle={handleCategoryToggle}
    />
  );
}
