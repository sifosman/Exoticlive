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
import { Lock, CheckCircle, XCircle } from 'lucide-react';

interface ProductContentProps {
  product: {
    id: string;
    name: string;
    shortDescription: string;
    description: string;
    image: {
      sourceUrl: string;
    } | null;
    galleryImages?: {
      nodes: Array<{
        sourceUrl: string;
        altText?: string;
      } | null>;
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
            image: {
              sourceUrl: string;
            };
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
  const [imageErrors, setImageErrors] = useState<{ [key: string]: boolean }>({});
  const [hoveredImageIndex, setHoveredImageIndex] = useState<number | null>(null);

  const isValidImageUrl = (url: string) => {
    return url && url.startsWith('http');
  };

  const getSafeImageUrl = (image: { sourceUrl: string } | null | undefined, index: number) => {
    if (!image || !isValidImageUrl(image.sourceUrl)) {
      return 'https://exoticlive.co.za/wp-content/uploads/woocommerce-placeholder.png';
    }
    return imageErrors[`${index}-${image.sourceUrl}`] 
      ? 'https://exoticlive.co.za/wp-content/uploads/woocommerce-placeholder.png'
      : image.sourceUrl;
  };

  const validImages = (product.galleryImages?.nodes || [])
    .filter(img => img && isValidImageUrl(img.sourceUrl));
  
  const allImages = [
    ...(product.image && isValidImageUrl(product.image.sourceUrl) ? [product.image] : []),
    ...validImages
  ].filter((img): img is { sourceUrl: string } => img !== null);

  const totalImages = allImages.length;

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

  const checkVariationAvailability = (attributes: { [key: string]: string }) => {
    if (!isVariableProduct || !product.variations) return false;
    
    const matchingVariation = product.variations.nodes.find(variation =>
      variation.attributes.nodes.every(attr =>
        attributes[attr.name] === attr.value
      )
    );

    return {
      exists: !!matchingVariation,
      inStock: matchingVariation?.stockStatus === 'IN_STOCK'
    };
  };

  const handleAttributeSelect = (attrName: string, attrValue: string) => {
    let value = attrName === 'pa_size' ? attrValue.replace('.', '-') : attrValue;
    
    const newAttributes = {
      ...selectedAttributes,
      [attrName]: value
    };

    const result = checkVariationAvailability(newAttributes);
    
    if (!result || (!result.exists || !result.inStock)) {
      const hasAllAttributes = ['pa_color', 'pa_size'].every(attr => newAttributes[attr]);
      if (hasAllAttributes) {
        setSelectedAttributes({});
        toast({
          title: "Combination Not Available",
          description: "This variation is out of stock. Please select a different combination.",
          duration: 3000,
        });
      } else {
        setSelectedAttributes(newAttributes);
      }
    } else {
      setSelectedAttributes(newAttributes);
    }
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

    // Safely handle options from the product attributes
    const attributes = (product as any).attributes?.nodes || [];
    const attribute = attributes.find((attr: any) => attr.name === attrName);
    const options = attribute?.options || [];

    if (options.length > 0) {
      if (attrName === 'pa_size') {
        // Safely handle size sorting with error handling
        return options
          .map(option => String(option).replace('-', '.'))
          .sort((a, b) => {
            const numA = parseFloat(a) || 0;
            const numB = parseFloat(b) || 0;
            return numA - numB;
          });
      }
      return options;
    }

    // Fallback to variations if no options found
    const variationOptions = Array.from(new Set(product.variations.nodes.flatMap((variation) =>
      variation.attributes.nodes
        .filter((attr) => attr.name === attrName)
        .map((attr) => attr.value)
    )));

    if (attrName === 'pa_size') {
      return variationOptions
        .map(option => String(option).replace('-', '.'))
        .sort((a, b) => {
          const numA = parseFloat(a) || 0;
          const numB = parseFloat(b) || 0;
          return numA - numB;
        });
    }

    return variationOptions;
  };

  const isOptionAvailable = (attrName: string, attrValue: string) => {
    if (!product || product.__typename !== 'VariableProduct' || !product.variations) return true;

    // Get the other attribute name (if color is passed, get size, and vice versa)
    const otherAttrName = attrName === 'pa_color' ? 'pa_size' : 'pa_color';
    const otherAttrValue = selectedAttributes[otherAttrName];

    // Check if this combination exists in any in-stock variation
    return product.variations.nodes.some(variation => {
      const attrs = variation.attributes?.nodes || [];
      const matchesCurrentAttr = attrs
        .some(attr => attr.name === attrName && attr.value === attrValue);
      
      const matchesOtherAttr = !otherAttrValue || attrs
        .some(attr => attr.name === otherAttrName && attr.value === otherAttrValue);

      return matchesCurrentAttr && matchesOtherAttr && variation.stockStatus === 'IN_STOCK';
    });
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? totalImages - 1 : prev - 1));
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev === totalImages - 1 ? 0 : prev + 1));
  };

  const maxQuantity = getSelectedVariation()?.stockQuantity ?? Infinity;
  const selectedVariation = getSelectedVariation();
  
  const renderStockStatus = () => {
    if (!selectedVariation) return null;

    return (
      <div className="flex items-center space-x-2 text-sm">
        {selectedVariation.stockStatus === 'IN_STOCK' ? (
          <>
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-green-600 font-medium">
              In Stock
              {selectedVariation.stockQuantity !== null && 
                ` (${selectedVariation.stockQuantity} available)`
              }
            </span>
          </>
        ) : (
          <>
            <XCircle className="w-4 h-4 text-red-600" />
            <span className="text-red-600 font-medium">Out of Stock</span>
          </>
        )}
      </div>
    );
  };

  const zoomStyles = {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 1000,
    background: 'white',
    padding: '1rem',
    borderRadius: '0.5rem',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    maxWidth: '90vw',
    maxHeight: '90vh',
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12">
        <div>
          <nav className="mb-4 overflow-x-auto whitespace-nowrap">
            <ol className="flex space-x-2 text-xs md:text-sm text-gray-500">
              <li>
                <Link href="/" className="hover:text-primary">Home</Link>
              </li>
              <li>/</li>
              <li>
                <Link href="/products" className="hover:text-primary">Products</Link>
              </li>
              <li>/</li>
              <li className="text-gray-700 truncate max-w-[150px]">{product.name}</li>
            </ol>
          </nav>

          <div className="relative w-full h-[600px] mb-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentImageIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative w-full h-full"
              >
                <Image
                  src={getSafeImageUrl(allImages[currentImageIndex], currentImageIndex)}
                  alt={product.name}
                  fill
                  style={{
                    objectFit: 'contain',
                    padding: '16px',
                    background: 'white',
                  }}
                  quality={95}
                  priority={true}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
                  className="rounded-lg shadow-sm"
                />
              </motion.div>
            </AnimatePresence>

            {totalImages > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white p-3 rounded-full shadow-lg z-10"
                  aria-label="Previous image"
                >
                  <ChevronLeftIcon className="h-8 w-8 text-gray-800" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white p-3 rounded-full shadow-lg z-10"
                  aria-label="Next image"
                >
                  <ChevronRightIcon className="h-8 w-8 text-gray-800" />
                </button>
              </>
            )}
          </div>

          {totalImages > 1 && (
            <div className="flex gap-4 overflow-x-auto pb-4 mb-8">
              {allImages.map((image, index) => (
                <div
                  key={`${index}-${image?.sourceUrl}`}
                  className={`relative aspect-square cursor-pointer rounded-lg overflow-hidden ${
                    currentImageIndex === index ? 'ring-2 ring-black' : ''
                  }`}
                  onClick={() => setCurrentImageIndex(index)}
                  onMouseEnter={() => setHoveredImageIndex(index)}
                  onMouseLeave={() => setHoveredImageIndex(null)}
                >
                  <Image
                    src={getSafeImageUrl(image, index)}
                    alt={`Product thumbnail ${index + 1}`}
                    fill
                    className="object-contain p-2 hover:scale-110 transition-transform duration-200"
                    sizes="(max-width: 768px) 25vw, 10vw"
                    quality={80}
                    onError={() => {
                      setImageErrors(prev => ({
                        ...prev,
                        [`${index}-${image?.sourceUrl}`]: true
                      }));
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Zoomed Image Overlay */}
        {hoveredImageIndex !== null && (
          <div
            style={zoomStyles as any}
            onClick={() => setHoveredImageIndex(null)}
          >
            <div className="relative aspect-square w-[80vh]">
              <Image
                src={getSafeImageUrl(allImages[hoveredImageIndex], hoveredImageIndex)}
                alt={`Zoomed product image ${hoveredImageIndex + 1}`}
                fill
                className="object-contain"
                sizes="80vh"
                quality={95}
              />
            </div>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-4 md:space-y-6"
        >
          <h1 className="text-2xl md:text-3xl font-lato font-bold text-gray-800">{product.name}</h1>
          <p className="text-xl md:text-2xl font-montserrat font-bold text-primary">
            {formatPrice(
              getSelectedVariation()?.salePrice || 
              getSelectedVariation()?.regularPrice || 
              product.salePrice || 
              product.regularPrice || 
              product.price
            )}
          </p>

          <div 
            dangerouslySetInnerHTML={{ __html: product.description }} 
            className="prose prose-sm md:prose max-w-none text-sm md:text-base"
          />

          {isVariableProduct && (
            <div className="space-y-6">
              {['pa_color', 'pa_size'].map((attrName) => (
                <div key={attrName} className="border-b pb-4">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <h4 className="font-montserrat font-bold text-gray-800 text-base md:text-lg">
                        {displayAttributeName(attrName)}:
                      </h4>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {getAvailableOptionsForAttribute(attrName).map((attrValue) => {
                      const normalizedValue = attrName === 'pa_size' ? attrValue.replace('.', '-') : attrValue;
                      const isSelected = selectedAttributes[attrName] === normalizedValue;
                      const isAvailable = isOptionAvailable(attrName, normalizedValue);

                      return (
                        <button
                          key={attrValue}
                          className={`
                            relative px-4 py-2 text-sm md:text-base border-2 rounded-lg
                            font-lato transition-all duration-300
                            ${isSelected 
                              ? 'border-black bg-black text-white shadow-lg transform scale-105' 
                              : isAvailable
                                ? 'border-gray-600 hover:border-black bg-white text-gray-700'
                                : 'border-red-400 bg-red-50 text-gray-500'
                            }
                            ${isAvailable ? 'hover:scale-105' : 'cursor-not-allowed'}
                          `}
                          onClick={() => isAvailable && handleAttributeSelect(attrName, attrValue)}
                          disabled={!isAvailable}
                        >
                          <span className="relative">
                            {attrValue}
                            {!isAvailable && (
                              <>
                                <span className="absolute inset-0 flex items-center justify-center">
                                  <XCircle className="w-6 h-6 text-red-600 drop-shadow-sm" />
                                </span>
                                <span className="absolute inset-0 bg-red-100/50"></span>
                              </>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {Object.keys(selectedAttributes).length > 0 && (
                <div className="mt-4">
                  <Button
                    onClick={handleResetSelection}
                    variant="outline"
                    className="w-full py-2 text-sm font-lato font-medium text-gray-600 hover:text-gray-900 border-2 hover:border-gray-900 transition-colors"
                  >
                    Clear Selection
                  </Button>
                </div>
              )}
              {renderStockStatus()}
            </div>
          )}

          <div className="flex items-center space-x-4">
            <span className="text-xs md:text-sm font-medium text-gray-700">Quantity:</span>
            <div className="flex items-center border border-gray-300 rounded-full">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="rounded-l-full px-2 md:px-3"
                disabled={!selectedVariation || selectedVariation.stockStatus !== 'IN_STOCK'}
              >
                -
              </Button>
              <span className="mx-2 text-xs md:text-sm min-w-[20px] text-center">{quantity}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setQuantity(Math.min(selectedVariation?.stockQuantity || Infinity, quantity + 1))}
                className="rounded-r-full px-2 md:px-3"
                disabled={!selectedVariation || selectedVariation.stockStatus !== 'IN_STOCK'}
              >
                +
              </Button>
            </div>
          </div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              className="w-full bg-black font-lato hover:bg-gray-900 text-white transition-colors duration-300 py-2.5 md:py-3 text-sm md:text-base"
              onClick={handleAddToCart}
              disabled={!selectedVariation || selectedVariation.stockStatus !== 'IN_STOCK'}
            >
              {!selectedVariation ? 'SELECT OPTIONS' : 
               selectedVariation.stockStatus !== 'IN_STOCK' ? 'OUT OF STOCK' : 
               'ADD TO CART'}
            </Button>
          </motion.div>

          <div className="mt-4 md:mt-6 bg-[url('/payment-methods.webp')] bg-cover p-4 md:p-6 rounded-lg text-white relative">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm rounded-lg"></div>
            <div className="relative z-10 flex items-center justify-center space-x-2 md:space-x-4">
              <Lock className="w-4 h-4 md:w-5 md:h-5 text-white" />
              <span className="text-white font-medium text-xs md:text-base">
                Trusted Supplier for over 10 Years
              </span>
              <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-white stroke-2" />
            </div>
          </div>

          {product.additionalInformation && (
            <div className="mt-6 md:mt-8 p-3 md:p-4 bg-gray-50 rounded-lg">
              <h2 className="text-lg md:text-xl font-lato font-semibold text-gray-800 mb-2">
                Additional Information
              </h2>
              <div 
                dangerouslySetInnerHTML={{ __html: product.additionalInformation }} 
                className="prose-sm md:prose max-w-none text-sm md:text-base" 
              />
            </div>
          )}
        </motion.div>
      </div>

      <RelatedProducts />
    </div>
  );
});

export default ProductContent;
