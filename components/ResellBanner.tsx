"use client";

import { Box, Button, Container, Typography, useTheme, useMediaQuery } from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { motion } from 'framer-motion';

const ResellBanner = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const handleWhatsAppClick = () => {
    // Format the phone number properly for WhatsApp
    const phoneNumber = "27788115168"; // South Africa country code + number without the 0
    window.open(`https://wa.me/${phoneNumber}?text=Hi, I'm interested in reselling your products.`, '_blank');
  };

  return (
    <Box 
      sx={{ 
        position: 'relative',
        py: { xs: 6, sm: 8, md: 10 },
        px: { xs: 2, sm: 3, md: 4 },
        overflow: 'hidden',
        backgroundColor: '#f8f8f8',
        borderTop: '1px solid #eaeaea',
        borderBottom: '1px solid #eaeaea',
        width: '100%',
      }}
    >
      {/* Background gradient overlay */}
      <Box 
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: 'linear-gradient(135deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.05) 100%)',
          zIndex: 0
        }}
      />
      
      {/* Decorative elements - hide on very small screens */}
      <Box
        component={motion.div}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        sx={{
          position: 'absolute',
          top: -20,
          left: -20,
          width: { xs: 80, sm: 120 },
          height: { xs: 80, sm: 120 },
          borderRadius: '50%',
          background: 'linear-gradient(45deg, rgba(255,215,0,0.1) 0%, rgba(255,215,0,0.3) 100%)',
          zIndex: 0,
          display: { xs: 'none', sm: 'block' }
        }}
      />
      
      <Container 
        maxWidth="lg" 
        sx={{ 
          position: 'relative', 
          zIndex: 1,
          p: { xs: 0, sm: 2 } // Remove padding on small screens
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: { xs: 4, md: 6 },
          }}
        >
          {/* Video section - basic HTML5 video implementation */}
          <Box
            component={motion.div}
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
            sx={{
              flex: { xs: '1', md: '0 0 45%' },
              position: 'relative',
              height: { xs: '180px', sm: '220px', md: '400px' },
              width: { xs: '100%', sm: '100%' },
              maxWidth: { xs: '280px', sm: '300px', md: '500px' },
              mx: 'auto',
              order: { xs: 1, md: 2 },
              mb: { xs: 1, md: 0 },
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            }}
          >
            <video
              autoPlay
              loop
              muted
              playsInline
              width="100%"
              height="100%"
              style={{
                objectFit: 'contain',
                display: 'block',
                borderRadius: '12px',
                backgroundColor: '#f8f8f8',
              }}
            >
              <source src="/video.mp4" type="video/mp4" />
            </video>
          </Box>
          
          {/* Content section */}
          <Box 
            component={motion.div}
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            sx={{ 
              flex: 1,
              textAlign: { xs: 'center', md: 'left' },
              width: '100%',
              maxWidth: { xs: '100%', md: '60%' },
              order: { xs: 2, md: 1 }, 
              mt: { xs: 0, md: 0 },
              display: 'flex',
              flexDirection: 'column',
              alignItems: { xs: 'center', md: 'flex-start' }, 
            }}
          >
            <Typography 
              variant="h2" 
              component="h2"
              sx={{
                fontSize: { xs: '1.75rem', sm: '2.25rem', md: '2.75rem' },
                fontWeight: 700,
                mb: { xs: 1.5, md: 2 },
                fontFamily: 'Playfair Display, serif',
                background: 'linear-gradient(90deg, #000 30%, #666 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                lineHeight: 1.2,
              }}
            >
              Become a Reseller
            </Typography>
            
            <Typography 
              variant="h6"
              sx={{ 
                fontSize: { xs: '0.875rem', sm: '1rem', md: '1.25rem' },
                fontWeight: 400,
                mb: { xs: 2, md: 3 },
                color: 'text.secondary',
                fontFamily: 'Lato, sans-serif',
                maxWidth: { xs: '100%', md: '90%' },
                mx: { xs: 'auto', md: 0 },
                lineHeight: { xs: 1.5, md: 1.6 },
              }}
            >
              Start your own business reselling our premium products! Enjoy wholesale prices and dedicated support to help your business grow.
            </Typography>
            
            <Button
              variant="contained"
              onClick={handleWhatsAppClick}
              sx={{
                backgroundColor: '#25D366', 
                color: 'white',
                py: { xs: 1, sm: 1.5, md: 2 },
                px: { xs: 2, sm: 3, md: 4 },
                fontSize: { xs: '0.85rem', sm: '0.9rem', md: '1rem' },
                borderRadius: '30px',
                boxShadow: '0 4px 14px rgba(37, 211, 102, 0.4)',
                fontFamily: 'Lato, sans-serif',
                fontWeight: 600,
                textTransform: 'none',
                whiteSpace: 'nowrap',
                '&:hover': {
                  backgroundColor: '#128C7E', 
                  boxShadow: '0 6px 20px rgba(37, 211, 102, 0.6)',
                },
                display: 'flex',
                gap: '8px',
                alignItems: 'center'
              }}
            >
              <Box 
                component="span"
                sx={{ 
                  display: 'flex',
                  alignItems: 'center',
                  '& svg': {
                    fontSize: { xs: '1.2rem', sm: '1.4rem' },
                  }
                }}
              >
                <WhatsAppIcon />
              </Box>
              {isMobile ? "WhatsApp Us" : "Chat with Us on WhatsApp"}
            </Button>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default ResellBanner;
