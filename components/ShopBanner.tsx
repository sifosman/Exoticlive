"use client";

import { Box, Typography, Container } from '@mui/material';
import Image from 'next/image';
import { motion } from 'framer-motion';

interface ShopBannerProps {
  heading?: string;
}

const ShopBanner = ({ heading = "Shop" }: ShopBannerProps) => {
  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: { xs: '150px', sm: '180px', md: '200px' },
        mb: 3,
        overflow: 'hidden',
      }}
    >
      {/* Background Image */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
        }}
      >
        <Image
          src="/about.webp"
          alt="Shop Banner"
          fill
          priority
          style={{
            objectFit: 'cover',
            objectPosition: 'center',
          }}
        />
        
        {/* Light Overlay */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'linear-gradient(rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.6))',
            zIndex: 1,
          }}
        />
      </Box>

      {/* Content */}
      <Container
        maxWidth="lg"
        sx={{
          position: 'relative',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '1.8rem', sm: '2.2rem', md: '2.5rem' },
              fontWeight: 600,
              color: 'white',
              textAlign: 'center',
              fontFamily: 'Lato, sans-serif',
              textShadow: '0 2px 4px rgba(0,0,0,0.2)',
              letterSpacing: '0.03em',
            }}
          >
            {heading}
          </Typography>
        </motion.div>
      </Container>
    </Box>
  );
};

export default ShopBanner;
