'use client';

import { Box, Container, Grid, Typography, Stack, TextField, Button } from '@mui/material';
import Link from 'next/link';
import { useState } from 'react';
import Image from 'next/image';
import InstagramIcon from '@mui/icons-material/Instagram';
import { Lato } from 'next/font/google';

// Import the Lato font
const lato = Lato({ subsets: ['latin'], weight: ['400', '700'] });

const Footer = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission logic here
    console.log(formData);
  };

  return (
    <Box 
      component="footer" 
      sx={{ 
        position: 'relative',
        mt: 12,
        py: 8,
        fontFamily: lato.style.fontFamily, // Use the imported Lato font
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: 'url("/footer-bg.webp")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.9,
          zIndex: -1
        }
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          {/* Left side - Existing content */}
          <Grid item xs={12} lg={8}>
            <Box sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(8px)', p: 4, borderRadius: 2, height: '100%' }}>
              <Grid container spacing={8}>
                <Grid item xs={12} md={4}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      mb: 3,
                      fontFamily: lato.style.fontFamily, // Use the imported Lato font
                      fontWeight: 600,
                      letterSpacing: '0.02em',
                      color: 'white',
                      fontSize: { xs: '1rem', md: '1.25rem' }
                    }}
                  >
                    About Us
                  </Typography>
                  <Typography 
                    sx={{ 
                      color: 'white',
                      fontFamily: lato.style.fontFamily, // Use the imported Lato font
                      letterSpacing: '0.02em',
                      fontSize: { xs: '0.875rem', md: '1rem' }
                    }}
                  >
                    We are a leading wholesale supplier of ladies shoes, providing quality footwear to businesses worldwide.
                  </Typography>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      mb: 3,
                      fontFamily: lato.style.fontFamily, // Use the imported Lato font
                      fontWeight: 600,
                      letterSpacing: '0.02em',
                      color: 'white',
                      fontSize: { xs: '1rem', md: '1.25rem' }
                    }}
                  >
                    Quick Links
                  </Typography>
                  <Stack spacing={1.5}>
                    {[
                      { text: 'Products', href: '/products' },
                      { text: 'About Us', href: '/about' },
                      { text: 'FAQ', href: '/faq' },
                      { text: 'Terms & Conditions', href: '/terms' }
                    ].map((link) => (
                      <Typography
                        key={link.href}
                        component={Link}
                        href={link.href}
                        sx={{ 
                          color: 'white',
                          textDecoration: 'none',
                          fontFamily: lato.style.fontFamily, // Use the imported Lato font
                          letterSpacing: '0.02em',
                          cursor: 'pointer',
                          fontSize: { xs: '0.875rem', md: '1rem' },
                          '&:hover': {
                            opacity: 0.8
                          }
                        }}
                      >
                        {link.text}
                      </Typography>
                    ))}
                  </Stack>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      mb: 3,
                      fontFamily: lato.style.fontFamily, // Use the imported Lato font
                      fontWeight: 600,
                      letterSpacing: '0.02em',
                      color: 'white',
                      fontSize: { xs: '1rem', md: '1.25rem' }
                    }}
                  >
                    Contact Us
                  </Typography>
                  <Stack 
                    spacing={1}
                    sx={{ 
                      color: 'white',
                      fontFamily: lato.style.fontFamily, // Use the imported Lato font
                      letterSpacing: '0.02em',
                      '& .MuiTypography-root': {
                        fontSize: { xs: '0.875rem', md: '1rem' }
                      }
                    }}
                  >
                    <Typography>Dawncrest, Verulam,4340</Typography>
                    <Typography>Email: sameer@exoticshoes.co.za</Typography>
                    <Typography>faraaz@exoticshoes.co.za</Typography>
                    <Typography>Whatsapp/Call: 071 345 6393</Typography>
                    <Typography>Whatsapp/Call: 078 811 5168</Typography>
                  </Stack>
                </Grid>
              </Grid>
            </Box>
          </Grid>

          {/* Right side - Contact Form */}
          <Grid item xs={12} lg={4}>
            <Box 
              component="form"
              onSubmit={handleSubmit}
              sx={{ 
                bgcolor: 'rgba(255, 255, 255, 0.1)', 
                backdropFilter: 'blur(8px)', 
                p: 4, 
                borderRadius: 2,
                height: '100%'
              }}
            >
              <Typography 
                variant="h6" 
                sx={{ 
                  mb: 3,
                  fontFamily: lato.style.fontFamily, // Use the imported Lato font
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                  color: 'white',
                  fontSize: { xs: '1rem', md: '1.25rem' }
                }}
              >
                Send us a Message
              </Typography>
              
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  sx={{
                    '& .MuiInputLabel-root': { color: 'white' },
                    '& .MuiOutlinedInput-root': {
                      color: 'white',
                      '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                      '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                      '&.Mui-focused fieldset': { borderColor: 'white' },
                    },
                  }}
                />
                
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  sx={{
                    '& .MuiInputLabel-root': { color: 'white' },
                    '& .MuiOutlinedInput-root': {
                      color: 'white',
                      '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                      '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                      '&.Mui-focused fieldset': { borderColor: 'white' },
                    },
                  }}
                />
                
                <TextField
                  fullWidth
                  label="Message"
                  multiline
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  sx={{
                    '& .MuiInputLabel-root': { color: 'white' },
                    '& .MuiOutlinedInput-root': {
                      color: 'white',
                      '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                      '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                      '&.Mui-focused fieldset': { borderColor: 'white' },
                    },
                  }}
                />
                
                <Button 
                  type="submit"
                  variant="outlined"
                  sx={{
                    color: 'white',
                    borderColor: 'white',
                    fontSize: { xs: '0.875rem', md: '1rem' },
                    '&:hover': {
                      borderColor: 'white',
                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                    },
                    fontFamily: lato.style.fontFamily, // Use the imported Lato font
                    letterSpacing: '0.05em'
                  }}
                >
                  Send Message
                </Button>
              </Stack>
            </Box>
          </Grid>
        </Grid>

        {/* Copyright, Social Media, and Payment Badges Section */}
        <Box 
          sx={{ 
            mt: 4, 
            pt: 3, 
            borderTop: 1, 
            borderColor: 'rgba(255, 255, 255, 0.2)',
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 3
          }}
        >
          {/* Copyright Text */}
          <Typography 
            sx={{ 
              color: 'white',
              fontFamily: lato.style.fontFamily, // Use the imported Lato font
              letterSpacing: '0.02em',
              fontSize: { xs: '0.75rem', md: '0.875rem' }
            }}
          >
            &copy; 2024 Developed by OWD. All rights reserved.
          </Typography>

          {/* Social Media and Payment Badges */}
          <Box 
            sx={{ 
              display: 'flex',
              gap: 2,
              alignItems: 'center'
            }}
          >
            {/* Social Media Icons */}
            <Box 
              sx={{ 
                display: 'flex',
                gap: 1,
                mr: 2
              }}
            >
              <Link 
                href="https://www.instagram.com/exotic_shoes_wholesale/?hl=en" 
                target="_blank"
                style={{ textDecoration: 'none' }}
              >
                <Box
                  sx={{
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(8px)',
                    borderRadius: '50%',
                    width: 40,
                    height: 40,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.2)',
                      transform: 'scale(1.1)'
                    }
                  }}
                >
                  <InstagramIcon sx={{ color: 'white' }} />
                </Box>
              </Link>
            </Box>

            {/* Payment Badges */}
            <Box 
              sx={{ 
                display: 'flex',
                gap: 2,
                alignItems: 'center'
              }}
            >
              <Box 
                sx={{ 
                  position: 'relative',
                  width: 80,
                  height: 40,
                  bgcolor: 'white',
                  borderRadius: 1,
                  overflow: 'hidden'
                }}
              >
                <Image
                  src="/yoco-logo.png" // Add your payment gateway image
                  alt="Payment Gateway"
                  fill
                  style={{ objectFit: 'contain', padding: '5px' }}
                />
              </Box>
              <Box 
                sx={{ 
                  position: 'relative',
                  width: 80,
                  height: 40,
                  bgcolor: 'white',
                  borderRadius: 1,
                  overflow: 'hidden'
                }}
              >
                <Image
                  src="/secure-payment.png" // Add your secure payment badge
                  alt="Secure Payment"
                  fill
                  style={{ objectFit: 'contain', padding: '5px' }}
                />
              </Box>
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;