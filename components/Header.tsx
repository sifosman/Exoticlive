"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  AppBar,
  Toolbar,
  Container,
  Button,
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Box,
  Fade,
  Typography
} from '@mui/material';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import PersonIcon from '@mui/icons-material/Person';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { useCart } from '@/lib/cartContext';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import SearchIcon from '@mui/icons-material/Search';
import ProductSearch from './ProductSearch';

// Add this type definition
type Category = {
  id: string;
  name: string;
  slug: string;
};

const categories: Category[] = [
  { id: "dGVybToxNQ==", name: "ALL", slug: "uncategorized" },
  { id: "dGVybToxNDg=", name: "Bags", slug: "bags" },
  
  { id: "dGVybToxNDM=", name: "Boots", slug: "boots" },
  
  { id: "dGVybTozNDI=", name: "Hats", slug: "hats" },
  { id: "dGVybToxNDQ=", name: "Heels", slug: "heels" },
  { id: "dGVybToyODk=", name: "Mens", slug: "mens" },
  
  { id: "dGVybToxNDY=", name: "Pumps", slug: "pumps" },
  { id: "dGVybToxNDU=", name: "Sandals", slug: "sandals" },
  { id: "dGVybToxNDc=", name: "Takkies", slug: "takkies" },
  
];

