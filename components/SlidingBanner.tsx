"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Box } from '@mui/material';

const banners = [
  {
    id: 1,
    desktopImage: '/Creative Business Presentation (7).webp',
    mobileImage: '/Creative Business Presentation Mobile 1.webp',
    alt: 'Banner 1',
    buttonStyle: 'bg-[#E7C9BD] text-black',
  },
  {
    id: 2,
    desktopImage: '/Creative Business Presentation (6).webp',
    mobileImage: '/Creative Business Presentation Mobile 2.webp',
    alt: 'Banner 2',
    buttonStyle: 'bg-white text-black',
  },
  {
    id: 3,
    desktopImage: '/Creative Business Presentation (4).webp',
    mobileImage: '/Creative Business Presentation Mobile 3.webp',
    alt: 'Banner 3',
    buttonStyle: 'bg-[#964B00] text-white',
  },
];

const SlidingBanner: React.FC = () => {
  const [currentBanner, setCurrentBanner] = useState(0);
  const [isMobile, setIsMobile] = useState(false);  // Default to desktop view
  const [isClient, setIsClient] = useState(false);  // Track if we're on client-side

  useEffect(() => {
    setIsClient(true);  // We're now on client-side
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Set initial value
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Box 
      sx={{
        position: 'relative',
        width: '100%',
        maxWidth: { 
          xs: '100%',
          md: '85%',
          lg: '75%'
        },
        height: { 
          xs: 'calc(100vh - 60px)',
          md: '500px',
          lg: '600px'
        },
        overflow: 'hidden',
        marginTop: { 
          xs: '0',
          md: '70px',
          lg: '72px' 
        },
        marginX: 'auto',
        borderRadius: { 
          xs: '0px',
          md: '12px' 
        }
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
          {/* Only render image after we detect client-side */}
          {isClient && (
            <Image
              src={isMobile ? banners[currentBanner].mobileImage : banners[currentBanner].desktopImage}
              alt={banners[currentBanner].alt}
              fill
              style={{ 
                objectFit: 'cover',
                objectPosition: 'center',
                width: '100%',
                height: '100%'
              }}
              sizes={isMobile ? "100vw" : "75vw"}
              priority
            />
          )}
          <div className="absolute inset-0 flex items-end justify-center pb-4 md:pb-8">
            <Link href="/products" className="group relative">
              <motion.div
                className="absolute inset-0 bg-white opacity-0 filter blur-md group-hover:opacity-30 transition-opacity duration-300"
                animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
              />
              <span 
                className={`
                  relative 
                  px-4 md:px-10 
                  py-1.5 md:py-3 
                  ${banners[currentBanner].buttonStyle} 
                  text-xs md:text-lg 
                  inline-block 
                  transition-all 
                  duration-300 
                  transform 
                  group-hover:scale-105
                  rounded-sm md:rounded
                `}
              >
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
