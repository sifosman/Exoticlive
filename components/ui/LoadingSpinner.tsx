'use client';

import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color = '#000',
  className = '',
}) => {
  // Size mapping
  const sizeMap = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
  };

  const spinnerSize = sizeMap[size];

  return (
    <div className={`flex justify-center items-center ${className}`}>
      <div
        className={`${spinnerSize} border-2 border-t-transparent rounded-full animate-spin`}
        style={{ borderColor: `${color} transparent transparent transparent` }}
        role="status"
        aria-label="loading"
      />
    </div>
  );
};

export default LoadingSpinner;
