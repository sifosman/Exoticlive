'use client';

import React, { useEffect, useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface PageLoadingProps {
  minDisplayTime?: number; // Minimum time to display the loading screen in ms
}

const PageLoading: React.FC<PageLoadingProps> = ({ minDisplayTime = 800 }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Set a minimum display time to avoid flickering
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, minDisplayTime);

    // Handle page load event
    const handleLoad = () => {
      clearTimeout(timer);
      setIsVisible(false);
    };

    // Add event listener for page load
    window.addEventListener('load', handleLoad);

    // Clean up
    return () => {
      clearTimeout(timer);
      window.removeEventListener('load', handleLoad);
    };
  }, [minDisplayTime]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col justify-center items-center">
      <div className="mb-4">
        <LoadingSpinner size="large" />
      </div>
      <p className="text-gray-600 font-lato">Loading...</p>
    </div>
  );
};

export default PageLoading;
