"use client";

import { useState, useEffect } from 'react';
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
  InputAdornment,
  Divider,
  useTheme,
  alpha,
  Fade
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useDebounce } from '../hooks/useDebounce';
import { searchProducts, Product as TypesenseProduct } from '../utils/typesense-search';
import { motion } from 'framer-motion';

interface ProductSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProductSearchTypesense = ({ isOpen, onClose }: ProductSearchProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm] = useDebounce(searchTerm, 300);
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<TypesenseProduct[]>([]);
  const router = useRouter();
  const theme = useTheme();

  // Perform search when debounced term changes
  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedTerm) {
        setSearchResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const results = await searchProducts({
          q: debouncedTerm,
          query_by: 'name,description',
          per_page: 10,
        });
        setSearchResults(results.products);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    performSearch();
  }, [debouncedTerm]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleProductClick = (slug: string) => {
    router.push(`/product/${slug}`);
    onClose();
  };

  const formatPrice = (price: number | null | undefined) => {
    if (price === null || price === undefined) return 'Price not available';
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(price);
  };

  // Clear search when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setSearchTerm('');
        setSearchResults([]);
      }, 300);
    }
  }, [isOpen]);

  return (
    <Drawer
      anchor="right"
      open={isOpen}
      onClose={onClose}
      transitionDuration={400}
      PaperProps={{
        sx: { 
          width: { xs: '100%', sm: '450px', md: '500px' },
          backgroundImage: 'linear-gradient(to bottom, #ffffff, #fcfcfc, #f9f9f9)',
          boxShadow: '0 0 30px rgba(0, 0, 0, 0.15)',
          overflow: 'hidden',
          borderLeft: '1px solid rgba(0, 0, 0, 0.05)'
        }
      }}
      ModalProps={{
        BackdropProps: {
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(3px)'
          }
        }
      }}
    >
      <Box>
        {/* Header with decorative design element */}
        <Box
          sx={{ 
            position: 'relative',
            p: { xs: 2, md: 3 }, 
            pb: { xs: 3, md: 4 },
            backgroundImage: 'url("/search-header.webp")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            '&::after': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 100%)',
              zIndex: 0
            }
          }}
        >
          <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography 
              variant="h5" 
              sx={{ 
                color: 'white',
                fontFamily: 'Playfair Display, serif',
                fontWeight: 600,
                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}
            >
              Search Products
            </Typography>
            <IconButton 
              onClick={onClose} 
              size="large"
              sx={{ 
                color: 'white',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.15)'
                }
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Enhanced search input */}
          <Paper
            component="form"
            elevation={5}
            sx={{
              p: '2px 8px',
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              mt: 3,
              borderRadius: '8px',
              backgroundColor: alpha('#fff', 0.95),
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              position: 'relative',
              zIndex: 1,
              transition: 'all 0.3s ease'
            }}
          >
            <InputBase
              sx={{ 
                ml: 1, 
                flex: 1,
                py: 1.2,
                fontFamily: 'Lato, sans-serif',
                fontSize: '1rem'
              }}
              placeholder="Search for shoes, boots, heels..."
              value={searchTerm}
              onChange={handleSearchChange}
              autoFocus={isOpen}
              startAdornment={
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: theme.palette.grey[600] }} />
                </InputAdornment>
              }
              endAdornment={
                searchTerm && (
                  <InputAdornment position="end">
                    <IconButton 
                      size="small" 
                      onClick={() => setSearchTerm('')}
                      sx={{ mr: -0.5 }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                )
              }
            />
            {isLoading && (
              <Fade in={isLoading}>
                <CircularProgress size={22} thickness={4} sx={{ mr: 1, color: theme.palette.grey[600] }} />
              </Fade>
            )}
          </Paper>
        </Box>

        <Divider />

        {/* Search results */}
        <Box sx={{ height: 'calc(100vh - 180px)', overflowY: 'auto' }}>
          <List sx={{ width: '100%', p: { xs: 1, sm: 2 } }}>
            {searchResults.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <ListItem
                  alignItems="flex-start"
                  button
                  onClick={() => handleProductClick(product.slug)}
                  sx={{
                    mb: 1.5,
                    borderRadius: '8px',
                    overflow: 'hidden',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    '&:hover': {
                      backgroundColor: 'rgba(0,0,0,0.02)',
                      boxShadow: '0 3px 10px rgba(0,0,0,0.1)',
                      '& .arrow-icon': {
                        transform: 'translateX(4px)',
                        opacity: 1
                      }
                    },
                  }}
                >
                  <ListItemAvatar>
                    <Avatar 
                      variant="rounded" 
                      sx={{ 
                        width: 70, 
                        height: 70,
                        borderRadius: '6px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.1)' 
                      }}
                    >
                      {product.image_url ? (
                        <Image
                          src={product.image_url}
                          alt={product.image_alt || product.name}
                          fill
                          style={{ objectFit: 'cover' }}
                          sizes="70px"
                        />
                      ) : (
                        <Box
                          sx={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'grey.100',
                          }}
                        >
                          No image
                        </Box>
                      )}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography 
                        component="h3" 
                        sx={{
                          fontFamily: 'Lato, sans-serif',
                          fontWeight: 500,
                          fontSize: '1rem',
                          lineHeight: 1.3,
                          mb: 0.5,
                          color: 'text.primary'
                        }}
                      >
                        {product.name}
                      </Typography>
                    }
                    secondary={
                      <>
                        <Typography
                          component="span"
                          variant="body2"
                          sx={{ 
                            display: 'block',
                            mb: 0.5,
                            fontFamily: 'Lato, sans-serif',
                            fontWeight: 700,
                          }}
                        >
                          {product.sale_price ? (
                            <>
                              <span style={{ color: '#d32f2f', fontSize: '0.95rem' }}>
                                {formatPrice(product.sale_price)}
                              </span>
                              <span style={{ 
                                textDecoration: 'line-through', 
                                color: 'text.secondary',
                                marginLeft: '10px',
                                fontSize: '0.85rem',
                                fontWeight: 400
                              }}>
                                {formatPrice(product.price)}
                              </span>
                            </>
                          ) : (
                            <span style={{ color: '#333', fontSize: '0.95rem' }}>
                              {formatPrice(product.price)}
                            </span>
                          )}
                        </Typography>
                        {product.description && (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              fontSize: '0.8rem',
                              opacity: 0.8
                            }}
                          >
                            {product.description.slice(0, 80)}
                            {product.description.length > 80 ? '...' : ''}
                          </Typography>
                        )}
                      </>
                    }
                    sx={{ ml: 2 }}
                  />
                  <ArrowForwardIcon className="arrow-icon" sx={{ 
                    ml: 1, 
                    opacity: 0.3, 
                    transition: 'all 0.3s ease',
                    alignSelf: 'center'
                  }} />
                </ListItem>
              </motion.div>
            ))}

            {debouncedTerm && !isLoading && searchResults.length === 0 && (
              <Box sx={{ 
                p: 5, 
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Box sx={{ opacity: 0.7, mb: 2 }}>
                  <SearchIcon sx={{ fontSize: '4rem', color: theme.palette.grey[400] }} />
                </Box>
                <Typography 
                  sx={{ 
                    color: theme.palette.grey[600],
                    fontFamily: 'Lato, sans-serif',
                    fontSize: '1.1rem',
                    mb: 1
                  }}
                >
                  No products found
                </Typography>
                <Typography 
                  sx={{ 
                    color: theme.palette.grey[500],
                    fontFamily: 'Lato, sans-serif',
                    fontSize: '0.9rem'
                  }}
                >
                  Try different keywords or browse categories
                </Typography>
              </Box>
            )}

            {!debouncedTerm && !searchResults.length && (
              <Box sx={{ 
                p: 5, 
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Typography 
                  sx={{ 
                    color: theme.palette.grey[600],
                    fontFamily: 'Lato, sans-serif',
                    fontSize: '1.1rem',
                    mb: 1
                  }}
                >
                  Start typing to search products
                </Typography>
                <Typography 
                  sx={{ 
                    color: theme.palette.grey[500],
                    fontFamily: 'Lato, sans-serif',
                    fontSize: '0.9rem'
                  }}
                >
                  Search by name, brand, or description
                </Typography>
              </Box>
            )}
          </List>
        </Box>
      </Box>
    </Drawer>
  );
};

export default ProductSearchTypesense;
