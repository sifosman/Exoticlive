"use client";

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface Product {
  id: string;
  name: string;
  price: number | string;
  sale_price?: number | string;
  regular_price: number | string;
  image_url: string;
  slug: string;
  stock_status: string;
  is_on_sale?: boolean;
  colors?: string[];
  sizes?: string[];
}

interface TypesenseProductCardProps {
  product: Product;
  index: number;
}

const TypesenseProductCard = ({ product, index }: TypesenseProductCardProps) => {
  const [imageError, setImageError] = useState(false);

  // Parse prices to numbers
  const parsePrice = (price: number | string | undefined): number => {
    if (typeof price === 'string') {
      const cleanPrice = price.replace(/[^0-9.]/g, '');
      return cleanPrice ? parseFloat(cleanPrice) : 0;
    }
    return typeof price === 'number' ? price : 0;
  };

  // Get the prices, using regular_price as fallback for price and vice versa
  const price = parsePrice(product.price) || parsePrice(product.regular_price);
  const regularPrice = parsePrice(product.regular_price) || parsePrice(product.price);
  const salePrice = parsePrice(product.sale_price);

  // Determine if product is on sale
  const isOnSale = product.is_on_sale || (salePrice > 0 && salePrice < regularPrice);
  const displayPrice = isOnSale ? salePrice : (price || regularPrice);

  const formatPrice = (price: number) => {
    // Only show "Price not available" if both price and regular_price are 0
    if (isNaN(price) || (price === 0 && regularPrice === 0)) {
      return 'Price not available';
    }
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  // Format image URL to use HTTPS and handle empty URLs
  const getImageUrl = (url: string) => {
    if (!url) return '/cropped-logo11.png';

    try {
      // Check if it's a relative URL
      if (url.startsWith('/')) {
        return url;
      }

      // Check if it's a valid URL
      const imageUrl = new URL(url);
      imageUrl.protocol = 'https:';
      return imageUrl.toString();
    } catch (e) {
      console.error('Invalid image URL:', url);
      return '/cropped-logo11.png';
    }
  };

  // Check if product is out of stock
  const isInStock = product.stock_status?.toLowerCase() === 'instock' || product.stock_status === 'IN_STOCK';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="group relative bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 w-full max-w-full box-border"
    >
      <Link href={`/product/${product.slug}`} className="block w-full">
        <div className="relative aspect-square overflow-hidden bg-gray-100 w-full">
          <Image
            src={imageError || !product.image_url ? '/cropped-logo11.png' : getImageUrl(product.image_url)}
            alt={product.name || "Product"}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className={`object-contain object-center group-hover:scale-105 transition-transform duration-300 ${
              imageError || !product.image_url ? 'p-4' : 'object-cover'
            } max-w-full`}
            onError={() => setImageError(true)}
            priority={index < 4}
          />
        </div>

        <div className="p-2 sm:p-4">
          <h3 className="text-xs sm:text-sm font-medium text-gray-900 truncate">
            {product.name}
          </h3>

          <div className="mt-2 flex items-center justify-between">
            <div>
              {isOnSale ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-bold text-red-600">{formatPrice(displayPrice)}</span>
                  <span className="text-[10px] sm:text-xs text-gray-500 line-through">{formatPrice(regularPrice)}</span>
                </div>
              ) : (
                <span className="text-xs sm:text-sm font-medium text-gray-900">{formatPrice(displayPrice)}</span>
              )}
            </div>

            {isInStock ? (
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                In Stock
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                Out of Stock
              </span>
            )}
          </div>

          {/* Display product colors if available */}
          {product.colors && product.colors.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {product.colors.map((color, i) => (
                <span
                  key={i}
                  className="inline-block px-2 py-1 text-xs bg-gray-100 rounded-full"
                >
                  {color}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
};

export default TypesenseProductCard;
