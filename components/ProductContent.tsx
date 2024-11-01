"use client";

import { useState, memo } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useCart } from '@/lib/cartContext';
import { useToast } from '@/components/ui/use-toast';
import Link from 'next/link';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'; // For gallery navigation
import { motion, AnimatePresence } from 'framer-motion'; // For animations
import RelatedProducts from './RelatedProducts';
import { Lock, CheckCircle } from 'lucide-react';

interface ProductContentProps {
  product: {
    id: string;
    name: string;
    shortDescription: string;
    description: string;
    image: {
      sourceUrl: string;
    };
    galleryImages?: {
      nodes: Array<{
        sourceUrl: string;
        altText?: string;
      }>;
    };
    additionalInformation?: string;
    categories?: {
      nodes: Array<{
        id: string;
        name: string;
      }>;
    };
    __typename?: string;
    price?: string;
    regularPrice?: string;
    salePrice?: string;
    stockStatus?: string;
    stockQuantity?: number;
  } & (
    | {
        __typename: 'SimpleProduct';
      }
    | {
        __typename: 'VariableProduct';
        variations: {
          nodes: Array<{
            id: string;
            name: string;
            stockStatus: 'IN_STOCK' | 'OUT_OF_STOCK' | 'ON_BACKORDER';
            stockQuantity?: number | null;
            regularPrice: string;
            salePrice: string;
            attributes: {
              nodes: Array<{
                name: string;
                value: string;
              }>;
            };
          }>;
        };
      }
  );
}