const Header = () => {
  const { cart } = useCart();
  const router = useRouter();
  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [shopAnchorEl, setShopAnchorEl] = useState<null | HTMLElement>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleShopMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setShopAnchorEl(event.currentTarget);
  };

  const handleShopMenuClose = () => {
    setShopAnchorEl(null);
  };

  return (
    <>
      {/* Notification Bar - hidden when scrolled */}
      <Box
        sx={{
          position: 'fixed',
          width: '100%',
          height: '30px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 4,
          zIndex: 1201,
          transition: 'transform 0.3s ease',
          transform: isScrolled ? 'translateY(-100%)' : 'translateY(0)',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: 'url("/notification-bg.webp")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.9,
            zIndex: -1
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: '-100%',
            right: 0,
            bottom: 0,
            background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 25%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.3) 75%, rgba(255,255,255,0) 100%)',
            animation: 'shimmer 3s infinite linear',
            zIndex: 0
          },
          '@keyframes shimmer': {
            '0%': { transform: 'translateX(0%)' },
            '100%': { transform: 'translateX(100%)' }
          }
        }}
      >
        <Box
          sx={{
            px: 2.5,
            py: 0.75,
            borderRadius: 1,
            display: 'inline-flex',
            alignItems: 'center',
            position: 'relative',
            zIndex: 1
          }}
        >
          <Typography
            sx={{
              color: 'white',
              fontFamily: 'Playfair Display, serif',
              fontSize: { xs: '0.8rem', sm: '0.9rem' },
              letterSpacing: '0.05em',
              whiteSpace: 'nowrap',
              overflow: 'hidden'
            }}
          >
            Exotic Shoes - Summer Sale!
          </Typography>
        </Box>

        {/* Social Media Icons */}
        <Box 
          sx={{ 
            position: 'absolute',
            right: 4,
            display: 'flex',
            gap: 1 
          }}
        >
          <Link 
            href="https://facebook.com/yourpage" 
            target="_blank"
            style={{ textDecoration: 'none' }}
          >
            <Box
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(8px)',
                borderRadius: '50%',
                width: 28,
                height: 28,
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
              <FacebookIcon sx={{ color: 'white', fontSize: 18 }} />
            </Box>
          </Link>

          <Link 
            href="https://instagram.com/yourpage" 
            target="_blank"
            style={{ textDecoration: 'none' }}
          >
            <Box
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(8px)',
                borderRadius: '50%',
                width: 28,
                height: 28,
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
              <InstagramIcon sx={{ color: 'white', fontSize: 18 }} />
            </Box>
          </Link>
        </Box>
      </Box>

      {/* Updated AppBar */}
      <AppBar 
        position="fixed" 
        sx={{
          top: 0,
          transform: isScrolled ? 'translateY(0)' : 'translateY(40px)',
          bgcolor: isScrolled ? 'rgba(255, 255, 255, 0.95)' : 'transparent',
          backdropFilter: isScrolled ? 'blur(8px)' : 'none',
          boxShadow: isScrolled ? '0px 2px 8px rgba(0,0,0,0.1)' : 'none',
          transition: 'all 0.3s',
          zIndex: 1200,
          '& .MuiButton-root, & .MuiIconButton-root': {
            color: isScrolled ? '#000' : '#000'
          }
        }}
      >
        <Container maxWidth="lg">
          <Toolbar 
            sx={{ 
              justifyContent: 'space-between', 
              height: 72,
              minHeight: '72px !important'
            }}
          >
            <Link href="/">
              <Image
                src="/cropped-logo11.png"
                alt="Your Logo"
                width={320}
                height={100}
                priority
                style={{
                  height: 60,
                  width: 'auto',
                  transition: 'transform 0.3s',
                  cursor: 'pointer'
                }}
              />
            </Link>

            <Box sx={{ display: { xs: 'none', lg: 'flex' }, gap: 4 }}>
              {['Home', 'Shop Now', 'Order Tracking', 'About Us'].map((item) => (
                <Box key={item}>
                  <Button
                    color="inherit"
                    onClick={(event) => {
                      if (item === 'Home') {
                        router.push('/');
                      } else if (item === 'About Us') {
                        router.push('/about');
                      } else if (item === 'Shop Now') {
                        handleShopMenuOpen(event);
                      }
                    }}
                    endIcon={item === 'Shop Now' ? <KeyboardArrowDownIcon /> : null}
                    sx={{
                      fontFamily: 'Lato, sans-serif',
                      fontWeight: 400,
                      letterSpacing: '0.05em',
                      color: 'black',
                      '&:hover': {
                        backgroundColor: 'transparent',
                        opacity: 0.7
                      }
                    }}
                  >
                    {item}
                  </Button>
                  {item === 'Shop Now' && (
                    <Menu
                      anchorEl={shopAnchorEl}
                      open={Boolean(shopAnchorEl)}
                      onClose={handleShopMenuClose}
                      TransitionComponent={Fade}
                      PaperProps={{
                        elevation: 3,
                        sx: { 
                          mt: 1, 
                          minWidth: 200,
                          '& .MuiMenuItem-root': {
                            fontFamily: 'Lato, sans-serif',
                            fontWeight: 500,
                            letterSpacing: '0.05em',
                            color: 'black',
                            '&:hover': {
                              backgroundColor: 'rgba(0, 0, 0, 0.04)'
                            }
                          }
                        }
                      }}
                    >
                      {categories.map((category) => (
                        <MenuItem 
                          key={category.id}
                          onClick={() => {
                            router.push(`/products?category=${category.slug}`);
                            handleShopMenuClose();
                          }}
                        >
                          {category.name}
                        </MenuItem>
                      ))}
                    </Menu>
                  )}
                </Box>
              ))}
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <IconButton 
                color="inherit"
                onClick={() => setIsSearchOpen(true)}
              >
                <SearchIcon />
              </IconButton>

              <IconButton 
                component={Link} 
                href="/cart"
                color="inherit"
              >
                <Badge badgeContent={cartItemsCount} color="error">
                  <ShoppingBagIcon />
                </Badge>
              </IconButton>
              
              <IconButton
                color="inherit"
                onClick={() => router.push('/account')}
              >
                <PersonIcon />
              </IconButton>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>
      
      {/* Remove the spacing box and replace with minimal spacing */}
      <Box sx={{ height: { xs: 50, sm: 50 } }} />

      <ProductSearch 
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </>
  );
};

export default Header;
