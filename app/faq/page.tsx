"use client";

import React, { useState } from 'react';
import { Lato } from 'next/font/google';
import { 
  Container,
  Typography,
  Box,
  Grid,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Link
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import AssignmentReturnOutlinedIcon from '@mui/icons-material/AssignmentReturnOutlined';
import BusinessCenterOutlinedIcon from '@mui/icons-material/BusinessCenterOutlined';

const lato = Lato({ subsets: ['latin'], weight: ['400', '700'] });

// FAQ data structure
const faqData = [
  {
    question: "How do I shop on the Exotic Shoes website?",
    answer: "You can browse through our various products to find what you're looking for. If you already know what you want, you can use the search bar to help you find the product you require quickly and easily. Once you've found your shoes, all you have to do is add them to your shopping cart. Once you are done you should select the checkout option, you will then be asked to enter your delivery details as well as select a payment type. Once payment clears, we'll deliver your order straight to your door.",
    icon: <ShoppingBagOutlinedIcon fontSize="large" sx={{ color: '#829D46' }} />
  },
  {
    question: "How do returns work?",
    answer: (
      <>
        If you're not happy with your purchase for whatever reason, you may return the goods to Exotic Shoes.<br /><br />
        Please log your return via WhatsApp to one of the details below:<br /><br />
        <strong>Faraaz:</strong><br />
        WhatsApp: <Link href="https://wa.me/27788115168" target="_blank" sx={{ color: '#829D46', textDecoration: 'none' }}>078 811 5168</Link><br /><br />
        <strong>Sameer:</strong><br />
        WhatsApp: <Link href="https://wa.me/27713456393" target="_blank" sx={{ color: '#829D46', textDecoration: 'none' }}>071 345 6393</Link>
      </>
    ),
    icon: <AssignmentReturnOutlinedIcon fontSize="large" sx={{ color: '#829D46' }} />
  },
  {
    question: "Do you have a store I can come through and purchase?",
    answer: "Yes we have a showroom in Verulam. We accept customers by appointment only.",
    icon: <StorefrontOutlinedIcon fontSize="large" sx={{ color: '#829D46' }} />
  },
  {
    question: "Which courier company do you use?",
    answer: "Generally orders are sent out via Fastway but other couriers could possibly be used.",
    icon: <LocalShippingOutlinedIcon fontSize="large" sx={{ color: '#829D46' }} />
  },
  {
    question: "I would like to resell products. How can I do this?",
    answer: (
      <>
        Please contact <Link href="https://wa.me/27788115168" target="_blank" sx={{ color: '#829D46', textDecoration: 'none' }}>078 811 5168</Link> on WhatsApp to get started!
      </>
    ),
    icon: <BusinessCenterOutlinedIcon fontSize="large" sx={{ color: '#829D46' }} />
  }
];

export default function FAQPage() {
  const [expanded, setExpanded] = useState<string | false>(false);

  const handleChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  return (
    <Box 
      className={lato.className}
      sx={{ 
        minHeight: '100vh',
        pt: { xs: 12, md: 14 },
        pb: 8,
        backgroundColor: '#ffffff',
        fontFamily: 'inherit' // Ensure the Lato font is inherited by all child elements
      }}
    >
      <Container maxWidth="lg">
        {/* Header Section */}
        <Grid container justifyContent="center" sx={{ mb: 6 }}>
          <Grid item xs={12} md={10}>
            <Box textAlign="center">
              <Typography 
                variant="h3" 
                component="h1"
                sx={{ 
                  fontWeight: 700,
                  mb: 2,
                  fontSize: { xs: '1.75rem', sm: '2rem', md: '2.5rem' },
                  fontFamily: 'inherit'
                }}
              >
                Frequently Asked Questions
              </Typography>
              <Typography 
                variant="subtitle1"
                sx={{ 
                  color: 'text.secondary',
                  maxWidth: '800px',
                  mx: 'auto',
                  mb: 4,
                  px: { xs: 2, sm: 0 },
                  fontFamily: 'inherit'
                }}
              >
                Get answers to common questions about Exotic Shoes, our products, and services.
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* FAQ Accordion Section */}
        <Grid container justifyContent="center">
          <Grid item xs={12} md={10}>
            <Paper 
              elevation={0}
              sx={{ 
                borderRadius: 2,
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                backgroundColor: '#ffffff',
                mb: 6
              }}
            >
              {faqData.map((faq, index) => (
                <Accordion 
                  key={index}
                  expanded={expanded === `panel${index}`}
                  onChange={handleChange(`panel${index}`)}
                  disableGutters
                  elevation={0}
                  sx={{ 
                    border: 'none',
                    '&:not(:last-child)': {
                      borderBottom: '1px solid rgba(0, 0, 0, 0.08)'
                    },
                    '&:before': {
                      display: 'none',
                    },
                    fontFamily: 'inherit'
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon sx={{ color: '#829D46' }} />}
                    sx={{ 
                      px: { xs: 2, sm: 3, md: 4 },
                      py: { xs: 1.5, sm: 2, md: 3 },
                      '&:hover': {
                        backgroundColor: 'rgba(130, 157, 70, 0.04)',
                      }
                    }}
                  >
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: { xs: 'flex-start', sm: 'center' }, 
                      gap: 2,
                      flexDirection: { xs: 'column', sm: 'row' }
                    }}>
                      {faq.icon}
                      <Typography 
                        variant="h6" 
                        component="h3"
                        sx={{ 
                          fontWeight: 600,
                          fontSize: { xs: '0.95rem', sm: '1rem', md: '1.125rem' },
                          fontFamily: 'inherit',
                          mt: { xs: 1, sm: 0 }
                        }}
                      >
                        {faq.question}
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails
                    sx={{ 
                      px: { xs: 2, sm: 3, md: 4 },
                      py: { xs: 1.5, sm: 2, md: 3 },
                      backgroundColor: 'rgba(130, 157, 70, 0.04)',
                    }}
                  >
                    <Typography 
                      sx={{ 
                        color: 'text.secondary',
                        pl: { xs: 0, sm: 6 },
                        fontFamily: 'inherit',
                        fontSize: { xs: '0.9rem', sm: '1rem' },
                        '& a': {
                          fontFamily: 'inherit'
                        }
                      }}
                    >
                      {faq.answer}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Paper>
            
            {/* Contact Section */}
            <Box 
              sx={{ 
                textAlign: 'center',
                backgroundColor: 'rgba(130, 157, 70, 0.08)',
                py: { xs: 4, md: 5 },
                px: { xs: 2, sm: 3 },
                borderRadius: 2,
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
              }}
            >
              <Typography 
                variant="h5" 
                component="h2"
                sx={{ 
                  fontWeight: 600,
                  mb: 2,
                  fontFamily: 'inherit',
                  fontSize: { xs: '1.25rem', md: '1.5rem' }
                }}
              >
                Still have questions?
              </Typography>
              <Typography 
                sx={{ 
                  mb: 3,
                  maxWidth: '600px',
                  mx: 'auto',
                  fontFamily: 'inherit',
                  fontSize: { xs: '0.9rem', sm: '1rem' }
                }}
              >
                If you couldn't find the answer to your question, please contact us directly and we'll be happy to help.
              </Typography>
              <Box 
                component="a" 
                href="https://wa.me/27788115168"
                target="_blank"
                sx={{
                  display: 'inline-block',
                  backgroundColor: '#829D46',
                  color: 'white',
                  px: { xs: 3, md: 4 },
                  py: { xs: 1.25, md: 1.5 },
                  borderRadius: 1.5,
                  fontWeight: 600,
                  textDecoration: 'none',
                  transition: 'all 0.2s',
                  fontFamily: 'inherit',
                  fontSize: { xs: '0.9rem', md: '1rem' },
                  '&:hover': {
                    backgroundColor: '#6a8035',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                  }
                }}
              >
                Contact Us on WhatsApp
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