const ProductContent: React.FC<ProductContentProps> = memo(({ product }) => {
  if (!product) {
    return <div>Loading...</div>;
  }

  const [selectedAttributes, setSelectedAttributes] = useState<{ [key: string]: string }>({});
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();
  const { toast } = useToast();
  
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = product.galleryImages?.nodes || [product.image];
  const totalImages = images.length;

  const isVariableProduct = product.__typename === 'VariableProduct';

  const getVariations = (product: ProductContentProps['product']) => {
    return isVariableProduct && 'variations' in product ? product.variations : undefined;
  };

  const formatPrice = (price: string | null | undefined) => {
    if (!price) return 'Select Option For Price';
    const normalizedPrice = price.replace(/[^0-9.,]/g, '').replace(',', '.');
    const numPrice = parseFloat(normalizedPrice);
    return isNaN(numPrice) ? 'N/A' : `R${numPrice.toFixed(2)}`;
  };

  const handleAttributeSelect = (attrName: string, attrValue: string) => {
    let value = attrValue;
    if (attrName === 'pa_size') {
      value = attrValue.replace('.', '-');
    }
    setSelectedAttributes(prev => ({
      ...prev,
      [attrName]: value
    }));
  };

  const getSelectedVariation = () => {
    if (!isVariableProduct) return null;

    return getVariations(product)?.nodes.find(variation =>
      variation.attributes.nodes.every(attr =>
        selectedAttributes[attr.name] === attr.value
      )
    );
  };

  const handleAddToCart = () => {
    console.log('Add to cart clicked');
    
    const selectedVariation = getSelectedVariation();
    // Get price from selected variation if it exists, otherwise use product price
    const priceToUse = selectedVariation 
      ? selectedVariation.salePrice || selectedVariation.regularPrice
      : product.price;
      
    const normalizedPrice = priceToUse?.replace('R', '').replace(',', '.').trim() || '0';
    const price = parseFloat(normalizedPrice);

    try {
      addToCart({
        id: product.id,
        name: product.name,
        price: price,
        quantity: quantity,
        image: product.image?.sourceUrl || '/placeholder.jpg',
        variationId: selectedVariation?.id || product.id,
        variationName: selectedVariation?.name
      });

      toast({
        title: "Added to Cart",
        description: `${quantity} x ${product.name} added to cart`,
        duration: 3000,
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: "Error",
        description: "Failed to add item to cart",
        variant: "destructive",
      });
    }
  };

  const handleResetSelection = () => {
    setSelectedAttributes({});
  };

  const displayAttributeName = (name: string) => {
    switch (name) {
      case 'pa_size':
        return 'Size';
      case 'pa_color':
        return 'Colour';
      default:
        return name;
    }
  };

  const getAvailableOptionsForAttribute = (attrName: string) => {
    if (product.__typename !== 'VariableProduct' || !product.variations) return [];

    const options = Array.from(new Set(product.variations.nodes.flatMap((variation) =>
      variation.attributes.nodes
        .filter((attr) => attr.name === attrName)
        .map((attr) => attr.value)
    )));

    if (attrName === 'pa_size') {
      return options.map(option => option.replace('-', '.'));
    }

    return options;
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? totalImages - 1 : prev - 1));
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev === totalImages - 1 ? 0 : prev + 1));
  };

  const [imageError, setImageError] = useState(false);

  const maxQuantity = getSelectedVariation()?.stockQuantity ?? Infinity;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8" style={{ marginTop: '52px' }}> {/* Added marginTop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div>
          {/* Breadcrumb Navigation */}
          <nav className="mb-4">
            <ol className="flex space-x-2 text-sm text-gray-500">
              <li>
                <Link href="/" className="hover:text-primary">Home</Link>
              </li>
              <li>/</li>
              <li>
                <Link href="/products" className="hover:text-primary">Products</Link>
              </li>
              <li>/</li>
              <li className="text-gray-700">{product.name}</li>
            </ol>
          </nav>

          {/* Product Image Gallery */}
          <motion.div
            className="relative bg-white rounded-lg overflow-hidden shadow-md border border-gray-200"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <AnimatePresence mode="wait">
              {images.length > 0 && (
                <motion.div
                  key={currentImageIndex}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="relative"
                >
                  <Image
                    src={imageError ? '/placeholder-image.jpg' : (images[currentImageIndex]?.sourceUrl || '/placeholder-image.jpg')}
                    alt={product.name}
                    width={500}
                    height={500}
                    objectFit="contain"
                    onError={() => setImageError(true)}
                    className="w-full h-auto"
                  />
                </motion.div>
              )}
            </AnimatePresence>
            {/* Gallery Navigation Buttons */}
            {totalImages > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute top-1/2 left-4 transform -translate-y-1/2 bg-white bg-opacity-50 p-2 rounded-full hover:bg-opacity-75 transition"
                  aria-label="Previous Image"
                >
                  <ChevronLeftIcon className="h-5 w-5 text-gray-800" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute top-1/2 right-4 transform -translate-y-1/2 bg-white bg-opacity-50 p-2 rounded-full hover:bg-opacity-75 transition"
                  aria-label="Next Image"
                >
                  <ChevronRightIcon className="h-5 w-5 text-gray-800" />
                </button>
              </>
            )}
          </motion.div>

          {/* Image Thumbnails */}
          {totalImages > 1 && (
            <div className="flex space-x-2 mt-4">
              {images.map((img, index) => (
                <div
                  key={index}
                  className={`relative w-16 h-16 cursor-pointer border ${
                    currentImageIndex === index ? 'border-primary' : 'border-transparent'
                  } rounded-md overflow-hidden`}
                  onClick={() => setCurrentImageIndex(index)}
                >
                  <Image
                    src={img.sourceUrl}
                    alt={`${product.name} thumbnail ${index + 1}`}
                    layout="fill"
                    objectFit="cover"
                    className="hover:opacity-80 transition-opacity duration-300"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <h1 className="text-3xl font-lato font-bold text-gray-800">{product.name}</h1>
          <p className="text-2xl font-montserrat font-bold text-primary">
            {formatPrice(
              getSelectedVariation()?.salePrice || 
              getSelectedVariation()?.regularPrice || 
              product.salePrice || 
              product.regularPrice || 
              product.price
            )}
          </p>
          <div dangerouslySetInnerHTML={{ __html: product.description }} className="prose prose-sm max-w-none" />

          {isVariableProduct && (
            <div className="space-y-4">
              {['pa_color', 'pa_size'].map((attrName) => (
                <div key={attrName}>
                  <h4 className="font-montserrat font-semibold text-gray-700 mb-2">
                    {displayAttributeName(attrName)}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {getAvailableOptionsForAttribute(attrName).map((attrValue) => (
                      <button
                        key={attrValue}
                        className={`
                          relative px-3 py-1 text-sm border rounded-full overflow-hidden transition-all duration-300
                          ${
                            selectedAttributes[attrName] === (attrName === 'pa_size' ? attrValue.replace('.', '-') : attrValue)
                            ? 'border-transparent bg-black text-white shadow-lg selected'
                            : 'border-gray-300 bg-white text-gray-700'
                          }
                          hover:border-transparent hover:text-white
                          before:absolute before:inset-0 before:z-0
                          hover:before:opacity-100
                        `}
                        onClick={() => handleAttributeSelect(attrName, attrValue)}
                      >
                        <style jsx>{`
                          @keyframes moveGradient {
                            0% { background-position: 0% 50%; }
                            50% { background-position: 100% 50%; }
                            100% { background-position: 0% 50%; }
                          }
                          button.selected::after {
                            content: '';
                            position: absolute;
                            inset: -2px;
                            z-index: -1;
                            background: linear-gradient(90deg, #3D6660, #669492, #254843, #3D6660);
                            background-size: 300% 100%;
                            animation: moveGradient 15s ease infinite;
                            filter: blur(8px);
                            opacity: 0.7;
                          }
                          button:hover::after {
                            opacity: 1;
                          }
                        `}</style>
                        <span className="relative z-10">{attrValue}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <button
                className="text-sm text-gray-500 hover:text-primary transition-colors duration-300"
                onClick={handleResetSelection}
              >
                Reset Selection
              </button>
            </div>
          )}

          {/* Quantity Selector */}
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700">Quantity:</span>
            <div className="flex items-center border border-gray-300 rounded-full">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="rounded-l-full"
              >
                -
              </Button>
              <span className="mx-2 text-sm">{quantity}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                className="rounded-r-full"
              >
                +
              </Button>
            </div>
          </div>
          
          {/* Add to Cart Button */}
          {getSelectedVariation() && (
            <p className="text-sm text-gray-600">
              {getSelectedVariation()?.stockStatus === 'IN_STOCK' 
                ? `In stock${getSelectedVariation()?.stockQuantity !== null ? `: ${getSelectedVariation()?.stockQuantity}` : ''}`
                : ''}
            </p>
          )}

          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              className="w-full bg-black font-lato hover:bg-gray-900 text-white transition-colors duration-300 py-3"
              onClick={handleAddToCart}
              disabled={false}
            >
              ADD TO CART
            </Button>
          </motion.div>

          {/* Updated version with glass effect and background image */}
          <div className="mt-6 bg-[url('/payment-methods.webp')] bg-cover p-6 rounded-lg text-white relative">
            {/* Glass effect overlay */}
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm rounded-lg"></div>
            
            {/* Content */}
            <div className="relative z-10 flex items-center justify-center space-x-4">
              <Lock className="w-5 h-5 text-white" />
              <span className="text-white font-medium">
                Trusted Supplier for over 15 Years
              </span>
              <CheckCircle className="w-5 h-5 text-white stroke-2" />
            </div>
          </div>

          {/* Additional Information */}
          {product.additionalInformation && (
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <h2 className="text-xl font-lato font-semibold text-gray-800 mb-2">Additional Information</h2>
              <div dangerouslySetInnerHTML={{ __html: product.additionalInformation }} className="prose prose-sm max-w-none" />
            </div>
          )}
        </motion.div>
      </div>
      
      <RelatedProducts />
    </div>
  );
});

export default ProductContent;
