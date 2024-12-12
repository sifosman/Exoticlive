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
    <Link href={`/product/${product.slug}`} className="block w-full">
      <Card 
        sx={{ 
          maxWidth: 345, 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          backgroundColor: 'white',
          '& .MuiTypography-root': {
            fontFamily: 'Lato, sans-serif'
          }
        }}
      >
        <Box 
          sx={{ 
            position: 'relative',
            width: '100%',
            aspectRatio: '1/1',  
            overflow: 'hidden',
            '&:hover img': {
              transform: 'scale(1.05)',
              transition: 'transform 0.3s ease'
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0)',
              transition: 'background 0.3s ease',
            },
            '&:hover::after': {
              background: 'rgba(0, 0, 0, 0.1)',
            }
          }}
        >
          <Image
            src={product.image?.sourceUrl || 'https://wp.exoticshoes.co.za/wp-content/uploads/2021/09/cropped-logo11.png'}
            alt={product.name || 'Product Image'}
            fill
            style={{
              objectFit: 'contain',
              transition: 'transform 0.3s ease',
              padding: '16px', 
              background: 'white'
            }}
            sizes="(max-width: 640px) 95vw, (max-width: 1024px) 45vw, 30vw" 
            quality={90} 
            loading={index < 8 ? "eager" : "lazy"} 
          />
        </Box>

        <div className="p-4">
          <h3 className="font-lato text-lg font-medium text-gray-900 mb-2 line-clamp-2 min-h-[3.5rem]">{product.name}</h3>
          <div className="flex justify-between items-end">
            <div className="font-lato">
              {product.onSale && product.regularPrice && (
                <span className="text-sm line-through text-gray-500 mr-2">
                  {product.regularPrice}
                </span>
              )}
              <span className="text-xl font-semibold text-gray-900">
                {product.price || 'Price on request'}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  )
}
