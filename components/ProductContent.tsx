"use client";

import { useState, memo } from 'react';
import Image from 'next/image';
import { useCart } from '@/lib/cartContext';
import { useToast } from '@/components/ui/use-toast';
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
        .filter((attr: { name: string; value: string }) => attr.name === attrName)
        .map((attr: { name: string; value: string }) => attr.value)
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
      const matchesCurrentAttr = attrs.some((attr: { name: string; value: string }) => 
        attr.name.toLowerCase() === normalizedAttrName && 
        attr.value.toLowerCase() === normalizedAttrValue
      );

      // If no other attribute is selected, just check this one
      if (!otherAttrValue) {
        return matchesCurrentAttr;
      }

      // If other attribute is selected, check both
      const matchesOtherAttr = attrs.some((attr: { name: string; value: string }) => 
        attr.name.toLowerCase() === otherAttrName && 
        attr.value.toLowerCase() === otherAttrValue
      );

      return matchesCurrentAttr && matchesOtherAttr;
    });

    // Check if any matching variation is in stock
    return matchingVariations.some(variation => 
      variation.stockStatus === 'IN_STOCK' && 
      (typeof variation.stockQuantity === 'undefined' || variation.stockQuantity === null || variation.stockQuantity > 0)
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

  const handleAttributeChange = (attributeName: string, value: string) => {
    setSelectedAttributes(prevAttributes => {
      const newAttributes = { ...prevAttributes, [attributeName]: value };
      
      // Check if this combination exists in variations
      if (product.__typename === 'VariableProduct') {
        const matchingVariation = product.variations.nodes.find((variation: ProductVariation) => {
          return variation.attributes.nodes.every((attr: { name: string; value: string }) => 
            newAttributes[attr.name]?.toLowerCase() === attr.value.toLowerCase()
          );
        });
        
        console.log('Matching variation:', matchingVariation);
      }
      
      return newAttributes;
    });
  };

  const getSelectedVariation = () => {
    if (!isVariableProduct) return null;

    return getVariations(product)?.nodes.find(variation =>
      variation.attributes.nodes.every((attr: { name: string; value: string }) =>
        selectedAttributes[attr.name] === attr.value
      )
    );
  };

  const selectedVariation = getSelectedVariation();
  const stockQuantity = selectedVariation ? (selectedVariation.stockQuantity !== null ? selectedVariation.stockQuantity : 0) : 0;

  const getVariationStockInfo = (attrName: string, value: string) => {
    if (!isVariableProduct || !product.variations) return null;

    const matchingVariations = product.variations.nodes.filter(variation => {
      const attrs = variation.attributes.nodes;
      const matchesCurrentAttr = attrs.some((attr: { name: string; value: string }) => 
        attr.name === attrName && 
        attr.value === value
      );

      // If other attribute is selected, check if this variation matches it
      const otherAttrName = attrName === 'pa_color' ? 'pa_size' : 'pa_color';
      const otherAttrValue = selectedAttributes[otherAttrName];
      if (otherAttrValue) {
        const matchesOtherAttr = attrs.some((attr: { name: string; value: string }) => 
          attr.name === otherAttrName && 
          attr.value === otherAttrValue
        );
        return matchesCurrentAttr && matchesOtherAttr;
      }

      return matchesCurrentAttr;
    });

    if (matchingVariations.length === 0) return null;

    // Get total stock quantity for this variation
    const totalStock = matchingVariations.reduce((sum, variation) => {
      return sum + (variation.stockQuantity || 0);
    }, 0);

    return totalStock;
  };

  const handleQuantityChange = (newQuantity: number) => {
    const maxQuantity = selectedVariation ? selectedVariation.stockQuantity || 0 : 0;
    if (newQuantity > maxQuantity) {
      toast({
        title: "Warning",
        description: `Only ${maxQuantity} items available in stock`,
        variant: "destructive",
        duration: 1500,
      });
      setQuantity(maxQuantity);
    } else {
      setQuantity(newQuantity);
    }
  };

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
                  {(!product.stockQuantity || product.stockQuantity > 0) && 
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
              {(!selectedVariation.stockQuantity || selectedVariation.stockQuantity > 0) && 
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

  const isVariationInStock = (variation: ProductVariation) => {
    return variation.stockStatus === 'IN_STOCK' && 
           (!variation.stockQuantity || variation.stockQuantity > 0);
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
          (attr: { name: string; value: string }) => normalizeAttributeName(attr.name) === selectedAttrName
        );
      });

      return matchesCurrentAttr && matchesOtherAttr;
    });

    // Check if any matching variation is in stock
    return matchingVariations.some(isVariationInStock);
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

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12">
        {/* Left Column - Product Image */}
        <div>
          {/* Mobile Gallery Layout (stack thumbnails under main image) */}
          <div className="flex flex-col md:hidden gap-4">
            {/* Main Image for Mobile */}
            <div className="relative w-full h-[350px]">
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
                      padding: '8px',
                      backgroundColor: 'white',
                    }}
                    quality={90}
                    priority={true}
                    sizes="100vw"
                    className="rounded-lg shadow-sm"
                  />
                </motion.div>
              </AnimatePresence>

              {totalImages > 1 && (
                <div className="absolute inset-0 flex items-center justify-between p-2">
                  <button
                    onClick={prevImage}
                    className="p-1 rounded-full bg-white/80 hover:bg-white shadow-lg transition-all"
                    aria-label="Previous image"
                  >
                    <ChevronLeftIcon className="w-5 h-5 text-gray-800" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="p-1 rounded-full bg-white/80 hover:bg-white shadow-lg transition-all"
                    aria-label="Next image"
                  >
                    <ChevronRightIcon className="w-5 h-5 text-gray-800" />
                  </button>
                </div>
              )}
            </div>

            {/* Horizontal Thumbnails for Mobile */}
            {totalImages > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 px-1">
                {allImages.map((image, index) => (
                  <button
                    key={index}
                    className={`relative w-16 h-16 flex-shrink-0 rounded-md overflow-hidden border-2 transition-all ${
                      currentImageIndex === index ? 'border-primary' : 'border-transparent'
                    }`}
                    onClick={() => setCurrentImageIndex(index)}
                  >
                    <Image
                      src={getSafeImageUrl(image, index)}
                      alt={`Product thumbnail ${index + 1}`}
                      fill
                      style={{ objectFit: 'cover' }}
                      className="transition-transform duration-300 hover:scale-110"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Desktop Gallery Layout (thumbnails on left of main image) */}
          <div className="hidden md:flex flex-row gap-4">
            {/* Thumbnail Gallery - Now on the left */}
            {totalImages > 1 && (
              <div className="flex flex-col gap-3 h-[600px] overflow-y-auto pr-2">
                {allImages.map((image, index) => (
                  <button
                    key={index}
                    className={`relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                      currentImageIndex === index ? 'border-primary' : 'border-transparent'
                    }`}
                    onMouseEnter={() => setCurrentImageIndex(index)}
                    onClick={() => setCurrentImageIndex(index)}
                  >
                    <Image
                      src={getSafeImageUrl(image, index)}
                      alt={`Product thumbnail ${index + 1}`}
                      fill
                      style={{ objectFit: 'cover' }}
                      className="transition-transform duration-300 hover:scale-110"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Main Product Image - Now on the right */}
            <div className="relative flex-grow h-[600px]">
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
          </div>
        </div>

        {/* Right Column - Product Details */}
        <div className="space-y-4 md:space-y-6 px-1 md:px-0">
          <div>
            <h1 className="text-xl md:text-3xl font-lato font-bold text-gray-800 mb-2 md:mb-4">{product.name}</h1>
            <p className="text-lg md:text-2xl font-lato font-bold text-primary mb-4 md:mb-6">
              {formatPrice(
                isVariableProduct
                  ? selectedVariation?.salePrice || selectedVariation?.regularPrice
                  : product.salePrice || product.regularPrice || product.price
              )}
            </p>
            
            <div className="prose prose-sm md:prose-base max-w-none mb-4 md:mb-8" 
              dangerouslySetInnerHTML={{ __html: product.description || '' }} 
            />
          </div>

          {/* Variation Selection */}
          {isVariableProduct && product.attributes?.nodes && (
            <div className="space-y-3">
              {product.attributes.nodes.map((attribute) => (
                <div key={attribute.name} className="mb-2">
                  <label className="block text-sm font-lato font-medium text-gray-700 mb-1">
                    {displayAttributeName(attribute.name)}:
                  </label>
                  <div className="flex flex-wrap gap-1 md:gap-2">
                    {attribute.options?.map((option) => {
                      const isAvailable = isOptionAvailable(attribute.name, option);
                      return (
                        <button
                          key={option}
                          onClick={() => handleAttributeChange(attribute.name, option)}
                          className={`
                            min-w-[28px] h-[28px] md:min-w-[32px] md:h-[32px] flex items-center justify-center
                            px-2 border rounded
                            font-lato text-xs md:text-sm font-medium transition-all
                            ${
                              selectedAttributes[attribute.name] === option
                                ? 'border-black bg-black text-white'
                                : isAvailable
                                  ? 'border-gray-300 hover:border-black hover:bg-gray-50 text-gray-700'
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

          {/* Stock Quantity Display */}
          {selectedVariation && (
            <div className="font-lato text-sm md:text-base text-green-600">
              {selectedVariation.stockQuantity} in stock
            </div>
          )}

          {/* Quantity Selector */}
          <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-4 md:mt-6">
            <span className="text-sm md:text-base font-lato font-medium text-gray-700">Quantity:</span>
            <div className="flex items-center">
              <button
                onClick={() => handleQuantityChange(Math.max(1, quantity - 1))}
                className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center border border-gray-300 text-gray-600 hover:border-black"
                disabled={quantity <= 1}
              >
                -
              </button>
              <input
                type="text"
                value={quantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val) && val > 0) {
                    handleQuantityChange(val);
                  }
                }}
                className="w-10 md:w-12 h-7 md:h-8 text-center border-t border-b border-gray-300 font-lato text-sm md:text-base"
              />
              <button
                onClick={() => handleQuantityChange(quantity + 1)}
                className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center border border-gray-300 text-gray-600 hover:border-black"
                disabled={selectedVariation ? quantity >= (selectedVariation.stockQuantity || 0) : true}
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
              w-full py-2 md:py-3 text-sm md:text-base font-lato font-medium transition-colors mt-3 md:mt-4 rounded
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
            className="mt-4 md:mt-6 text-white py-3 md:py-4 px-4 md:px-6 rounded flex items-center justify-center gap-1 md:gap-2 bg-cover bg-center"
            style={{ backgroundImage: 'url("/notification-bg.webp")' }}
          >
            <Lock className="w-4 h-4 md:w-5 md:h-5" />
            <span className="font-lato font-medium text-sm md:text-base">Trusted Supplier for over 10 Years</span>
            <CheckCircle className="w-4 h-4 md:w-5 md:h-5" />
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

      {/* Related Products Section */}
      <div className="mt-10 md:mt-16 border-t border-gray-200 pt-6 md:pt-10 px-2 md:px-0">
        <h2 className="text-lg md:text-2xl font-lato font-bold mb-4 md:mb-6 text-center text-gray-800">
          You Might Also Like
        </h2>
        <RelatedProducts />
      </div>

      {/* Snackbar for add to cart notification */}
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
