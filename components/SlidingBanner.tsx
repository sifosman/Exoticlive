"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Box } from '@mui/material';

const banners = [
  {
    id: 1,
    imageUrl: '/Creative Business Presentation (7).webp',
    alt: 'Banner 1',
    buttonStyle: 'bg-[#E7C9BD] text-black',
  },
  {
    id: 2,
    imageUrl: '/Creative Business Presentation (6).webp',
    alt: 'Banner 2',
    buttonStyle: 'bg-white text-black',
  },
  {
    id: 3,
    imageUrl: '/Creative Business Presentation (4).webp',
    alt: 'Banner 3',
    buttonStyle: 'bg-[#964B00] text-white',
  },
];

const SlidingBanner: React.FC = () => {
  const [currentBanner, setCurrentBanner] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 5000); // Change banner every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <Box 
      sx={{
        position: 'relative',
        width: '75%',  // Changed from 100% to 90%
        maxWidth: '1400px', // Add a maxWidth
        height: '600px',
        overflow: 'hidden',
        marginTop: '72px',
        marginLeft: 'auto', // Changed from calc
        marginRight: 'auto', // Changed from calc
        mx: 'auto' // Centers the box
      }}
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={currentBanner}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            position: 'absolute',
            inset: 0
          }}
        >
          <Image
            src={banners[currentBanner].imageUrl}
            alt={banners[currentBanner].alt}
            fill
            style={{ 
              objectFit: 'cover'
            }}
            priority
          />
          <div className="absolute inset-0 flex items-end justify-center pb-8">
            <Link href="/products" className="group relative">
              <motion.div
                className="absolute inset-0 bg-white opacity-0 filter blur-md group-hover:opacity-30 transition-opacity duration-300"
                animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
              />
              <span className={`relative px-10 py-3 ${banners[currentBanner].buttonStyle} text-lg inline-block transition-all duration-300 transform group-hover:scale-105`}>
                Shop Now
              </span>
            </Link>
          </div>
        </motion.div>
      </AnimatePresence>
    </Box>
  );
};

export default SlidingBanner;
