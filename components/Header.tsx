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
  Typography,
  Drawer,
  BottomNavigation,
  BottomNavigationAction
} from '@mui/material';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import PersonIcon from '@mui/icons-material/Person';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { useCart } from '@/lib/cartContext';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import SearchIcon from '@mui/icons-material/Search';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import ProductSearch from './ProductSearch';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import HomeIcon from '@mui/icons-material/Home';
import CategoryIcon from '@mui/icons-material/Category';

// Add this type definition
type Category = {
  id: string;
  name: string;
  slug: string;
};

const categories: Category[] = [
  { id: "dGVybToxNDg=", name: "Bags", slug: "bags" },
  { id: "dGVybToxNDM=", name: "Boots", slug: "boots" },
  { id: "dGVybToxNDQ=", name: "Heels", slug: "heels" },
  { id: "dGVybToyODk=", name: "Mens", slug: "mens" },
  { id: "dGVybToxNDY=", name: "Pumps", slug: "pumps" },
  { id: "dGVybToxNDU=", name: "Sandals", slug: "sandals" },
  { id: "dGVybToxNDc=", name: "Takkies", slug: "takkies" },
  { id: "dGVybToxNDk=", name: "Bargain Box", slug: "bargain-box" },
];

const Header = () => {
  const { cart } = useCart();
  const router = useRouter();
  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [shopAnchorEl, setShopAnchorEl] = useState<null | HTMLElement>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [categoryAnchorEl, setCategoryAnchorEl] = useState<null | HTMLElement>(null);

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

  const handleCategoryClick = (event: React.MouseEvent<HTMLElement>) => {
    setCategoryAnchorEl(event.currentTarget);
  };

  const handleCategoryClose = () => {
    setCategoryAnchorEl(null);
  };

  const handleCategorySelect = (slug: string) => {
    router.push(`/products?category=${slug}`);
    handleCategoryClose();
  };

  const MobileBottomNav = () => (
    <>
      <BottomNavigation
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 65,
          backgroundColor: 'black',
          zIndex: 1200,
          display: { xs: 'flex', lg: 'none' },
          '& .MuiBottomNavigationAction-root': {
            color: 'rgba(255, 255, 255, 0.7)',
            '&.Mui-selected': {
              color: 'white',
            },
          },
        }}
      >
        <BottomNavigationAction
          label="Home"
          icon={<HomeIcon />}
          onClick={() => router.push('/')}
        />
        <BottomNavigationAction
          label="Search"
          icon={<SearchIcon />}
          onClick={() => setIsSearchOpen(true)}
        />
        <BottomNavigationAction
          label="Categories"
          icon={<CategoryIcon />}
          onClick={handleCategoryClick}
        />
        <BottomNavigationAction
          label="Cart"
          icon={
            <Badge badgeContent={cartItemsCount} color="error">
              <ShoppingBagIcon />
            </Badge>
          }
          onClick={() => router.push('/cart')}
        />
        <BottomNavigationAction
          label="WhatsApp"
          icon={<WhatsAppIcon />}
          onClick={() => window.open('https://wa.link/01atgb', '_blank')}
          sx={{
            '& .MuiSvgIcon-root': {
              color: 'white',
            }
          }}
        />
      </BottomNavigation>

      <Menu
        anchorEl={categoryAnchorEl}
        open={Boolean(categoryAnchorEl)}
        onClose={handleCategoryClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        PaperProps={{
          sx: {
            mt: -7,
            width: '100%',
            maxWidth: '100%',
            left: '0 !important',
            right: '0 !important',
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            backdropFilter: 'blur(10px)',
            color: 'white',
            borderTopLeftRadius: '20px',
            borderTopRightRadius: '20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0px -4px 20px rgba(0, 0, 0, 0.3)',
            padding: '16px 0',
            '& .MuiList-root': {
              padding: '8px 0',
            },
            '& .MuiMenuItem-root': {
              justifyContent: 'center',
              fontFamily: 'Lato, sans-serif',
              fontSize: '1.2rem',
              letterSpacing: '0.5px',
              padding: '16px',
              margin: '4px 16px',
              borderRadius: '12px',
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                transform: 'scale(1.02)',
              },
              '&:active': {
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                transform: 'scale(0.98)',
              },
            },
          },
        }}
        TransitionProps={{
          timeout: 400,
        }}
        BackdropProps={{
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
          },
        }}
      >
        <Typography
          sx={{
            fontFamily: 'Lato, sans-serif',
            fontSize: '1.4rem',
            fontWeight: 300,
            textAlign: 'center',
            color: 'rgba(255, 255, 255, 0.9)',
            margin: '8px 0 16px',
            letterSpacing: '1px',
          }}
        >
          Categories
        </Typography>
        {categories.map((category) => (
          <MenuItem key={category.id} onClick={() => handleCategorySelect(category.slug)}>
            {category.name}
          </MenuItem>
        ))}
      </Menu>
    </>
  );

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
            Delivery Available Nationwide!
          </Typography>
        </Box>

        {/* Social Media Icons */}
        <Box 
          sx={{ 
            position: 'absolute',
            right: 4,
            display: 'flex',
            gap: 1,
            zIndex: 2  
          }}
        >
          <a 
            href="https://www.instagram.com/exotic_shoes_wholesale/?hl=en" 
            target="_blank"
            rel="noopener noreferrer"
            style={{ 
              textDecoration: 'none',
              display: 'block',  
              cursor: 'pointer'  
            }}
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
                position: 'relative',  
                zIndex: 2,  
                cursor: 'pointer',  
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                  transform: 'scale(1.1)'
                }
              }}
            >
              <InstagramIcon sx={{ color: 'white', fontSize: 18, pointerEvents: 'none' }} />
            </Box>
          </a>
        </Box>
      </Box>

      {/* Updated AppBar */}
      <AppBar 
        position="fixed" 
        sx={{
          top: 0,
          transform: isScrolled ? 'translateY(0)' : 'translateY(0)',
          bgcolor: isScrolled ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: isScrolled ? 'blur(8px)' : 'blur(8px)',
          boxShadow: isScrolled ? '0px 2px 8px rgba(0,0,0,0.1)' : 'none',
          transition: 'all 0.3s',
          zIndex: 1200,
          '& .MuiButton-root, & .MuiIconButton-root': {
            color: '#000'
          }
        }}
      >
        <Container maxWidth="lg">
          <Toolbar 
            sx={{ 
              justifyContent: 'space-between', 
              height: 100,
              minHeight: '100px !important'
            }}
          >
            {/* Logo - now consistently on the left */}
            <Link href="/">
              <Image
                src="/cropped-logo11.png"
                alt="Your Logo"
                width={500}
                height={156}
                priority
                style={{
                  height: 95,
                  width: 'auto',
                  transition: 'transform 0.3s',
                  cursor: 'pointer'
                }}
              />
            </Link>

            {/* Desktop Menu - hidden on mobile */}
            <Box sx={{ display: { xs: 'none', lg: 'flex' }, gap: 4 }}>
              {['Home', 'Shop Now', 'About Us'].map((item) => (
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

            {/* Desktop Icons - hidden on mobile */}
            <Box sx={{ display: { xs: 'none', lg: 'flex' }, gap: 2 }}>
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

            {/* Mobile Menu Icon - now on the right */}
            <IconButton
              sx={{ display: { xs: 'flex', lg: 'none' } }}
              onClick={() => setMobileMenuOpen(true)}
            >
              <MenuIcon />
            </IconButton>
          </Toolbar>
        </Container>
      </AppBar>
      
      {/* Mobile Menu Drawer */}
      <Drawer
        anchor="left"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        PaperProps={{
          sx: {
            width: '80%',
            maxWidth: 300,
            pt: 2,
            pb: 4,
          },
        }}
        BackdropProps={{
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
          },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <IconButton onClick={() => setMobileMenuOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>
        
        <Box sx={{ px: 2 }}>
          {['Home', 'Shop Now', 'About Us'].map((item) => (
            <MenuItem
              key={item}
              onClick={() => {
                if (item === 'Home') router.push('/');
                else if (item === 'About Us') router.push('/about');
                else if (item === 'Shop Now') {
                  // Handle shop menu differently in mobile
                  setMobileMenuOpen(false);
                  router.push('/products');
                }
                setMobileMenuOpen(false);
              }}
              sx={{
                py: 2,
                fontFamily: 'Lato, sans-serif',
                fontWeight: 500,
              }}
            >
              {item}
            </MenuItem>
          ))}
          
          {/* Categories submenu */}
          <Box sx={{ mt: 2, borderTop: '1px solid rgba(0,0,0,0.1)', pt: 2 }}>
            <Typography variant="subtitle2" sx={{ px: 2, mb: 1, color: 'text.secondary' }}>
              Categories
            </Typography>
            {categories.map((category) => (
              <MenuItem
                key={category.id}
                onClick={() => {
                  router.push(`/products?category=${category.slug}`);
                  setMobileMenuOpen(false);
                }}
                sx={{ py: 1.5 }}
              >
                {category.name}
              </MenuItem>
            ))}
          </Box>
        </Box>
      </Drawer>

      <MobileBottomNav />

      {/* Adjust spacing to account for bottom navigation on mobile */}
      <Box sx={{ height: { xs: 115, lg: 50 } }} />

      <ProductSearch 
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </>
  );
};

export default Header;
