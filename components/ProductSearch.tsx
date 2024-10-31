"use client";

import { useState } from 'react';
import { 
  Drawer, 
  IconButton, 
  InputBase, 
  Box, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemAvatar,
  Avatar,
  Typography,
  CircularProgress,
  Paper,
  InputAdornment
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useQuery, gql } from '@apollo/client';

const SEARCH_PRODUCTS = gql`
  query SearchProducts($search: String!) {
    products(where: { search: $search }, first: 10) {
      nodes {
        ... on SimpleProduct {
          id
          slug
          name
          price
          image {
            sourceUrl
          }
        }
        ... on VariableProduct {
          id
          slug
          name
          price
          image {
            sourceUrl
          }
        }
      }
    }
  }
`;

interface ProductSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProductSearch = ({ isOpen, onClose }: ProductSearchProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const { loading, data } = useQuery(SEARCH_PRODUCTS, {
    variables: { search: searchQuery },
    skip: searchQuery.length < 2,
  });

  const handleProductClick = (slug: string) => {
    router.push(`/product/${slug}`);
    onClose();
    setSearchQuery('');
  };

  const searchResults = data?.products?.nodes || [];

  return (
    <Drawer
      anchor="right"
      open={isOpen}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 450 },
          bgcolor: '#ffffff',
          zIndex: 1300
        }
      }}
      sx={{
        zIndex: '1300 !important'
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header Image */}
        <Box sx={{ position: 'relative', width: '100%', height: 200 }}>
          <Image
            src="/search-header.webp" // Add your header image
            alt="Search Header"
            fill
            style={{ objectFit: 'cover' }}
          />
          <Box 
            sx={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              bgcolor: 'rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              padding: 3
            }}
          >
            <Typography 
              variant="h5" // Changed from h4 to h5
              sx={{ 
                color: 'white',
                fontFamily: 'Lato', // Changed from Playfair Display to Lato
                mb: 2,
                textAlign: 'center',
                fontWeight: 500 // Added for better readability
              }}
            >
              Search Products
            </Typography>
          </Box>
          <IconButton 
            onClick={onClose}
            sx={{ 
              position: 'absolute',
              top: 16,
              right: 16,
              color: 'white',
              bgcolor: 'rgba(255,255,255,0.1)',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.2)'
              }
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Search Input */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            bgcolor: 'transparent'
          }}
        >
          <Paper
            elevation={0}
            sx={{
              p: 2,
              display: 'flex',
              alignItems: 'center',
              border: '1px solid #e0e0e0',
              borderRadius: 2,
              bgcolor: 'white'
            }}
          >
            <InputBase
              autoFocus
              placeholder="Search for products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              fullWidth
              startAdornment={
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              }
              sx={{
                fontSize: '1.1rem',
                '& input': {
                  padding: '4px 8px'
                }
              }}
            />
          </Paper>
        </Paper>

        {/* Results */}
        <Box sx={{ flexGrow: 1, overflow: 'auto', px: 3, pb: 3 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <CircularProgress size={40} />
            </Box>
          ) : (
            <List sx={{ pt: 0 }}>
              {searchResults.map((product: any) => (
                <Paper
                  key={product.id}
                  elevation={0}
                  sx={{
                    mb: 2,
                    overflow: 'hidden',
                    transition: 'all 0.3s',
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: 'white',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }
                  }}
                >
                  <ListItem 
                    onClick={() => handleProductClick(product.slug)}
                    sx={{ p: 2 }}
                  >
                    <ListItemAvatar>
                      <Avatar 
                        sx={{ 
                          width: 80, 
                          height: 80, 
                          borderRadius: 2,
                          mr: 2,
                          bgcolor: 'white'
                        }}
                      >
                        {product.image && (
                          <Image
                            src={product.image.sourceUrl}
                            alt={product.name}
                            fill
                            style={{ objectFit: 'contain' }}
                          />
                        )}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={product.name}
                      secondary={product.price}
                      primaryTypographyProps={{
                        sx: { 
                          fontFamily: 'Lato',
                          fontWeight: 600,
                          fontSize: '1.1rem',
                          mb: 0.5
                        }
                      }}
                      secondaryTypographyProps={{
                        sx: { 
                          color: 'primary.main',
                          fontWeight: 600,
                          fontSize: '1rem'
                        }
                      }}
                    />
                  </ListItem>
                </Paper>
              ))}
              {searchQuery.length >= 2 && searchResults.length === 0 && !loading && (
                <Box 
                  sx={{ 
                    textAlign: 'center',
                    mt: 8,
                    color: 'text.secondary',
                    p: 3
                  }}
                >
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    No products found
                  </Typography>
                  <Typography variant="body2">
                    Try different keywords or browse our categories
                  </Typography>
                </Box>
              )}
            </List>
          )}
        </Box>
      </Box>
    </Drawer>
  );
};

export default ProductSearch;