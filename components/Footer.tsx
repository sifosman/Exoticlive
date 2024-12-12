'use client';

import { Box, Container, Grid, Typography, Stack, TextField, Button } from '@mui/material';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import InstagramIcon from '@mui/icons-material/Instagram';
import { Lato } from 'next/font/google';
import * as emailjs from '@emailjs/browser';

// Import the Lato font
const lato = Lato({ subsets: ['latin'], weight: ['400', '700'] });

interface FooterLink {
  text: string;
  href: string;
}

const Footer = () => {
  useEffect(() => {
    emailjs.init(process.env.NEXT_PUBLIC_EMAILJS_USER_ID!);
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const [submitStatus, setSubmitStatus] = useState({
    loading: false,
    error: null as string | null,
    success: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitStatus({ loading: true, error: null, success: false });

    try {
      await emailjs.send(
        process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID!,
        process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID!,
        {
          from_name: formData.name,
          from_email: formData.email,
          message: formData.message,
        },
        process.env.NEXT_PUBLIC_EMAILJS_USER_ID
      );

      setSubmitStatus({ loading: false, error: null, success: true });
      setFormData({ name: '', email: '', message: '' }); // Reset form
    } catch (error) {
      console.error('EmailJS error:', error);
      setSubmitStatus({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to send message',
        success: false
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
                    ].map((link: FooterLink) => (
                      <Typography
                        key={link.href}
                        component={Link}
                        href={link.href}
                        sx={{ 
                          color: 'rgba(255, 255, 255, 0.7)',
                          textDecoration: 'none',
                          transition: 'color 0.2s',
                          fontFamily: lato.style.fontFamily,
                          fontSize: { xs: '0.9rem', md: '1rem' },
                          '&:hover': {
                            color: 'white'
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
                    <Typography>Durban, Verulam</Typography>
                    <Typography>Email: sameer@exoticshoes.co.za</Typography>
                    <Typography>faraaz@exoticshoes.co.za</Typography>
                    <Typography>Whatsapp/Call: 071 345 6393</Typography>
                    <Typography>Whatsapp/Call: 078 811 5168</Typography>
                  </Stack>
                </Grid>
              </Grid>
            </Box>
          </Grid>

          {/* Right side - Contact form */}
          <Grid item xs={12} lg={4}>
            <Box sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(8px)', p: 4, borderRadius: 2 }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  mb: 3,
                  fontFamily: lato.style.fontFamily,
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                  color: 'white',
                  fontSize: { xs: '1rem', md: '1.25rem' }
                }}
              >
                Send us a Message
              </Typography>
              <form onSubmit={handleSubmit}>
                <Stack spacing={2}>
                  <TextField
                    name="name"
                    label="Name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        color: 'white',
                        '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                        '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                        '&.Mui-focused fieldset': { borderColor: 'white' }
                      },
                      '& .MuiInputLabel-root': { 
                        color: 'rgba(255, 255, 255, 0.7)',
                        '&.Mui-focused': { color: 'white' }
                      }
                    }}
                  />
                  <TextField
                    name="email"
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        color: 'white',
                        '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                        '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                        '&.Mui-focused fieldset': { borderColor: 'white' }
                      },
                      '& .MuiInputLabel-root': { 
                        color: 'rgba(255, 255, 255, 0.7)',
                        '&.Mui-focused': { color: 'white' }
                      }
                    }}
                  />
                  <TextField
                    name="message"
                    label="Message"
                    multiline
                    rows={4}
                    value={formData.message}
                    onChange={handleChange}
                    required
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        color: 'white',
                        '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                        '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                        '&.Mui-focused fieldset': { borderColor: 'white' }
                      },
                      '& .MuiInputLabel-root': { 
                        color: 'rgba(255, 255, 255, 0.7)',
                        '&.Mui-focused': { color: 'white' }
                      }
                    }}
                  />
                  <Button 
                    type="submit"
                    variant="outlined"
                    disabled={submitStatus.loading}
                    sx={{
                      color: 'white',
                      borderColor: 'rgba(255, 255, 255, 0.5)',
                      '&:hover': {
                        borderColor: 'white',
                        bgcolor: 'rgba(255, 255, 255, 0.1)'
                      }
                    }}
                  >
                    {submitStatus.loading ? 'Sending...' : 'Send Message'}
                  </Button>
                  {submitStatus.error && (
                    <Typography color="error" variant="body2">
                      {submitStatus.error}
                    </Typography>
                  )}
                  {submitStatus.success && (
                    <Typography sx={{ color: '#4caf50' }} variant="body2">
                      Message sent successfully!
                    </Typography>
                  )}
                </Stack>
              </form>
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