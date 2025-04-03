"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useCart } from '@/lib/cartContext';
import { useToast } from '@/components/ui/use-toast';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';
import { Snackbar, Alert } from '@mui/material';
import RelatedProducts from './RelatedProducts';

// Debug configuration
const DEBUG_MODE = true;

// Constants for stock status
const STOCK_STATUS_IN_STOCK = 'instock';
const STOCK_STATUS_OUT_OF_STOCK = 'outofstock';

interface ProductContentSimplifiedProps {
  product: any;
}

const ProductContentSimplified = ({ product: initialProduct }: ProductContentSimplifiedProps) => {
  // Initialize processed product state
  const [product, setProduct] = useState<any>(null);
  const { addToCart } = useCart();
  const { toast } = useToast();

  // Product selection state
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [maxQuantity, setMaxQuantity] = useState(99);
  const [currentStockStatus, setCurrentStockStatus] = useState(STOCK_STATUS_IN_STOCK);
  const [currentStockQuantity, setCurrentStockQuantity] = useState<number | null>(null);
  const [showAddToCartSuccess, setShowAddToCartSuccess] = useState(false);

  // UI state
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<{ [key: string]: boolean }>({});

  // Process the product data on component mount
  useEffect(() => {
    if (!initialProduct) return;

    try {
      // Create a deep copy to avoid modifying the original
      const processedProduct = { ...initialProduct };

      // Process variations from JSON string if needed
      if (typeof processedProduct.variations_json === 'string' && !processedProduct.variations) {
        try {
          processedProduct.variations = JSON.parse(processedProduct.variations_json);
          if (DEBUG_MODE) {
            console.log(`DEBUG: Parsed variations_json, found ${processedProduct.variations.length} variations`);
          }
        } catch (error) {
          console.error('Error parsing variations_json:', error);
          processedProduct.variations = [];
        }
      }

      // Process attributes from JSON string if needed
      if (typeof processedProduct.attributes_json === 'string' && !processedProduct.attributes) {
        try {
          processedProduct.attributes = JSON.parse(processedProduct.attributes_json);
          if (DEBUG_MODE) {
            console.log(`DEBUG: Parsed attributes_json, found ${processedProduct.attributes.length} attributes`);
          }
        } catch (error) {
          console.error('Error parsing attributes_json:', error);
          processedProduct.attributes = [];
        }
      }

      // Set the processed product to state
      setProduct(processedProduct);

      // Log debugging info
      if (DEBUG_MODE) {
        console.log('SIMPLIFIED: Product data processed:');
        console.log(`- Name: ${processedProduct.name}`);
        console.log(`- Variations: ${processedProduct.variations?.length || 0}`);
        console.log(`- Attributes: ${processedProduct.attributes?.length || 0}`);

        // Log Black/Size 3 variation if it exists
        if (processedProduct.variations?.length > 0) {
          const blackSize3 = processedProduct.variations.find(v => {
            if (!v.attributes || !Array.isArray(v.attributes)) return false;

            const hasBlackColor = v.attributes.some(attr =>
              attr.name.toLowerCase() === 'color' &&
              attr.option?.toLowerCase() === 'black'
            );

            const hasSize3 = v.attributes.some(attr =>
              attr.name.toLowerCase() === 'size' &&
              attr.option === '3'
            );

            return hasBlackColor && hasSize3;
          });

          if (blackSize3) {
            console.log('SIMPLIFIED: Found Black/Size 3 variation:');
            console.log(`- ID: ${blackSize3.id}`);
            console.log(`- Stock Status: ${blackSize3.stock_status}`);
            console.log(`- Stock Quantity: ${blackSize3.stock_quantity}`);
          } else {
            console.log('SIMPLIFIED: Black/Size 3 variation NOT found');
          }
        }
      }
    } catch (error) {
      console.error('Error processing product data:', error);
    }
  }, [initialProduct]);

  // Helper for image handling
  const isValidImageUrl = (url: string) => {
    return url && url.startsWith('http');
  };

  const getSafeImageUrl = (url: string | null | undefined, index: number) => {
    if (!url || !isValidImageUrl(url)) {
      return 'https://exoticlive.co.za/wp-content/uploads/woocommerce-placeholder.png';
    }
    return imageErrors[`${index}-${url}`]
      ? 'https://exoticlive.co.za/wp-content/uploads/woocommerce-placeholder.png'
      : url;
  };

  // Handle image errors
  const handleImageError = (index: number, url: string) => {
    setImageErrors(prev => ({ ...prev, [`${index}-${url}`]: true }));
  };

  // Gallery navigation
  const nextImage = () => {
    if (!product) return;
    const totalImages = getProductImages().length;
    setCurrentImageIndex((prev) => (prev + 1) % totalImages);
  };

  const prevImage = () => {
    if (!product) return;
    const totalImages = getProductImages().length;
    setCurrentImageIndex((prev) => (prev - 1 + totalImages) % totalImages);
  };

  // Get all product images
  const getProductImages = () => {
    if (!product) return [];

    const images = [
      { url: product.image_url, alt: product.image_alt || product.name },
      ...(product.gallery_images || [])
    ].filter(img => isValidImageUrl(img.url));

    return images.length > 0 ? images : [{
      url: 'https://exoticlive.co.za/wp-content/uploads/woocommerce-placeholder.png',
      alt: 'Product image placeholder'
    }];
  };

  // Normalize attribute names for consistent comparison
  const normalizeAttributeName = (name: string): string => {
    if (!name) return '';

    // Convert to lowercase, trim spaces, and remove all non-alphanumeric characters
    let normalized = name.toLowerCase().trim().replace(/[^a-z0-9]/g, '');

    // Remove 'pa_' prefix if present (WooCommerce specific)
    if (normalized.startsWith('pa')) {
      normalized = normalized.substring(2);
    }

    return normalized;
  };

  // Format attribute name for display
  const formatAttributeName = (name: string): string => {
    if (!name) return 'Option';

    // Remove 'pa_' prefix if it exists
    let formattedName = name.replace(/^pa_/i, '');

    // Replace hyphens with spaces and capitalize each word
    formattedName = formattedName
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return formattedName;
  };

  // Normalize attribute values for consistent comparison
  const normalizeAttributeValue = (value: any): string => {
    if (value === null || value === undefined) return '';
    // Convert to string first to handle numeric values
    const stringValue = String(value);
    return stringValue.toLowerCase().trim();
  };

  // Check if a variation is in stock
  const isVariationInStock = (variation: any): boolean => {
    if (!variation) return false;

    // Debug log if DEBUG_MODE is enabled
    if (DEBUG_MODE) {
      console.log('Checking stock for variation:', variation.id);
      console.log('Stock status:', variation.stock_status);
      console.log('Stock quantity:', variation.stock_quantity);
    }

    // Check stock status - Typesense stores this as lowercase strings
    if (typeof variation.stock_status === 'string') {
      // Normalize to lowercase for case-insensitive comparison
      const stockStatus = variation.stock_status.toLowerCase();
      if (stockStatus === STOCK_STATUS_IN_STOCK) {
        // Also verify stock quantity if available
        if (typeof variation.stock_quantity === 'number') {
          return variation.stock_quantity > 0;
        }
        return true;
      }
    }

    // Check stock quantity as a fallback
    if (typeof variation.stock_quantity === 'number') {
      return variation.stock_quantity > 0;
    }

    // Default to out of stock if we can't determine
    return false;
  };

  // Find variation that matches the selected attributes
  const findMatchingVariation = (variations: any[] | undefined, selectedAttrs: Record<string, string>): any | null => {
    if (!variations || !Array.isArray(variations) || variations.length === 0) {
      return null;
    }

    // Get array of selected attribute names
    const selectedAttrNames = Object.keys(selectedAttrs);

    // Return null if no attributes are selected
    if (selectedAttrNames.length === 0) {
      return null;
    }

    if (DEBUG_MODE) {
      console.log('SIMPLIFIED: Finding matching variation for attributes:', selectedAttrs);
    }

    // Find variations that match ALL selected attributes
    const matchingVariations = variations.filter(variation => {
      // Skip variations without attributes
      if (!variation.attributes || !Array.isArray(variation.attributes)) {
        return false;
      }

      // Check each selected attribute
      return selectedAttrNames.every(attrName => {
        const normalizedAttrName = normalizeAttributeName(attrName);
        const normalizedAttrValue = normalizeAttributeValue(selectedAttrs[attrName]);

        // Find matching attribute in variation
        return variation.attributes.some(attr => {
          const varAttrName = normalizeAttributeName(attr.name || attr.option_name);
          const varAttrValue = normalizeAttributeValue(attr.option || attr.value);

          return varAttrName === normalizedAttrName && varAttrValue === normalizedAttrValue;
        });
      });
    });

    if (DEBUG_MODE) {
      console.log(`SIMPLIFIED: Found ${matchingVariations.length} matching variations`);
      if (matchingVariations.length > 0) {
        console.log('SIMPLIFIED: First matching variation:', matchingVariations[0]);
      }
    }

    // Return the first matching variation (if any)
    return matchingVariations.length > 0 ? matchingVariations[0] : null;
  };

  // Handle attribute selection
  const handleAttributeChange = (attrName: string, attrValue: string) => {
    if (DEBUG_MODE) {
      console.log(`SIMPLIFIED: Selected ${attrName} = ${attrValue}`);
    }

    const newSelectedAttrs = {
      ...selectedAttributes,
      [attrName]: attrValue
    };

    setSelectedAttributes(newSelectedAttrs);

    // Find matching variation and update stock status
    const matchingVariation = findMatchingVariation(product?.variations, newSelectedAttrs);

    if (matchingVariation) {
      const inStock = isVariationInStock(matchingVariation);

      if (DEBUG_MODE) {
        console.log('SIMPLIFIED: Matching variation found:', {
          id: matchingVariation.id,
          stockStatus: matchingVariation.stock_status,
          stockQuantity: matchingVariation.stock_quantity,
          inStock: inStock
        });
      }

      // Update current stock status and quantity
      setCurrentStockStatus(inStock ? STOCK_STATUS_IN_STOCK : STOCK_STATUS_OUT_OF_STOCK);
      setCurrentStockQuantity(typeof matchingVariation.stock_quantity === 'number'
        ? matchingVariation.stock_quantity
        : null);

      // Update max quantity based on stock
      if (typeof matchingVariation.stock_quantity === 'number' && matchingVariation.stock_quantity > 0) {
        setMaxQuantity(matchingVariation.stock_quantity);
        // Ensure quantity doesn't exceed stock
        if (quantity > matchingVariation.stock_quantity) {
          setQuantity(matchingVariation.stock_quantity);
        }
      } else {
        setMaxQuantity(inStock ? 99 : 0);
      }
    } else {
      // No matching variation, set to default values
      setCurrentStockStatus(STOCK_STATUS_OUT_OF_STOCK);
      setCurrentStockQuantity(null);
      setMaxQuantity(0);
    }
  };

  // Check if attribute option is available (in stock)
  const isAttributeOptionAvailable = (attrName: string, option: string): boolean => {
    // If no variations, all options are available
    if (!product?.variations || !Array.isArray(product.variations) || product.variations.length === 0) {
      return true;
    }

    // Create a copy of current selections with this option
    const testSelections = {
      ...selectedAttributes,
      [attrName]: option
    };

    // Check if any variation matches these selections
    const hasMatchingVariation = product.variations.some(variation => {
      if (!variation.attributes || !Array.isArray(variation.attributes)) {
        return false;
      }

      // For each attribute in our test selection, check if variation matches
      return Object.entries(testSelections).every(([name, value]) => {
        const normalizedName = normalizeAttributeName(name);
        const normalizedValue = normalizeAttributeValue(value as string);

        // Find matching attribute in variation
        return variation.attributes.some(attr => {
          const varAttrName = normalizeAttributeName(attr.name || attr.option_name);
          const varAttrValue = normalizeAttributeValue(attr.option || attr.value);

          return varAttrName === normalizedName && varAttrValue === normalizedValue;
        });
      });
    });

    return hasMatchingVariation;
  };

  // Check if all required attributes are selected
  const areAllAttributesSelected = (): boolean => {
    if (!product || !product.attributes || !Array.isArray(product.attributes)) {
      return true;
    }

    // Get variation attributes only
    const variationAttributes = product.attributes.filter(attr => attr.variation !== false);

    // Check if all variation attributes have been selected
    return variationAttributes.every(attr => {
      const attrName = attr.name;
      return !!selectedAttributes[attrName];
    });
  };

  // Reset all attribute selections
  const handleClearSelections = () => {
    setSelectedAttributes({});
    setCurrentStockStatus(STOCK_STATUS_IN_STOCK);
    setCurrentStockQuantity(null);
    setMaxQuantity(99);

    if (DEBUG_MODE) {
      console.log('SIMPLIFIED: Cleared all attribute selections');
    }
  };

  // Handle quantity changes
  const incrementQuantity = () => {
    if (currentStockQuantity !== null && quantity >= currentStockQuantity) {
      return;
    }
    if (quantity < maxQuantity) {
      setQuantity(prev => prev + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  // Add to cart function
  const handleAddToCart = () => {
    if (!product) return;

    // Check if all required attributes are selected
    if (!areAllAttributesSelected()) {
      toast({
        title: "Please select all options",
        description: "You need to select all product options before adding to cart",
        variant: "destructive"
      });
      return;
    }

    // Check stock status
    if (currentStockStatus !== STOCK_STATUS_IN_STOCK) {
      toast({
        title: "Out of Stock",
        description: "This product is currently out of stock",
        variant: "destructive"
      });
      return;
    }

    // Find the matching variation to add to cart
    const variation = findMatchingVariation(product.variations, selectedAttributes);

    if (!variation) {
      toast({
        title: "Selection not available",
        description: "The selected combination is not available",
        variant: "destructive"
      });
      return;
    }

    // Format variation attributes for display
    const attributeDisplay = Object.entries(selectedAttributes)
      .map(([name, value]) => `${formatAttributeName(name)}: ${value}`)
      .join(', ');

    // Create cart item
    const cartItem = {
      id: variation.id || product.id,
      variationId: variation.id || '',
      name: product.name,
      price: variation.price || product.price,
      quantity: quantity,
      image: product.image_url,
      variationName: attributeDisplay,
      stockQuantity: variation.stock_quantity || null,
      stockStatus: variation.stock_status || 'instock',
      attributes: Object.entries(selectedAttributes).map(([name, value]) => ({
        name: formatAttributeName(name),
        value: value
      })),
      product_id: product.id,
      variation_id: variation.id
    };

    // Add to cart
    addToCart(cartItem);

    // Show success message
    setShowAddToCartSuccess(true);

    if (DEBUG_MODE) {
      console.log('SIMPLIFIED: Added to cart:', cartItem);
    }
  };

  // Render loading state
  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading product details...</p>
        </div>
      </div>
    );
  }

  // Get the product images for gallery
  const images = getProductImages();
  const currentImage = images[currentImageIndex];

  return (
    <div className="bg-white">
      {/* Product section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Product gallery with thumbnails on left for desktop, stack for mobile */}
          <div className="flex flex-col md:flex-row gap-2 md:gap-4">
            {/* Thumbnails on left for desktop */}
            {images.length > 1 && (
              <div className="order-2 md:order-1 md:w-1/5 flex flex-row md:flex-col gap-2 mt-2 md:mt-0">
                {images.map((image, index) => (
                  <div
                    key={index}
                    className={`aspect-square cursor-pointer border rounded overflow-hidden ${
                      currentImageIndex === index ? 'border-black' : 'border-gray-200'
                    }`}
                    onClick={() => setCurrentImageIndex(index)}
                    onMouseEnter={() => setCurrentImageIndex(index)}
                  >
                    <Image
                      src={getSafeImageUrl(image.url, index)}
                      alt={image.alt || `Product thumbnail ${index + 1}`}
                      width={100}
                      height={100}
                      className="object-contain w-full h-full"
                      onError={() => handleImageError(index, image.url)}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Main image */}
            <div className="order-1 md:order-2 md:w-4/5 bg-[#f5f5f5] rounded-lg overflow-hidden shadow-sm relative aspect-square">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentImageIndex}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-full h-full flex items-center justify-center"
                >
                  <Image
                    src={getSafeImageUrl(currentImage.url, currentImageIndex)}
                    alt={currentImage.alt || product.name}
                    width={500}
                    height={500}
                    className="object-contain w-full h-full"
                    onError={() => handleImageError(currentImageIndex, currentImage.url)}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Product details */}
          <div className="flex flex-col">
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-2">{product.name}</h1>

            {/* Price */}
            <div className="mb-4 flex items-center">
              {product.sale_price && product.sale_price < product.regular_price ? (
                <>
                  <span className="text-xl md:text-2xl font-bold text-gray-900 mr-2">R{product.sale_price}</span>
                  <span className="text-md md:text-xl text-gray-500 line-through">R{product.regular_price}</span>
                </>
              ) : (
                <span className="text-xl md:text-2xl font-bold text-gray-900">R{product.price}</span>
              )}
            </div>

            {/* Product description */}
            <div className="mb-6">
              <div className="prose prose-sm max-w-none text-gray-600"
                dangerouslySetInnerHTML={{ __html: product.description || product.short_description || '' }}
              />
            </div>

            <div className="space-y-6">
              {/* Attribute selection - small, mobile friendly */}
              {product.attributes && product.attributes.length > 0 && (
                <div className="mt-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-medium text-gray-900">Product Options</h3>
                    {Object.keys(selectedAttributes).length > 0 && (
                      <button
                        onClick={handleClearSelections}
                        className="text-xs font-lato text-gray-500 hover:text-black underline decoration-dotted underline-offset-2"
                      >
                        Clear Selections
                      </button>
                    )}
                  </div>

                  {product.attributes.map((attribute, attrIndex) => (
                    <div key={attrIndex}>
                      <h3 className="text-sm font-medium text-gray-900 mb-1.5">
                        {formatAttributeName(attribute.name)}
                      </h3>
                      <div className="flex flex-wrap gap-2 md:gap-2">
                        {attribute.options.map((option, optIndex) => {
                          const isSelected = selectedAttributes[attribute.name] === option;
                          const isAvailable = isAttributeOptionAvailable(attribute.name, option);

                          return (
                            <button
                              key={optIndex}
                              className={`
                                px-4 py-3 md:px-3 md:py-1.5
                                rounded-md
                                text-base md:text-sm
                                font-medium
                                border transition-all
                                min-w-[60px] min-h-[50px] md:min-h-[32px]
                                mb-2 md:mb-1
                                ${isSelected
                                  ? 'bg-black text-white border-black'
                                  : isAvailable
                                    ? 'bg-white text-gray-800 border-gray-300 hover:border-black'
                                    : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                }
                              `}
                              onClick={() => isAvailable && handleAttributeChange(attribute.name, option)}
                              disabled={!isAvailable}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Stock status */}
              <div className="mt-4">
                {!areAllAttributesSelected() ? (
                  <p className="text-amber-600 font-medium">Please select all options</p>
                ) : currentStockStatus === STOCK_STATUS_IN_STOCK ? (
                  <p className="text-green-600 font-medium">
                    In Stock
                    {currentStockQuantity !== null && currentStockQuantity <= 5 && (
                      <span> (Only {currentStockQuantity} left)</span>
                    )}
                  </p>
                ) : (
                  <p className="text-red-600 font-medium">Out of Stock</p>
                )}
              </div>

              {/* Quantity selector */}
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Quantity</h3>
                <div className="flex items-center">
                  <button
                    onClick={decrementQuantity}
                    disabled={quantity <= 1 || currentStockStatus !== STOCK_STATUS_IN_STOCK}
                    className="border border-gray-300 rounded-l-md p-2 disabled:opacity-50"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <div className="w-12 border-t border-b border-gray-300 py-2 text-center">
                    {quantity}
                  </div>
                  <button
                    onClick={incrementQuantity}
                    disabled={quantity >= maxQuantity || currentStockStatus !== STOCK_STATUS_IN_STOCK}
                    className="border border-gray-300 rounded-r-md p-2 disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Add to cart button */}
              <Button
                onClick={handleAddToCart}
                disabled={!areAllAttributesSelected() || currentStockStatus !== STOCK_STATUS_IN_STOCK}
                className="w-full mt-6 bg-black hover:bg-gray-800 text-white py-3 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {!areAllAttributesSelected()
                  ? "Select Options"
                  : currentStockStatus !== STOCK_STATUS_IN_STOCK
                    ? "Out of Stock"
                    : "Add to Cart"
                }
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products Section */}
      <div className="mt-10 md:mt-16 border-t border-gray-200 pt-6 md:pt-10 px-2 md:px-0">
        <h2 className="text-lg md:text-2xl font-lato font-bold mb-6 text-center text-gray-800">
          You Might Also Like
        </h2>
        <RelatedProducts />
      </div>

      {/* Success notification */}
      <Snackbar
        open={showAddToCartSuccess}
        autoHideDuration={3000}
        onClose={() => setShowAddToCartSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setShowAddToCartSuccess(false)}
          severity="success"
          sx={{ width: '100%' }}
        >
          Product added to cart!
        </Alert>
      </Snackbar>
    </div>
  );
};

export default ProductContentSimplified;
