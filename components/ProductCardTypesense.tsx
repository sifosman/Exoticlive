"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Product as TypesenseProduct } from '../utils/typesense-search';
import { motion } from 'framer-motion';
import { useState } from 'react';

interface ProductCardProps {
  product: TypesenseProduct;
  index: number;
}

const ProductCardTypesense: React.FC<ProductCardProps> = ({ product, index }) => {
  const [imageError, setImageError] = useState(false);

  const variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        delay: index * 0.1
      }
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(price);
  };

  const isOnSale = product.sale_price && product.sale_price < product.regular_price;
  const displayPrice = isOnSale ? product.sale_price : product.regular_price;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={variants}
      className="group relative"
    >
      <Link href={`/product/${product.slug}`}>
        <div className="relative w-full h-[250px] overflow-hidden rounded-lg bg-white mb-4">
          {imageError || !product.image_url || product.image_url.includes('placeholder') ? (
            // Fallback to logo image when there's an error or no valid product image
            <div className="flex items-center justify-center h-full w-full">
              <Image
                src="/cropped-logo11.png"
                alt={product.name || "Product Logo"}
                width={200}
                height={200}
                className="object-contain max-h-[200px] max-w-[200px]"
              />
            </div>
          ) : (
            // Try to load the product image
            <div className="w-full h-full flex items-center justify-center">
              <Image
                src={product.image_url}
                alt={product.image_alt || product.name}
                width={250}
                height={250}
                className="object-contain max-h-[230px] group-hover:opacity-75"
                onError={() => {
                  setImageError(true);
                }}
              />
            </div>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between font-sans">
          <div>
            <h3 className="text-sm text-gray-700 font-sans">{product.name}</h3>
            <div className="mt-1 flex items-center gap-2">
              <p className={isOnSale ? "text-sm font-medium text-red-600 font-sans" : "text-sm font-medium text-gray-900 font-sans"}>
                {formatPrice(displayPrice)}
              </p>
              {isOnSale && (
                <p className="text-sm text-gray-500 line-through font-sans">
                  {formatPrice(product.regular_price)}
                </p>
              )}
            </div>
          </div>
          {product.stock_status === 'instock' ? (
            <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20 font-sans">
              In Stock
            </span>
          ) : (
            <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20 font-sans">
              Out of Stock
            </span>
          )}
        </div>
      </Link>
    </motion.div>
  );
};

export default ProductCardTypesense;
