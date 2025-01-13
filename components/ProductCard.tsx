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
import { Product } from '@/components/product/types';
import { useState, useEffect } from 'react';

interface ProductCardProps {
  product: Product;
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

const ProductCard: React.FC<ProductCardProps> = ({ product, index }) => {
  const [imageError, setImageError] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const imageUrl = product.image?.sourceUrl;

  useEffect(() => {
    // Reset states when product changes
    setImageError(false);
    setIsImageLoading(true);
  }, [product.id]);

  const handleImageLoad = () => {
    setIsImageLoading(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setIsImageLoading(false);
  };

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

  const isValidImageUrl = (url: string | undefined): boolean => {
    if (!url) return false;
    try {
      new URL(url);
      return true;
    } catch (error) {
      return false;
    }
  }

  return (
    <Link href={`/product/${product.slug}`} className="block w-full">
      <div className="group relative h-full bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            aspectRatio: '1/1',
            overflow: 'hidden',
            background: 'white',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          {isImageLoading && !imageError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          {imageUrl && !imageError ? (
            <Image
              src={imageUrl}
              alt={product.name || 'Product Image'}
              fill
              style={{
                objectFit: 'contain',
                transition: 'transform 0.3s ease',
                padding: '16px'
              }}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              quality={75}
              priority={index < 12}
              onLoad={handleImageLoad}
              onError={handleImageError}
              className={`transition-opacity duration-300 ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
            />
          ) : (
            <Image
              src="https://wp.exoticshoes.co.za/wp-content/uploads/2021/09/cropped-logo11.png"
              alt="Fallback Image"
              fill
              style={{
                objectFit: 'contain',
                padding: '16px'
              }}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              priority={index < 12}
            />
          )}
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
                {formatPrice(product.price)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

export default ProductCard;
