'use client';

import { useState } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  TextField, 
  Button, 
  Alert,
  Snackbar,
  Grid 
} from '@mui/material';
import Image from 'next/image';
import MailOutlineIcon from '@mui/icons-material/MailOutline';

const NewsletterSignup = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Replace with your actual API endpoint
      const response = await fetch('/api/newsletter-signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error('Failed to subscribe');
      }

      setShowSuccess(true);
      setEmail('');
    } catch (err) {
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
                gap: { xs: 2, md: 4 },
                pl: { md: 8 },
                width: '100%',
                maxWidth: '1000px'
              }}
            >
              <Typography 
                variant="h3"
                component="h2"
                sx={{ 
                  fontFamily: 'Montserrat, sans-serif',
                  fontWeight: 600,
                  mb: { xs: 1, md: 2 },
                  fontSize: { xs: '1.75rem', sm: '2rem', md: '3rem' }
                }}
              >
                Subscribe to Our Newsletter
              </Typography>
              
              <Typography 
                variant="h6"
                color="text.secondary"
                sx={{ 
                  fontFamily: 'Montserrat, sans-serif',
                  mb: { xs: 1, md: 2 },
                  maxWidth: '800px',
                  fontSize: { xs: '0.9rem', sm: '1rem', md: '1.25rem' }
                }}
              >
                Stay updated with our latest products, exclusive offers, and fashion trends!
              </Typography>

              <Box 
                sx={{ 
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: 2,
                  width: '100%',
                  maxWidth: '1000px'
                }}
              >
                <TextField
                  fullWidth
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'white',
                      height: { xs: '48px', md: '56px' },
                      '&:hover fieldset': {
                        borderColor: '#007600',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#007600',
                      },
                    },
                  }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isSubmitting}
                  startIcon={<MailOutlineIcon />}
                  sx={{
                    bgcolor: '#007600',
                    '&:hover': {
                      bgcolor: '#006000',
                    },
                    fontFamily: 'Montserrat, sans-serif',
                    px: { xs: 4, md: 6 },
                    height: { xs: '48px', md: '56px' },
                    whiteSpace: 'nowrap',
                    fontSize: { xs: '0.875rem', md: '1rem' }
                  }}
                >
                  {isSubmitting ? 'Subscribing...' : 'Subscribe'}
                </Button>
              </Box>
            </Box>
          </Grid>
        </Grid>

        {/* Snackbar notifications remain the same */}
        <Snackbar 
          open={showSuccess} 
          autoHideDuration={6000} 
          onClose={() => setShowSuccess(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert 
            onClose={() => setShowSuccess(false)} 
            severity="success"
            sx={{ width: '100%' }}
          >
            Successfully subscribed to newsletter!
          </Alert>
        </Snackbar>

        <Snackbar 
          open={!!error} 
          autoHideDuration={6000} 
          onClose={() => setError(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert 
            onClose={() => setError(null)} 
            severity="error"
            sx={{ width: '100%' }}
          >
            {error}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

export default NewsletterSignup;