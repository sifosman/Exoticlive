"use client";

import { useState, memo } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useCart } from '@/lib/cartContext';
import { useToast } from '@/components/ui/use-toast';
import Link from 'next/link';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'; // For gallery navigation
import { motion, AnimatePresence } from 'framer-motion'; // For animations
import RelatedProducts from './RelatedProducts'; // Changed to default import
import { Lock, CheckCircle, XCircle } from 'lucide-react';
import { Snackbar, Alert } from '@mui/material';
import { ProductVariation } from '@/types/product';

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
    attributes?: {
      nodes: Array<{
        name: string;
        options?: Array<string>;
      }>;
    };
  } & (
    | {
        __typename: 'SimpleProduct';
      }
    | {
        __typename: 'VariableProduct';
        variations: {
          nodes: Array<ProductVariation>;
        };
      }
  );
}

const ProductContent = ({ product }: ProductContentProps) => {
  if (!product) {
    return <div>Loading...</div>;
  }

  const isVariableProduct = product.__typename === 'VariableProduct';

  const [selectedAttributes, setSelectedAttributes] = useState<{ [key: string]: string }>({});
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  
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

  const getVariations = (product: ProductContentProps['product']) => {
    return isVariableProduct && 'variations' in product ? product.variations : undefined;
  };

  const formatPrice = (price: string | null | undefined) => {
    if (!price) return 'Select Option For Price';
    const normalizedPrice = price.replace(/[^0-9.,]/g, '').replace(',', '.');
    const numPrice = parseFloat(normalizedPrice);
    return isNaN(numPrice) ? 'N/A' : `R${numPrice.toFixed(2)}`;
  };

  const getAvailableOptionsForAttribute = (attrName: string) => {
    if (product.__typename !== 'VariableProduct' || !product.variations) return [];

    // Get all variations that have this attribute
    const variations = product.variations.nodes;
    
    // Get unique options from variations
    const options = Array.from(new Set(variations.flatMap((variation) =>
      variation.attributes.nodes
        .filter((attr) => attr.name === attrName)
        .map((attr) => attr.value)
    )));

    // For sizes, replace hyphens with dots
    if (attrName === 'pa_size') {
      return options.map(option => option.replace('-', '.'));
    }

    // For colors, preserve original casing
    return options;
  };

  const isOptionAvailable = (attrName: string, attrValue: string) => {
    if (!product || product.__typename !== 'VariableProduct' || !product.variations) return true;

    // Normalize attribute names and values
    const normalizedAttrName = attrName.toLowerCase();
    const normalizedAttrValue = attrValue.toLowerCase();
    const otherAttrName = normalizedAttrName === 'pa_color' ? 'pa_size' : 'pa_color';
    const otherAttrValue = selectedAttributes[otherAttrName]?.toLowerCase();

    // Find variations that match this attribute value
    const matchingVariations = product.variations.nodes.filter(variation => {
      const attrs = variation.attributes?.nodes || [];
      
      // Match current attribute
      const matchesCurrentAttr = attrs.some(attr => 
        attr.name.toLowerCase() === normalizedAttrName && 
        attr.value.toLowerCase() === normalizedAttrValue
      );

      // If no other attribute is selected, just check this one
      if (!otherAttrValue) {
        return matchesCurrentAttr;
      }

      // If other attribute is selected, check both
      const matchesOtherAttr = attrs.some(attr => 
        attr.name.toLowerCase() === otherAttrName && 
        attr.value.toLowerCase() === otherAttrValue
      );

      return matchesCurrentAttr && matchesOtherAttr;
    });

    // Check if any matching variation is in stock
    return matchingVariations.some(variation => 
      variation.stockStatus === 'IN_STOCK' && 
      (variation.stockQuantity === null || variation.stockQuantity > 0)
    );
  };

  const formatAttributeValue = (attrName: string, value: string) => {
    if (attrName === 'pa_color') {
      // Capitalize first letter of each word for display
      return value.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }
    return value;
  };

  const normalizeAttributeName = (name: string) => {
    // Remove 'pa_' prefix if it exists, convert to lowercase
    return name.replace(/^pa_/, '').toLowerCase();
  };

  const handleAttributeSelect = (attrName: string, attrValue: string) => {
    console.log('Selecting attribute:', { attrName, attrValue });
    
    setSelectedAttributes(prev => {
      const newAttributes = {
        ...prev,
        [attrName]: attrValue
      };
      
      console.log('New selected attributes:', newAttributes);
      
      // Check if this combination exists in variations
      const matchingVariation = product.variations?.nodes.find(variation => {
        return variation.attributes.nodes.every(attr => 
          newAttributes[attr.name]?.toLowerCase() === attr.value.toLowerCase()
        );
      });
      
      console.log('Matching variation:', matchingVariation);
      
      return newAttributes;
    });
  };

  const getSelectedVariation = () => {
    if (!isVariableProduct) return null;

    return getVariations(product)?.nodes.find(variation =>
      variation.attributes.nodes.every(attr =>
        selectedAttributes[attr.name] === attr.value
      )
    );
  };

  const selectedVariation = getSelectedVariation();
  const stockQuantity = selectedVariation ? (selectedVariation.stockQuantity !== null ? selectedVariation.stockQuantity : 0) : 0;

  const handleAddToCart = () => {
    if (isVariableProduct && !selectedVariation) {
      toast({
        title: "Error",
        description: "Please select all options before adding to cart",
        variant: "destructive",
        duration: 1500,
      });
      return;
    }

    const priceToUse = selectedVariation 
      ? selectedVariation.salePrice || selectedVariation.regularPrice
      : product.price;
      
    if (!priceToUse) {
      toast({
        title: "Error",
        description: "Price information is missing",
        variant: "destructive",
        duration: 1500,
      });
      return;
    }

    const normalizedPrice = priceToUse.replace(/[^0-9.,]/g, '').replace(',', '.').trim();
    const price = parseFloat(normalizedPrice);

    if (isNaN(price)) {
      toast({
        title: "Error",
        description: "Invalid price format",
        variant: "destructive",
        duration: 1500,
      });
      return;
    }

    try {
      addToCart({
        id: product.id,
        name: product.name,
        price: price,
        quantity: quantity,
        image: product.image?.sourceUrl || '/placeholder.jpg',
        variationId: selectedVariation?.id ?? '',
        variationName: selectedVariation?.name ?? '',
      });

      // Show both notifications
      toast({
        title: "✓ Added to Cart",
        description: `${product.name}`,
        duration: 1500,
        style: {
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none'
        },
      });
      setSnackbarOpen(true);

    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: "Error",
        description: "Failed to add item to cart",
        variant: "destructive",
        duration: 1500,
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

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? totalImages - 1 : prev - 1));
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev === totalImages - 1 ? 0 : prev + 1));
  };

  const renderStockStatus = () => {
    if (!selectedVariation) {
      if (!isVariableProduct) {
        return (
          <div className="flex items-center gap-2">
            {product.stockStatus === 'IN_STOCK' ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-green-600 font-medium">
                  In Stock
                  {product.stockQuantity !== null && 
                    ` (${product.stockQuantity} available)`
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
      }
      return null;
    }

    return (
      <div className="flex items-center gap-2">
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

  const zoomStyles: React.CSSProperties = {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 1000,
    backgroundColor: 'white',
    padding: '1rem',
    borderRadius: '0.5rem',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    maxWidth: '90vw',
    maxHeight: '90vh',
  };

  const isValidSelection = () => {
    if (!isVariableProduct) return true;
    
    // Get available attributes from the product
    const availableAttributes = product.attributes?.nodes || [];
    
    // Check if all required attributes are selected
    return availableAttributes.every(attribute => {
      // If the attribute has options, it needs to be selected
      if (attribute.options && attribute.options.length > 0) {
        return selectedAttributes[attribute.name] !== undefined;
      }
      return true; // Skip attributes without options
    });
  };

  const isVariationAvailable = (selectedAttrs: Record<string, string>) => {
    if (product.__typename !== 'VariableProduct') {
      return false;
    }

    const matchingVariations = product.variations.nodes.filter((variation: ProductVariation) => {
      const matchesCurrentAttr = variation.attributes.nodes.every((attr: { name: string; value: string }) => {
        const attrName = normalizeAttributeName(attr.name);
        return selectedAttrs[attrName] === attr.value;
      });

      const matchesOtherAttr = Object.keys(selectedAttrs).every(selectedAttrName => {
        return variation.attributes.nodes.some(
          attr => normalizeAttributeName(attr.name) === selectedAttrName
        );
      });

      return matchesCurrentAttr && matchesOtherAttr;
    });

    // Check if any matching variation is in stock
    return matchingVariations.some(variation => 
      variation.stockStatus === 'IN_STOCK' && 
      (variation.stockQuantity ?? 0) > 0
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12">
        {/* Left Column - Product Image */}
        <div>
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
                    backgroundColor: 'white',
                  }}
                  quality={95}
                  priority={true}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
                  className="rounded-lg shadow-sm"
                />
              </motion.div>
            </AnimatePresence>

            {totalImages > 1 && (
              <div className="absolute inset-0 flex items-center justify-between p-4">
                <button
                  onClick={prevImage}
                  className="p-2 rounded-full bg-white/80 hover:bg-white shadow-lg transition-all"
                  aria-label="Previous image"
                >
                  <ChevronLeftIcon className="w-6 h-6 text-gray-800" />
                </button>
                <button
                  onClick={nextImage}
                  className="p-2 rounded-full bg-white/80 hover:bg-white shadow-lg transition-all"
                  aria-label="Next image"
                >
                  <ChevronRightIcon className="w-6 h-6 text-gray-800" />
                </button>
              </div>
            )}
          </div>

          {/* Thumbnail Gallery */}
          {totalImages > 1 && (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {allImages.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                    currentImageIndex === index ? 'border-primary' : 'border-transparent'
                  }`}
                  onMouseEnter={() => setHoveredImageIndex(index)}
                  onMouseLeave={() => setHoveredImageIndex(null)}
                >
                  <Image
                    src={getSafeImageUrl(image, index)}
                    alt={`Product thumbnail ${index + 1}`}
                    fill
                    style={{ objectFit: 'cover' }}
                    className={`transition-transform duration-300 ${
                      hoveredImageIndex === index ? 'scale-110' : 'scale-100'
                    }`}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column - Product Details */}
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-lato font-bold text-gray-800 mb-4">{product.name}</h1>
            <p className="text-xl md:text-2xl font-montserrat font-bold text-primary mb-6">
              {formatPrice(
                isVariableProduct
                  ? selectedVariation?.salePrice || selectedVariation?.regularPrice
                  : product.salePrice || product.regularPrice || product.price
              )}
            </p>
            
            <div className="prose prose-sm md:prose-base max-w-none mb-8" 
              dangerouslySetInnerHTML={{ __html: product.description || '' }} 
            />
          </div>

          {/* Variation Selection */}
          {isVariableProduct && product.attributes?.nodes && (
            <div className="space-y-4">
              {product.attributes.nodes.map((attribute) => (
                <div key={attribute.name}>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    {displayAttributeName(attribute.name)}:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {attribute.options?.map((option) => {
                      const isAvailable = isOptionAvailable(attribute.name, option);
                      return (
                        <button
                          key={option}
                          onClick={() => handleAttributeSelect(attribute.name, option)}
                          className={`
                            min-w-[40px] h-[40px] flex items-center justify-center
                            px-3 border rounded
                            font-lato text-base font-medium transition-all
                            ${
                              selectedAttributes[attribute.name] === option
                                ? 'border-black bg-black text-white'
                                : isAvailable
                                  ? 'border-gray-300 hover:border-black text-gray-700'
                                  : 'border-red-300 bg-red-50 text-red-400 cursor-not-allowed'
                            }
                          `}
                          disabled={!isAvailable}
                        >
                          {formatAttributeValue(attribute.name, option)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quantity Selector */}
          <div className="flex items-center space-x-4 mt-6">
            <span className="text-base font-medium text-gray-700">Quantity:</span>
            <div className="flex items-center">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-8 h-8 flex items-center justify-center border border-gray-300 text-gray-600 hover:border-black"
              >
                -
              </button>
              <input
                type="text"
                value={quantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val) && val > 0) {
                    setQuantity(val);
                  }
                }}
                className="w-12 h-8 text-center border-t border-b border-gray-300"
              />
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-8 h-8 flex items-center justify-center border border-gray-300 text-gray-600 hover:border-black"
              >
                +
              </button>
            </div>
          </div>

          {/* Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            disabled={isVariableProduct && !isValidSelection()}
            className={`
              w-full py-3 text-base font-medium transition-colors mt-4
              ${isVariableProduct && !isValidSelection() 
                ? 'bg-gray-600 text-white cursor-not-allowed'
                : 'bg-black text-white hover:bg-gray-900'
              }
            `}
          >
            Add to Cart
          </button>

          {/* Trusted Supplier Banner */}
          <div 
            className="mt-6 text-white py-4 px-6 rounded flex items-center justify-center space-x-2 bg-cover bg-center"
            style={{ backgroundImage: 'url("/notification-bg.webp")' }}
          >
            <Lock className="w-5 h-5" />
            <span className="font-medium">Trusted Supplier for over 10 Years</span>
            <CheckCircle className="w-5 h-5" />
          </div>

          {/* Additional Information */}
          {product.additionalInformation && (
            <div className="mt-8">
              <div 
                dangerouslySetInnerHTML={{ __html: product.additionalInformation }} 
                className="prose prose-sm max-w-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* Related Products */}
      <div className="mt-12">
        <RelatedProducts />
      </div>

      {/* Add Snackbar at the end of the component */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity="success"
          sx={{
            width: '100%',
            backgroundColor: '#4CAF50',
            color: 'white',
            '& .MuiAlert-icon': {
              color: 'white'
            },
            '& .MuiAlert-action': {
              color: 'white'
            }
          }}
        >
          {`${product.name} added to cart!`}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default memo(ProductContent);
