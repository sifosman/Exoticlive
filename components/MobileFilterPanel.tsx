'use client'
import React from 'react';
import { Checkbox, FormControlLabel, FormGroup } from '@mui/material';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface MobileFilterPanelProps {
  categories: Category[];
  selectedCategories: string[];
  onCategoryToggle: (categorySlug: string) => void;
  onClose: () => void;
}

const MobileFilterPanel: React.FC<MobileFilterPanelProps> = ({
  categories = [],
  selectedCategories, 
  onCategoryToggle,
  onClose
}) => {
  const filteredCategories = categories
    .filter(category => category.name.toLowerCase() !== 'all')
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-lato font-semibold mb-2">Categories</h3>
      <FormGroup>
        <FormControlLabel
          control={
            <Checkbox
              checked={selectedCategories.length === 0}
              onChange={() => onCategoryToggle('all')}
              sx={{
                color: 'rgba(0, 0, 0, 0.6)',
                '&.Mui-checked': {
                  color: '#000',
                },
              }}
            />
          }
          label={
            <span className="font-lato text-sm">All Categories</span>
          }
          sx={{
            '& .MuiFormControlLabel-label': {
              fontFamily: 'Lato, sans-serif',
            }
          }}
        />
        {filteredCategories.map((category) => (
          <FormControlLabel
            key={category.id}
            control={
              <Checkbox
                checked={selectedCategories.includes(category.slug)}
                onChange={() => onCategoryToggle(category.slug)}
                sx={{
                  color: 'rgba(0, 0, 0, 0.6)',
                  '&.Mui-checked': {
                    color: '#000',
                  },
                }}
              />
            }
            label={
              <span className="font-lato text-sm">{category.name}</span>
            }
            sx={{
              '& .MuiFormControlLabel-label': {
                fontFamily: 'Lato, sans-serif',
              }
            }}
          />
        ))}
      </FormGroup>
    </div>
  );
};

export default MobileFilterPanel;
