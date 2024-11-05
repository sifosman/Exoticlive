'use client';
import Image from 'next/image'
import Link from 'next/link'
import { 
  Card, 
  CardContent as MuiCardContent, 
  CardActions, 
  Typography, 
  Button, 
  Chip, 
  Box 
} from '@mui/material'
import { Product } from '@/@types/graphql';

interface ProductCardProps {
  product: Product & {
    variationId?: string;
    categories?: {
      nodes?: {
        slug: string;
      }[];
    };
    __typename?: 'SimpleProduct' | 'VariableProduct';
  };
  index: number;
}

const formatPrice = (price: string | null | undefined, productName?: string, productType?: string) => {
  if (!price) {
    if (productName?.includes('Variable') || productType === 'VariableProduct') {
      return 'Price varies';
    }
    console.warn(`No price found for product: ${productName || 'Unknown'}`);
    return 'Price not available';
  }
  const normalizedPrice = price.replace(/[^0-9.,]/g, '').replace(',', '.');
  const numPrice = parseFloat(normalizedPrice);
  return `R${numPrice.toFixed(2)}`;
};

export default function ProductCard({ product, index }: ProductCardProps) {
  console.log('Product Price Data:', {
    name: product.name,
    price: product.price,
    regularPrice: product.regularPrice,
    salePrice: product.salePrice,
    type: product.__typename
  });

  if (!product) {
    console.error("Product is undefined or null")
    return null
  }

  const isValidImageUrl = (url: string) => {
    try {
      new URL(url)
      return true
    } catch (error) {
      return false
    }
  }

  const imageUrl = isValidImageUrl(product.image?.sourceUrl)
    ? product.image.sourceUrl
    : 'https://wp.exoticshoes.co.za/wp-content/uploads/2021/09/cropped-logo11.png'

  return (
    <Card 
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s',
        '&:hover': {
          boxShadow: 6,
          transform: 'translateY(-4px)'
        }
      }}
    >
      <Link href={`/product/${product.slug}`} style={{ textDecoration: 'none' }}>
        <Box 
          sx={{ 
            position: 'relative',
            width: '100%',
            height: 'auto',
            aspectRatio: '1/1',
            overflow: 'hidden'
          }}
        >
          <Image
            src={product.image?.sourceUrl || 'https://www.exoticshoes.co.za/wp-content/uploads/2021/09/cropped-logo11.png'}
            alt={product.name || 'Product Image'}
            fill
            style={{
              objectFit: 'contain',
              transition: 'transform 0.3s ease'
            }}
            priority={index < 4}
            loading={index < 4 ? "eager" : "lazy"}
          />
        </Box>
      </Link>

      <MuiCardContent sx={{ flexGrow: 1, p: 2 }}>
        <Link href={`/product/${product.slug}`} style={{ textDecoration: 'none' }}>
          <Typography 
            variant="h6" 
            component="h3"
            sx={{
              fontFamily: 'Lato, sans-serif',
              fontSize: '1rem',
              fontWeight: 600,
              mb: 1,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              color: 'text.primary',
              '&:hover': {
                textDecoration: 'underline'
              }
            }}
          >
            {product.name}
          </Typography>
        </Link>
        
        <Typography 
          variant="body1" 
          color="text.secondary"
          sx={{
            fontFamily: 'Nunito Sans, sans-serif'
          }}
        >
          {product.__typename === 'SimpleProduct' 
            ? formatPrice(product.price, product.name, product.__typename)
            : formatPrice(product.regularPrice || product.price, product.name, product.__typename)}
        </Typography>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
          {product.categories?.nodes?.map((category, index) => (
            <Chip
              key={index}
              label={category.slug}
              size="small"
              variant="outlined"
              sx={{ borderRadius: 1 }}
            />
          ))}
        </Box>
      </MuiCardContent>

      <CardActions sx={{ p: 2, pt: 0 }}>
        <Button
          component={Link}
          href={`/product/${product.slug}`}
          variant="contained"
          fullWidth
          sx={{
            position: 'relative',
            overflow: 'hidden',
            color: 'white',
            fontSize: { xs: '0.6rem', sm: '0.7rem' },
            textAlign: 'center',
            justifyContent: 'center',
            fontFamily: 'Lato, sans-serif',
            padding: { xs: '4px 8px', sm: '6px 16px' },
            minHeight: { xs: '24px', sm: '36px' },
            border: '1px solid rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(8px)',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `linear-gradient(
                90deg,
                #3D6660,
                #669492,
                #254843,
                #3D6660
              )`,
              backgroundSize: '300% 100%',
              zIndex: -1,
              animation: 'gradientMove 15s ease infinite',
            },
            '@keyframes gradientMove': {
              '0%': {
                backgroundPosition: '0% 50%'
              },
              '50%': {
                backgroundPosition: '100% 50%'
              },
              '100%': {
                backgroundPosition: '0% 50%'
              }
            },
            '&:hover': {
              bgcolor: 'transparent',
              '&::before': {
                animation: 'gradientMove 8s ease infinite',
              }
            }
          }}
        >
          View Product
        </Button>
      </CardActions>
    </Card>
  )
}
