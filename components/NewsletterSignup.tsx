'use client';

import { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  TextField, 
  Button, 
  Alert,
  Grid 
} from '@mui/material';
import Image from 'next/image';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import * as emailjs from '@emailjs/browser';

const NewsletterSignup = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize EmailJS
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_EMAILJS_USER_ID) {
      emailjs.init(process.env.NEXT_PUBLIC_EMAILJS_USER_ID);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);

    try {
      // Make sure required env vars are available
      if (!process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || 
          !process.env.NEXT_PUBLIC_EMAILJS_USER_ID ||
          !process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID) {
        throw new Error('EmailJS configuration is missing');
      }

      // Send email directly using EmailJS - using the contact form template
      // The admin will receive an email with the subscriber's email address
      await emailjs.send(
        process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID,
        process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID,
        {
          from_name: 'Newsletter Subscriber',
          from_email: email,
          message: `New newsletter signup: ${email} at ${new Date().toLocaleString()}`,
        },
        process.env.NEXT_PUBLIC_EMAILJS_USER_ID
      );

      // Show success message
      setShowSuccess(true);
      setEmail('');
      
      // Hide success message after 5 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 5000);
    } catch (err) {
      console.error('EmailJS error:', err);
      setError('Failed to subscribe. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box 
      sx={{ 
        bgcolor: '#ffffff',
        py: { xs: 4, md: 8 },
        borderTop: 1,
        borderBottom: 1,
        borderColor: 'divider'
      }}
    >
      <Container 
        maxWidth={false}
        sx={{ 
          width: '100%',
          maxWidth: '2000px',
          mx: 'auto'
        }}
      >
        <Grid container spacing={{ xs: 3, md: 6 }} alignItems="center">
          {/* Image Section */}
          <Grid item xs={12} md={4}>
            <Box
              sx={{
                position: 'relative',
                height: { xs: '250px', sm: '300px', md: '350px' },
                width: '100%',
                borderRadius: 2,
                overflow: 'hidden'
              }}
            >
              <Image
                src="/newsletter-image.webp"
                alt="Newsletter signup"
                fill
                style={{ 
                  objectFit: 'cover',
                  objectPosition: 'center'
                }}
              />
            </Box>
          </Grid>

          {/* Form Section */}
          <Grid item xs={12} md={8}>
            <Box
              component="form"
              onSubmit={handleSubmit}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 3
              }}
            >
              <Typography variant="h4" component="h2" fontWeight="bold">
                Subscribe to Our Newsletter
              </Typography>
              
              <Typography variant="body1" color="text.secondary" sx={{ maxWidth: '600px' }}>
                Stay updated with our latest products, releases, and exclusive offers. 
                Be the first to know when we drop new stock.
              </Typography>
              
              <Box 
                sx={{ 
                  display: 'flex', 
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { xs: 'stretch', sm: 'center' },
                  width: '100%',
                  maxWidth: '500px',
                  gap: 2
                }}
              >
                <TextField
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email address"
                  variant="outlined"
                  fullWidth
                  InputProps={{
                    startAdornment: <MailOutlineIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                />
                <Button 
                  type="submit"
                  variant="contained"
                  disabled={isSubmitting}
                  sx={{ 
                    bgcolor: '#1a1a1a', 
                    color: 'white',
                    '&:hover': {
                      bgcolor: '#333'
                    },
                    px: 4,
                    py: 1.5,
                    fontWeight: 'bold',
                    minWidth: { xs: '100%', sm: 'auto' }
                  }}
                >
                  {isSubmitting ? 'Subscribing...' : 'Subscribe'}
                </Button>
              </Box>
              
              {error && (
                <Alert severity="error" sx={{ width: '100%', maxWidth: '500px' }}>
                  {error}
                </Alert>
              )}
              
              {showSuccess && (
                <Alert severity="success" sx={{ width: '100%', maxWidth: '500px' }}>
                  Thank you for subscribing to our newsletter!
                </Alert>
              )}
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default NewsletterSignup;