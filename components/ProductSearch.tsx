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
import { PRODUCT_FIELDS } from '../graphql/fragments';

const SEARCH_PRODUCTS = gql`
  query SearchProducts($search: String!) {
    products(where: { search: $search }, first: 10) {
      nodes {
        ...ProductFields
      }
    }
  }
  ${PRODUCT_FIELDS}
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
        <Box sx={{ 
          position: 'relative', 
          width: '100%', 
          height: { xs: 150, sm: 200 }
        }}>
          <Image
            src="/search-header.webp"
            alt="Search Header"
            fill
            style={{ objectFit: 'cover' }}
          />
          <Box sx={{ 
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
            padding: { xs: 2, sm: 3 }
          }}>
            <Typography 
              variant="h5"
              sx={{ 
                color: 'white',
                fontFamily: 'Lato, sans-serif',
                mb: 2,
                textAlign: 'center',
                fontWeight: 500,
                fontSize: { xs: '1.25rem', sm: '1.5rem' }
              }}
            >
              Search Products
            </Typography>
          </Box>
          <IconButton 
            onClick={onClose}
            sx={{ 
              position: 'absolute',
              top: { xs: 8, sm: 16 },
              right: { xs: 8, sm: 16 },
              color: 'white',
              bgcolor: 'rgba(255,255,255,0.1)',
              padding: { xs: '4px', sm: '8px' },
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.2)'
              }
            }}
          >
            <CloseIcon sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }} />
          </IconButton>
        </Box>

        {/* Search Input */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 3 },
            bgcolor: 'transparent'
          }}
        >
          <Paper
            elevation={0}
            sx={{
              p: { xs: 1.5, sm: 2 },
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
                  <SearchIcon sx={{ 
                    color: 'text.secondary',
                    fontSize: { xs: '1.25rem', sm: '1.5rem' }
                  }} />
                </InputAdornment>
              }
              sx={{
                fontFamily: 'Lato, sans-serif',
                fontSize: { xs: '0.9rem', sm: '1.1rem' },
                '& input': {
                  padding: { xs: '2px 6px', sm: '4px 8px' }
                }
              }}
            />
          </Paper>
        </Paper>

        {/* Results */}
        <Box sx={{ flexGrow: 1, overflow: 'auto', px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 3 } }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <CircularProgress size={32} />
            </Box>
          ) : (
            <List sx={{ pt: 0 }}>
              {searchResults.map((product: any) => (
                <Paper
                  key={product.id}
                  elevation={0}
                  sx={{
                    mb: { xs: 1.5, sm: 2 },
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
                    sx={{ p: { xs: 1.5, sm: 2 } }}
                  >
                    <ListItemAvatar>
                      <Avatar 
                        sx={{ 
                          width: { xs: 60, sm: 80 },
                          height: { xs: 60, sm: 80 },
                          borderRadius: 2,
                          mr: { xs: 1.5, sm: 2 },
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
                          fontFamily: 'Lato, sans-serif',
                          fontWeight: 600,
                          fontSize: { xs: '0.9rem', sm: '1.1rem' },
                          mb: 0.5
                        }
                      }}
                      secondaryTypographyProps={{
                        sx: { 
                          color: 'primary.main',
                          fontWeight: 600,
                          fontSize: { xs: '0.85rem', sm: '1rem' },
                          fontFamily: 'Lato, sans-serif'
                        }
                      }}
                    />
                  </ListItem>
                </Paper>
              ))}
              {searchQuery.length >= 2 && searchResults.length === 0 && !loading && (
                <Box sx={{ 
                  textAlign: 'center',
                  mt: { xs: 4, sm: 8 },
                  color: 'text.secondary',
                  p: { xs: 2, sm: 3 }
                }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      mb: 1,
                      fontFamily: 'Lato, sans-serif',
                      fontSize: { xs: '1rem', sm: '1.25rem' }
                    }}
                  >
                    No products found
                  </Typography>
                  <Typography 
                    variant="body2"
                    sx={{
                      fontFamily: 'Lato, sans-serif',
                      fontSize: { xs: '0.875rem', sm: '1rem' }
                    }}
                  >
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