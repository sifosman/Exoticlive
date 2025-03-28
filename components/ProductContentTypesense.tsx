"use client";

import { useState, memo, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useCart } from '@/lib/cartContext';
import { useToast } from '@/components/ui/use-toast';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, CheckCircle, XCircle, RefreshCcw, Info, Minus, Plus } from 'lucide-react';
import { Snackbar, Alert } from '@mui/material';
import { Product as TypesenseProduct } from '@/utils/typesense-search';

// Debug configuration
const DEBUG_MODE = true; // Enable verbose logging
const ASSUME_ALL_IN_STOCK = false; // Do NOT force all items to appear in stock
const HIGHLIGHT_STOCK_STATUS = true; // Highlight stock status for debugging
const STOCK_STATUS_IN_STOCK = 'instock';
const STOCK_STATUS_OUT_OF_STOCK = 'outofstock';

interface ProductContentTypesenseProps {
  product: TypesenseProduct;
}

const ProductContentTypesense = ({ product }: ProductContentTypesenseProps) => {
  if (!product) {
    return <div>Loading...</div>;
  }

  // Debug information for product data
  if (DEBUG_MODE) {
    console.log('DEBUG: ProductContentTypesense rendered with:');
    console.log(`  - Product: ${product?.name || 'Undefined'}`);
    console.log(`  - Attributes: ${product?.attributes?.length || 0}`);
    console.log(`  - Variations: ${product?.variations?.length || 0}`);
    console.log(`  - Data Source: ${JSON.stringify(product?._dataSource || {})}`);
    console.log(`  - Stock Status: ${product?.stock_status || 'Unknown'}`);
    
    // Verify attribute structure
    if (product?.attributes?.length > 0) {
      product.attributes.forEach((attr, i) => {
        console.log(`DEBUG: Attribute ${i} structure:`, {
          name: attr.name,
          options: attr.options,
          optionsLength: attr.options?.length,
          variation: attr.variation
        });
      });
    }
    
    // Log variations detail if any
    if (product?.variations?.length > 0) {
      console.log('DEBUG: First 3 variations:');
      product.variations.slice(0, 3).forEach((variation, index) => {
        console.log(`  Variation ${index}:`);
        console.log(`    - ID: ${variation.id || 'Unknown'}`);
        console.log(`    - Stock Status: ${variation.stock_status || 'Unknown'}`);
        console.log(`    - Stock Quantity: ${variation.stock_quantity || 'Unknown'}`);
        console.log(`    - Attributes:`, variation.attributes || []);
      });
    }
    
    // Log attributes detail if any
    if (product?.attributes?.length > 0) {
      console.log('DEBUG: Attributes:');
      product.attributes.forEach((attribute, index) => {
        console.log(`  Attribute ${index}:`);
        console.log(`    - Name: ${attribute.name || 'Unknown'}`);
        console.log(`    - Options: ${JSON.stringify(attribute.options || [])}`);
        console.log(`    - Variation: ${attribute.variation || false}`);
      });
    }
  }

  // Check if we have variation data for this product
  const hasVariations = !!product.variations && Array.isArray(product.variations) && product.variations.length > 0 && product.variations.some(variation => variation.id !== product.id);
  const isVariableProduct = hasVariations;
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState<number>(1);
  const [maxQuantity, setMaxQuantity] = useState<number>(10); // Maximum allowed quantity based on stock
  const [currentPrice, setCurrentPrice] = useState<number>(parseFloat(product?.price || '0'));
  const [currentSalePrice, setCurrentSalePrice] = useState<number | null>(product?.sale_price ? parseFloat(product.sale_price) : null);
  const [currentRegularPrice, setCurrentRegularPrice] = useState<number>(parseFloat(product?.regular_price || product?.price || '0'));
  const [currentStockStatus, setCurrentStockStatus] = useState<string>(product?.stock_status || '');
  const [currentQuantity, setCurrentQuantity] = useState<number | null>(null);
  const [derivedAttributeOptions, setDerivedAttributeOptions] = useState<Record<string, string[]>>({});

  const { addToCart } = useCart();
  const { toast } = useToast();
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<{ [key: string]: boolean }>({});

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

  const allImages = [
    { url: product.image_url, alt: product.image_alt },
    ...(product.gallery_images || [])
  ].filter(img => isValidImageUrl(img.url));

  const totalImages = allImages.length;

  const handleImageError = (index: number, url: string) => {
    setImageErrors(prev => ({ ...prev, [`${index}-${url}`]: true }));
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % totalImages);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + totalImages) % totalImages);
  };

  // Handle attribute selections
  const handleAttributeSelection = (attributeName: string, attributeValue: string) => {
    const newAttributes = { ...selectedAttributes };
    
    // If the same value is already selected, deselect it
    if (selectedAttributes[attributeName] === attributeValue) {
      delete newAttributes[attributeName];
      setSelectedAttributes(newAttributes);
      
      if (DEBUG_MODE) {
        console.log(`DEBUG: Deselected ${attributeName}=${attributeValue}`);
      }
    } 
    // Otherwise, select this new value
    else {
      newAttributes[attributeName] = attributeValue;
      setSelectedAttributes(newAttributes);
      
      if (DEBUG_MODE) {
        console.log(`DEBUG: Selected ${attributeName}=${attributeValue}`);
        console.log('DEBUG: New selected attributes:', newAttributes);
      }
    }
    
    // Find matching variation based on the new attribute selection
    if (product?.variations && Array.isArray(product.variations)) {
      const matchingVariation = findMatchingVariation(product.variations, newAttributes);
      
      if (matchingVariation) {
        if (DEBUG_MODE) {
          console.log('DEBUG: Found matching variation for selection:', matchingVariation);
          console.log('DEBUG: Variation ID:', matchingVariation.variation_id);
          console.log('DEBUG: Variation stock status:', matchingVariation.stock_status);
          console.log('DEBUG: Variation stock quantity:', matchingVariation.stock_quantity);
        }
        
        // Update current price and stock information directly
        setCurrentPrice(parseFloat(matchingVariation.price || '0'));
        setCurrentSalePrice(matchingVariation.sale_price 
          ? parseFloat(matchingVariation.sale_price) 
          : parseFloat(matchingVariation.price || '0'));
        
        // Get stock quantity - respect the actual value from WooCommerce
        const rawStockQuantity = matchingVariation.stock_quantity;
        const stockQuantity = matchingVariation.manage_stock === true
          ? (typeof rawStockQuantity === 'number' ? rawStockQuantity : 0) 
          : null;
        
        // Normalize stock status
        let stockStatus = STOCK_STATUS_OUT_OF_STOCK;
        
        // Determine stock status from the variation - respect WooCommerce value
        if (typeof matchingVariation.stock_status === 'string') {
          const rawStatus = matchingVariation.stock_status.toLowerCase();
          if (rawStatus === 'instock' || rawStatus === 'in_stock') {
            stockStatus = STOCK_STATUS_IN_STOCK;
          }
        }
        
        // Override status based on quantity if manage_stock is true
        if (matchingVariation.manage_stock === true && stockQuantity <= 0) {
          stockStatus = STOCK_STATUS_OUT_OF_STOCK;
        }
        
        if (DEBUG_MODE) {
          console.log('DEBUG: Stock data for variation', matchingVariation.id);
          console.log('  - Raw status:', matchingVariation.stock_status);
          console.log('  - Computed status:', stockStatus);
          console.log('  - Raw quantity:', rawStockQuantity);
          console.log('  - Computed quantity:', stockQuantity); 
        }
        
        // Update stock status and quantity
        setCurrentStockStatus(stockStatus);
        setCurrentQuantity(stockQuantity);
        
        // Adjust max quantity based on stock
        if (stockStatus === STOCK_STATUS_IN_STOCK) {
          if (matchingVariation.manage_stock === true && typeof stockQuantity === 'number') {
            // Use exact WooCommerce quantity
            setMaxQuantity(stockQuantity);
          } else {
            // When manage_stock is false but status is in stock
            setMaxQuantity(99);
          }
          setQuantity(1); // Set to 1 to show it's in stock and can be added
        } else {
          setMaxQuantity(0);
          setQuantity(0); // Set to 0 to show it's out of stock
        }
      }
    }
  };

  // Function to normalize attribute names for consistent comparison
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

  // Function to normalize attribute values for consistent comparison
  const normalizeAttributeValue = (value: string): string => {
    if (!value) return '';
    return value.toLowerCase().trim();
  };

  // Function to find the variation that matches the selected attributes
  const findMatchingVariation = (variations, selectedAttrs) => {
    if (DEBUG_MODE) {
      console.log('========= VARIATION MATCHING STARTED =========');
      console.log('DEBUG: Finding matching variation...');
      console.log('DEBUG: Selected attributes:', selectedAttrs);
      
      // Count attributes for easier debugging
      const colorOptions = [...new Set(variations.map(v => 
        v.attributes?.pa_color || v.attributes?.color || null).filter(Boolean))];
      const sizeOptions = [...new Set(variations.map(v => 
        v.attributes?.pa_size || v.attributes?.size || null).filter(Boolean))];
      
      console.log(`DEBUG: Product has ${colorOptions.length} colors and ${sizeOptions.length} sizes`);
      console.log(`DEBUG: Total possible variations: ${colorOptions.length * sizeOptions.length}`);
      console.log(`DEBUG: Actual variations provided: ${variations.length}`);
      
      console.log('DEBUG: Available colors:', colorOptions);  
      console.log('DEBUG: Available sizes:', sizeOptions);

      // Check what we've actually selected
      const selectedColor = selectedAttrs['pa_color'] || selectedAttrs['color'];
      const selectedSize = selectedAttrs['pa_size'] || selectedAttrs['size'];
      console.log(`DEBUG: Selected color: "${selectedColor}", Selected size: "${selectedSize}"`);
    }

    // If no attributes selected or no variations, return null
    if (!selectedAttrs || Object.keys(selectedAttrs).length === 0 || !variations || !Array.isArray(variations)) {
      if (DEBUG_MODE) console.log('DEBUG: No attributes selected or no variations available');
      return null;
    }

    // First, check if we have the exact combination
    const exactMatch = variations.find(variation => {
      // Skip if no attributes
      if (!variation.attributes) return false;
      
      // Check if all selected attributes match this variation
      return Object.entries(selectedAttrs).every(([attrName, attrValue]) => {
        const normalizedName = normalizeAttributeName(attrName);
        const normalizedValue = normalizeAttributeValue(attrValue);
        
        // Check if this attribute exists in the variation with matching value
        return Object.entries(variation.attributes).some(([varAttrName, varAttrValue]) => {
          return normalizeAttributeName(varAttrName) === normalizedName && 
                 normalizeAttributeValue(varAttrValue) === normalizedValue;
        });
      });
    });
    
    if (exactMatch) {
      if (DEBUG_MODE) {
        console.log(`DEBUG: ✅ FOUND EXACT MATCH:`, {
          id: exactMatch.id,
          stock_status: exactMatch.stock_status,
          attributes: Object.entries(exactMatch.attributes)
            .map(([k, v]) => `${k}=${v}`)
            .join(', ')
        });
      }
      return exactMatch;
    }
    
    // Check for size/color matches to debug
    if (DEBUG_MODE) {
      const colorValue = selectedAttrs['pa_color'] || selectedAttrs['color'];
      const sizeValue = selectedAttrs['pa_size'] || selectedAttrs['size'];
      
      if (colorValue) {
        const colorMatches = variations.filter(v => 
          v.attributes && 
          (v.attributes.pa_color === colorValue || v.attributes.color === colorValue)
        );
        console.log(`DEBUG: Found ${colorMatches.length} variations with color "${colorValue}"`);
      }
      
      if (sizeValue) {
        const sizeMatches = variations.filter(v => 
          v.attributes && 
          (v.attributes.pa_size === sizeValue || v.attributes.size === sizeValue)
        );
        console.log(`DEBUG: Found ${sizeMatches.length} variations with size "${sizeValue}"`);
        
        // Log the first few matches for debugging
        sizeMatches.slice(0, 2).forEach((match, i) => {
          console.log(`DEBUG: Size match ${i}: {id: ${match.id}, stock_status: '${match.stock_status}', attributes: '${
            Object.entries(match.attributes)
              .map(([k, v]) => `${k}=${v}`)
              .join(', ')
          }'}`);
        });
      }
    }
    
    // Try to find a match using filter approach
    let candidates = [...variations];
    
    // For debugging
    if (DEBUG_MODE) {
      Object.entries(selectedAttrs).forEach(([attrName, attrValue]) => {
        console.log(`DEBUG: Filtering by attribute: ${normalizeAttributeName(attrName)}=${attrValue}`);
        console.log(`DEBUG: Starting with ${candidates.length} candidates`);
        
        const beforeCount = candidates.length;
        candidates = candidates.filter(variation => {
          if (!variation.attributes) return false;
          
          // Check if this variation has the selected attribute
          return Object.entries(variation.attributes).some(([varAttrName, varAttrValue]) => {
            const varNormalizedName = normalizeAttributeName(varAttrName);
            const varNormalizedValue = normalizeAttributeValue(varAttrValue);
            const selectedNormalizedName = normalizeAttributeName(attrName);
            const selectedNormalizedValue = normalizeAttributeValue(attrValue);
            
            return varNormalizedName === selectedNormalizedName && 
                   varNormalizedValue === selectedNormalizedValue;
          });
        });
        
        console.log(`DEBUG: After filtering by ${normalizeAttributeName(attrName)}, ${candidates.length} candidates left`);
      });
      
      console.log(`DEBUG: Final candidates: ${candidates.length}`);
      
      if (candidates.length === 0) {
        console.log('DEBUG: ❌ NO MATCHING VARIATION FOUND');
      } else {
        console.log(`DEBUG: ✅ FOUND ${candidates.length} MATCHING VARIATIONS`);
        // Take the first match
        console.log('DEBUG: Using first match:', candidates[0]);
      }
    } else {
      // Filter silently in production mode
      candidates = candidates.filter(variation => {
        if (!variation.attributes) return false;
        
        return Object.entries(selectedAttrs).every(([attrName, attrValue]) => {
          const normalizedName = normalizeAttributeName(attrName);
          const normalizedValue = normalizeAttributeValue(attrValue);
          
          return Object.entries(variation.attributes).some(([varAttrName, varAttrValue]) => {
            return normalizeAttributeName(varAttrName) === normalizedName && 
                   normalizeAttributeValue(varAttrValue) === normalizedValue;
          });
        });
      });
    }
    
    if (DEBUG_MODE) console.log('========= VARIATION MATCHING COMPLETED =========');
    
    // Return the first matching variation, or null if none found
    return candidates.length > 0 ? candidates[0] : null;
  };

  // This effect runs when selected attributes change
  useEffect(() => {
    if (!product?.variations || !Array.isArray(product.variations) || product.variations.length === 0) {
      if (DEBUG_MODE) console.log('DEBUG: No variations available');
      return;
    }
    
    // Check if all necessary attributes for variation selection are selected
    const variationAttributes = product.attributes
      ?.filter(attr => attr.variation)
      ?.map(attr => attr.name) || [];
    
    if (DEBUG_MODE) {
      console.log('DEBUG: Variation attributes required:', variationAttributes);
      console.log('DEBUG: Currently selected attributes:', Object.keys(selectedAttributes));
      
      // Count total possible variations
      if (variationAttributes.length > 0) {
        let possibleVariationCount = 1;
        variationAttributes.forEach(attrName => {
          const matchingAttr = product.attributes?.find(a => a.name === attrName);
          if (matchingAttr && matchingAttr.options) {
            possibleVariationCount *= matchingAttr.options.length;
          }
        });
        console.log(`DEBUG: Possible variations based on attributes: ${possibleVariationCount}`);
        console.log(`DEBUG: Actual variations provided: ${product.variations.length}`);
      }
    }
    
    // If no attributes selected, reset everything
    if (Object.keys(selectedAttributes).length === 0) {
      setCurrentPrice(parseFloat(product?.price || '0'));
      setCurrentSalePrice(product?.sale_price ? parseFloat(product.sale_price) : null);
      setCurrentStockStatus(product?.stock_status || STOCK_STATUS_IN_STOCK);
      setCurrentQuantity(product?.stock_quantity || 10);
      return;
    }
    
    // Find matching variation based on selected attributes
    const matchingVariation = findMatchingVariation(product.variations, selectedAttributes);
    
    if (matchingVariation) {
      if (DEBUG_MODE) {
        console.log('DEBUG: Matching variation found:', matchingVariation);
        console.log('DEBUG: Variation stock data:');
        console.log('  - Stock status:', matchingVariation.stock_status);
        console.log('  - Stock quantity:', matchingVariation.stock_quantity);
        console.log('  - Manage stock:', matchingVariation.manage_stock);
      }
      
      // Update current price
      if (matchingVariation.price) {
        setCurrentPrice(parseFloat(matchingVariation.price));
      }
      
      // Update sale price
      if (matchingVariation.sale_price) {
        setCurrentSalePrice(parseFloat(matchingVariation.sale_price));
      } else {
        setCurrentSalePrice(null);
      }
      
      // Update regular price
      if (matchingVariation.regular_price) {
        setCurrentRegularPrice(parseFloat(matchingVariation.regular_price));
      }
      
      // Get stock quantity - respect the actual value from WooCommerce
      const rawStockQuantity = matchingVariation.stock_quantity;
      const stockQuantity = matchingVariation.manage_stock === true
        ? (typeof rawStockQuantity === 'number' ? rawStockQuantity : 0) 
        : null;
      
      // Normalize stock status
      let stockStatus = STOCK_STATUS_OUT_OF_STOCK;
      
      // Determine stock status from the variation - respect WooCommerce value
      if (typeof matchingVariation.stock_status === 'string') {
        const rawStatus = matchingVariation.stock_status.toLowerCase();
        if (rawStatus === 'instock' || rawStatus === 'in_stock') {
          stockStatus = STOCK_STATUS_IN_STOCK;
        }
      }
      
      // Override status based on quantity if manage_stock is true
      if (matchingVariation.manage_stock === true && stockQuantity <= 0) {
        stockStatus = STOCK_STATUS_OUT_OF_STOCK;
      }
      
      if (DEBUG_MODE) {
        console.log('DEBUG: Stock data for variation', matchingVariation.id);
        console.log('  - Raw status:', matchingVariation.stock_status);
        console.log('  - Computed status:', stockStatus);
        console.log('  - Raw quantity:', rawStockQuantity);
        console.log('  - Computed quantity:', stockQuantity); 
      }
      
      // Update stock status and quantity
      setCurrentStockStatus(stockStatus);
      setCurrentQuantity(stockQuantity);
      
      // Adjust max quantity based on stock
      if (stockStatus === STOCK_STATUS_IN_STOCK) {
        if (matchingVariation.manage_stock === true && typeof stockQuantity === 'number') {
          // Use exact WooCommerce quantity
          setMaxQuantity(stockQuantity);
        } else {
          // When manage_stock is false but status is in stock
          setMaxQuantity(99);
        }
        setQuantity(1); // Set to 1 to show it's in stock and can be added
      } else {
        setMaxQuantity(0);
        setQuantity(0); // Set to 0 to show it's out of stock
      }
    }
  }, [selectedAttributes, product]);

  useEffect(() => {
    // Extract available attribute options from existing variations only
    if (product.variations && Array.isArray(product.variations) && product.variations.length > 0) {
      // Create a derived set of attributes based only on what's in the variations
      const derivedAttributes: Record<string, string[]> = {};
      
      // Loop through each variation
      product.variations.forEach((variation: any) => {
        if (variation.attributes) {
          // For each attribute in the variation
          Object.entries(variation.attributes).forEach(([attrName, attrValue]) => {
            if (!attrValue) return;
            
            const normalizedName = normalizeAttributeName(attrName);
            
            if (!derivedAttributes[normalizedName]) {
              derivedAttributes[normalizedName] = [];
            }
            
            // Add this value if it's not already in our list
            if (!derivedAttributes[normalizedName].includes(attrValue)) {
              derivedAttributes[normalizedName].push(attrValue);
            }
          });
        }
      });
      
      if (DEBUG_MODE) {
        console.log('Derived attributes from variations:', derivedAttributes);
      }
      
      // Store the derived attributes for use in rendering
      setDerivedAttributeOptions(derivedAttributes);
    }
  }, [product, hasVariations]);

  useEffect(() => {
    if (DEBUG_MODE) {
      console.log('DEBUG: Current stock status:', currentStockStatus);
      console.log('DEBUG: Current quantity:', currentQuantity);
      console.log('DEBUG: Selected quantity:', quantity);
      console.log('DEBUG: Selected attributes:', selectedAttributes);
    }
  }, [currentStockStatus, currentQuantity, quantity, selectedAttributes]);

  // Reset selected attributes if product changes
  useEffect(() => {
    resetSelection();
  }, [product?.id]);

  // Reset selections
  const resetSelection = () => {
    // Reset selected attributes
    setSelectedAttributes({});
    
    // Reset to default product state
    if (product) {
      setCurrentPrice(parseFloat(product.price || '0'));
      setCurrentSalePrice(product.sale_price ? parseFloat(product.sale_price) : null);
      setCurrentStockStatus(product.stock_status || STOCK_STATUS_IN_STOCK);
      setCurrentQuantity(product.stock_quantity || 10);
      setQuantity(1);
    }
  };

  const formatPrice = (price: number | null) => {
    if (!price || isNaN(price) || price === 0) return 'Price not available';
    return `R${price.toFixed(2)}`;
  };

  // Determine if an attribute value is in stock and has available variations
  const isAttributeValueInStock = (attributeName: string, attributeValue: string) => {
    // Consider already selected attributes when checking stock
    const validVariations = findValidVariationsForAttributeCombination(attributeName, attributeValue);
    
    if (validVariations.length === 0) {
      if (DEBUG_MODE) {
        console.log(`DEBUG: No variations found for ${attributeName}=${attributeValue} with current selections, marking as out of stock`);
      }
      return { inStock: false, hasVariations: false };
    }
    
    // Check if any variation with this attribute combination is in stock
    const anyInStock = validVariations.some(v => {
      // Check stock status string
      const hasValidStockStatus = v.stock_status?.toLowerCase() === 'in_stock' || 
                                  v.stock_status?.toLowerCase() === 'instock' || 
                                  v.stock_status === 'STOCK';
      
      // Check stock quantity if manage_stock is true
      if (v.manage_stock && typeof v.stock_quantity !== 'undefined') {
        const qty = parseInt(v.stock_quantity, 10);
        return hasValidStockStatus && qty > 0;
      }
      
      return hasValidStockStatus;
    });
    
    if (DEBUG_MODE) {
      console.log(`DEBUG: ${attributeName}=${attributeValue} has ${validVariations.length} valid variations, any in stock: ${anyInStock}`);
    }
    
    return { inStock: anyInStock, hasVariations: true };
  };

  // Find all valid variations for a specific attribute + current selections
  const findValidVariationsForAttributeCombination = (attrName: string, attrValue: string) => {
    if (!product?.variations || !Array.isArray(product.variations)) return [];
    
    const normalizedName = normalizeAttributeName(attrName);
    const normalizedValue = normalizeAttributeValue(attrValue);
    
    // Start with all variations
    let candidates = [...product.variations];
    
    // Filter by the attribute we're checking
    candidates = candidates.filter(variation => 
      variation.attributes && 
      variation.attributes.some((attr: any) => 
        normalizeAttributeName(attr.name) === normalizedName && 
        normalizeAttributeValue(attr.value) === normalizedValue
      )
    );
    
    // Further filter by any already selected attributes (except the one we're checking)
    if (Object.keys(selectedAttributes).length > 0) {
      for (const [selectedName, selectedValue] of Object.entries(selectedAttributes)) {
        // Skip if this is the attribute we're currently checking
        if (normalizeAttributeName(selectedName) === normalizedName) {
          continue;
        }
        
        const selectedNormalizedName = normalizeAttributeName(selectedName);
        const selectedNormalizedValue = normalizeAttributeValue(selectedValue);
        
        // Filter out variations that don't match this selected attribute
        candidates = candidates.filter(variation => 
          variation.attributes && 
          variation.attributes.some((attr: any) => 
            normalizeAttributeName(attr.name) === selectedNormalizedName && 
            normalizeAttributeValue(attr.value) === selectedNormalizedValue
          )
        );
      }
    }
    
    if (DEBUG_MODE && candidates.length > 0) {
      console.log(`DEBUG: Found ${candidates.length} variations for ${attrName}=${attrValue} with current selections`);
      candidates.slice(0, 2).forEach((v, i) => { // Log just 2 to avoid spam
        console.log(`  Variation ${i}: id=${v.id}, stock=${v.stock_status}, qty=${v.stock_quantity}`);
      });
    }
    
    return candidates;
  };

  // Legacy function for backward compatibility - replaced by the combination method above
  const findValidVariationsForAttribute = (attrName: string, attrValue: string) => {
    return findValidVariationsForAttributeCombination(attrName, attrValue);
  };

  const handleAddToCart = async () => {
    console.log("Add to cart clicked");
    
    // Ensure price is a number and not 0
    const rawProductPrice = parseFloat(product?.price || '0');
    console.log("Raw product price:", rawProductPrice);
    
    // Get a safe image URL or use a relative path to the placeholder
    const imageUrl = product?.images?.[0]?.src && isValidImageUrl(product.images[0].src) 
      ? product.images[0].src 
      : '/product-placeholder.webp';
    
    // For variable products
    if (hasVariations) {
      // Find the selected variation
      let selectedVariation;
      let variationPrice = rawProductPrice; // Default to product price
      let stockQuantity = 10; // Default stock if not specified
      let stockStatus = currentStockStatus || 'instock';
      
      if (product?.variations && Array.isArray(product.variations)) {
        selectedVariation = findMatchingVariation(product.variations, selectedAttributes);
        
        // Get price from variation if available
        if (selectedVariation) {
          if (selectedVariation.price) {
            variationPrice = parseFloat(selectedVariation.price);
          }
          
          // Get stock info if available
          if (selectedVariation.stock_quantity !== undefined) {
            stockQuantity = parseInt(selectedVariation.stock_quantity.toString(), 10);
          }
          
          if (selectedVariation.stock_status) {
            stockStatus = selectedVariation.stock_status;
          }
        }
      }
      
      // Format attribute selections for display
      let attributeDisplay = '';
      if (Object.keys(selectedAttributes).length > 0) {
        attributeDisplay = Object.entries(selectedAttributes)
          .map(([key, value]) => `${formatAttributeName(key)}: ${value}`)
          .join(', ');
      }
      
      try {
        // Create cart item with proper price and variation data
        const cartItem = {
          id: String(product?.id || ''),
          variationId: String(selectedVariation?.variation_id || ''),
          name: product?.name || '',
          price: variationPrice,
          quantity: parseInt(quantity.toString(), 10) || 1,
          image: imageUrl,
          variationName: attributeDisplay,
          stockQuantity: stockQuantity,
          stockStatus: stockStatus
        };
        
        console.log('Adding to cart with stock quantity:', cartItem.stockQuantity);
        await addToCart(cartItem);
        
        toast({
          title: 'Added to Cart',
          description: `${product?.name}${attributeDisplay ? ` (${attributeDisplay})` : ''} has been added to your cart.`,
          status: 'success'
        });
      } catch (error) {
        console.error('Failed to add to cart:', error);
        toast({
          title: 'Error',
          description: 'Failed to add item to cart.',
          status: 'error'
        });
      }
      return;
    }
    
    // For simple products
    try {
      // Determine stock quantity for simple product
      const stockQuantity = product?.stock_quantity !== undefined 
        ? parseInt(product.stock_quantity.toString(), 10) 
        : 10;
      
      // Create cart item for simple product
      const cartItem = {
        id: String(product?.id || ''),
        variationId: '',
        name: product?.name || '',
        price: rawProductPrice,
        quantity: parseInt(quantity.toString(), 10) || 1,
        image: imageUrl,
        variationName: null,
        stockQuantity: stockQuantity,
        stockStatus: product?.stock_status || 'instock'
      };
      
      console.log('Adding simple product with stock quantity:', cartItem.stockQuantity);
      await addToCart(cartItem);
      
      toast({
        title: 'Added to Cart',
        description: `${product?.name} has been added to your cart.`,
        status: 'success'
      });
    } catch (error) {
      console.error('Failed to add to cart:', error);
      toast({
        title: 'Error',
        description: 'Failed to add item to cart.',
        status: 'error'
      });
    }
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    
    if (isNaN(value) || value < 1) {
      setQuantity(1);
    } else if (value > maxQuantity) {
      setQuantity(maxQuantity);
    } else {
      setQuantity(value);
    }
    
    if (DEBUG_MODE) {
      console.log(`DEBUG: Quantity changed to ${value}, set to ${isNaN(value) || value < 1 ? 1 : value > maxQuantity ? maxQuantity : value}`);
    }
  };

  const handleIncreaseQuantity = () => {
    console.log("Increase quantity clicked");
    // Allow increasing if we're below the current quantity limit
    if (quantity < maxQuantity) {
      setQuantity(prev => prev + 1);
      if (DEBUG_MODE) {
        console.log(`DEBUG: Increased quantity to ${quantity + 1}`);
      }
    } else {
      if (DEBUG_MODE) {
        console.log(`DEBUG: Cannot increase quantity above ${maxQuantity}`);
      }
    }
  };

  const handleDecreaseQuantity = () => {
    console.log("Decrease quantity clicked");
    // Prevent decreasing below 1
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
      if (DEBUG_MODE) {
        console.log(`DEBUG: Decreased quantity to ${quantity - 1}`);
      }
    } else {
      if (DEBUG_MODE) {
        console.log(`DEBUG: Cannot decrease quantity below 1`);
      }
    }
  };

  // Handle clearing all attribute selections
  const handleClearAllAttributes = () => {
    if (DEBUG_MODE) {
      console.log('DEBUG: Clearing all attribute selections');
    }
    
    // Reset selected attributes
    setSelectedAttributes({});
    
    // Reset to default product state
    if (product) {
      setCurrentPrice(parseFloat(product.price || '0'));
      setCurrentSalePrice(product.sale_price ? parseFloat(product.sale_price) : null);
      setCurrentStockStatus(product.stock_status || STOCK_STATUS_IN_STOCK);
      setCurrentQuantity(product.stock_quantity || 10);
      setQuantity(1);
    }
  };

  const isAttributeOptionInStock = (attrName: string, attrValue: string) => {
    // First, check if this option even exists in any variations
    const hasValidVariations = findValidVariationsForAttribute(attrName, attrValue).length > 0;
    
    // If there are no variations with this option, it can't be in stock
    if (!hasValidVariations) {
      if (DEBUG_MODE) {
        console.log(`DEBUG: ${attrName}=${attrValue} has no valid variations, marking as out of stock`);
      }
      return false;
    }
    
    // For partially selected state (e.g., only color selected, no size)
    if (Object.keys(selectedAttributes).length < (product?.attributes?.filter(attr => attr.variation)?.length || 0)) {
      return hasValidVariations; // If valid variations exist, show as in stock until all attributes are selected
    }
    
    // For fully selected attributes, check if specific variation is in stock
    if (attrName in selectedAttributes && selectedAttributes[attrName] === attrValue) {
      // This is the selected attribute value, show stockStatus from selected variation
      return currentStockStatus === STOCK_STATUS_IN_STOCK;
    }
    
    // Check if any variation with this attribute is in stock
    const variations = findValidVariationsForAttribute(attrName, attrValue);
    return variations.some(v => 
      (v.stock_status?.toLowerCase() === 'in_stock' || 
       v.stock_status?.toLowerCase() === 'instock' || 
       v.stock_status === 'STOCK')
    );
  };

  // Check if this product has attributes that we should display
  const hasAttributes = product?.attributes && 
                       Array.isArray(product.attributes) && 
                       product.attributes.length > 0 && 
                       product.attributes.some(attr => 
                         attr && 
                         attr.name && 
                         Array.isArray(attr.options) && 
                         attr.options.length > 0
                       );

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 mt-6 sm:py-16 sm:mt-8 font-lato">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 xl:gap-20">
        {/* Image Gallery Column */}
        <div className="flex flex-col sm:flex-row lg:flex-row gap-4">
          {/* Thumbnail Column */}
          <div className="flex sm:flex-col lg:flex-col gap-2 order-last sm:order-first lg:order-first overflow-x-auto sm:overflow-x-visible pb-2 sm:pb-0">
            {allImages.map((image, index) => (
              <div
                key={index}
                onMouseEnter={() => setCurrentImageIndex(index)}
                className={`relative border overflow-hidden rounded-lg cursor-pointer flex-shrink-0 ${
                  currentImageIndex === index
                    ? 'border-black'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="w-14 h-14 sm:w-16 sm:h-16 relative">
                  <Image
                    src={getSafeImageUrl(image.url, index)}
                    alt={image.alt || product.name}
                    fill
                    sizes="64px"
                    className="object-cover"
                    onError={() => handleImageError(index, image.url)}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Main Image */}
          <div className="flex-1 relative">
            <div className="aspect-square relative border rounded-lg overflow-hidden group">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentImageIndex}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-full h-full"
                >
                  <Image
                    src={getSafeImageUrl(allImages[currentImageIndex]?.url, currentImageIndex)}
                    alt={allImages[currentImageIndex]?.alt || product.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 40vw"
                    className="object-contain transition-transform duration-500 ease-in-out group-hover:scale-125"
                    priority
                    onError={() => handleImageError(currentImageIndex, allImages[currentImageIndex]?.url)}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Product Details Column */}
        <div className="space-y-6">
          <h1 className="text-3xl font-bold text-gray-900 font-lato">
            {product.name}
          </h1>
          
          <div className="space-y-2">
            <div className="mt-4 flex items-baseline">
              <span className="text-2xl font-bold text-gray-900">{formatPrice(currentPrice || product.price)}</span>
            </div>
            
            <div className="mt-3">
              {currentStockStatus === STOCK_STATUS_IN_STOCK ? (
                <div>
                  <span className="text-green-600 font-medium font-lato">
                    <CheckCircle className="inline w-5 h-5 mr-1" />
                    In Stock • Ready to Ship
                  </span>
                  {currentQuantity > 0 && (
                    <div className="mt-1 text-sm text-gray-600 font-lato">
                      {currentQuantity} {currentQuantity === 1 ? 'item' : 'items'} left in stock
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-red-600 font-medium font-lato">
                  <XCircle className="inline w-5 h-5 mr-1" />
                  Out of Stock
                </span>
              )}
            </div>
          </div>

          {/* Product Attributes (Size, Color, etc) */}
          {hasAttributes && (
            <div className="mt-6 space-y-4">
              <h2 className="text-xl font-semibold font-lato">Options</h2>
              
              {/* Check if we have valid attribute data before rendering */}
              {product.attributes && product.attributes.some(attr => attr && attr.name && Array.isArray(attr.options) && attr.options.length > 0) ? (
                product.attributes.map((attribute, index) => {
                  // Only process if attribute exists and has options
                  if (attribute && attribute.name && Array.isArray(attribute.options) && attribute.options.length > 0) {
                    const normalizedName = normalizeAttributeName(attribute.name);
                    
                    // Use either derived options or fall back to the original options
                    const availableOptions = 
                      derivedAttributeOptions[normalizedName]?.length > 0
                        ? derivedAttributeOptions[normalizedName]
                        : attribute.options;
                    
                    if (DEBUG_MODE) {
                      console.log(`Attribute ${attribute.name}:`, { 
                        derived: derivedAttributeOptions[normalizedName] || [],
                        original: attribute.options,
                        display: availableOptions
                      });
                    }
                    
                    return (
                      <div key={`${attribute.name}-${index}`} className="space-y-2">
                        <h3 className="text-sm font-medium text-gray-900 font-lato">
                          {formatAttributeName(attribute.name || '')}
                          {selectedAttributes[attribute.name || ''] && (
                            <span className="ml-1 text-gray-500">: {selectedAttributes[attribute.name || '']}</span>
                          )}
                        </h3>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {/* Show only options that exist in actual variations */}
                          {availableOptions.map((option: string, optionIndex: number) => {
                            // Normalize option - avoid duplicates with different case
                            const optionNormalized = option.trim();
                            
                            // Check if this option is in stock
                            const inStock = isAttributeValueInStock(attribute.name, optionNormalized);
                            
                            // Check if this option is currently selected
                            const isSelected = selectedAttributes[attribute.name] === optionNormalized;
                            
                            if (DEBUG_MODE) {
                              console.log(`Option ${attribute.name}=${optionNormalized}: inStock=${inStock}, selected=${isSelected}`);
                            }
                            
                            // Display the option pill
                            return (
                              <button
                                key={optionIndex}
                                onClick={() => handleAttributeSelection(attribute.name, optionNormalized)}
                                className={`px-3 py-1 rounded-full border transition-all ${
                                  isSelected
                                    ? 'bg-black text-white border-black'
                                    : 'bg-white text-black hover:bg-gray-100'
                                } ${!inStock ? 'opacity-50 cursor-not-allowed' : ''}`}
                                disabled={!inStock}
                              >
                                {optionNormalized}
                                {!inStock && (
                                  <span className="ml-1 text-xs text-red-500">(Out of Stock)</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                        
                        {/* Clear All Selections Button - Moved below variation options */}
                        {index === (product.attributes?.length || 0) - 1 && Object.keys(selectedAttributes).some(key => selectedAttributes[key]) && (
                          <div className="mt-2">
                            <button 
                              onClick={handleClearAllAttributes}
                              className="inline-flex items-center text-xs text-gray-500 hover:text-black font-lato"
                            >
                              <RefreshCcw className="h-3 w-3 mr-1" />
                              Clear all selections
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  }
                })
              ) : (
                // Fallback message when no valid attributes exist
                <div className="p-4 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-600 font-lato">No options available for this product.</p>
                </div>
              )}
            </div>
          )}
          
          {/* Quantity Selector */}
          <div className="mt-6 space-y-2">
            <h3 className="text-sm font-medium font-lato">Quantity</h3>
            <div className="flex items-center w-full max-w-[150px]">
              <button 
                onClick={handleDecreaseQuantity}
                disabled={quantity <= 1}
                className={`px-3 py-2 border border-gray-300 rounded-l flex items-center justify-center ${
                  quantity <= 1 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-white hover:bg-gray-50'
                }`}
                aria-label="Decrease quantity"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                id="quantity"
                name="quantity"
                value={quantity}
                min="1"
                max={maxQuantity}
                onChange={handleQuantityChange}
                className="w-full border-y border-gray-300 py-2 text-center font-lato"
              />
              <button 
                onClick={handleIncreaseQuantity}
                disabled={quantity >= maxQuantity}
                className={`px-3 py-2 border border-gray-300 rounded-r flex items-center justify-center ${
                  quantity >= maxQuantity
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-white hover:bg-gray-50'
                }`}
                aria-label="Increase quantity"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Add to Cart Button */}
          <div className="mt-4">
            <button
              onClick={handleAddToCart}
              disabled={currentStockStatus !== STOCK_STATUS_IN_STOCK}
              className={`w-full py-3 px-4 flex items-center justify-center gap-2 rounded-lg font-medium transition-all ${
                currentStockStatus !== STOCK_STATUS_IN_STOCK
                  ? 'bg-gray-300 text-white cursor-not-allowed'
                  : 'bg-[#0f172a] text-white hover:bg-[#1e293b] transition-colors duration-200'
              }`}
            >
              {currentStockStatus === STOCK_STATUS_IN_STOCK ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="white">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Add to Cart ({quantity})
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 mr-2" />
                  Out of Stock
                </>
              )}
            </button>
          </div>

          {/* Trust Badges */}
          <div className="mt-4 py-4 border-t border-b">
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-center">
              <div className="flex flex-col items-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 sm:w-6 sm:h-6 mb-1 sm:mb-2 text-gray-600">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span className="text-xs font-medium text-gray-600 font-lato">Secure Payment</span>
              </div>
              
              <div className="flex flex-col items-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 sm:w-6 sm:h-6 mb-1 sm:mb-2 text-gray-600">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
                <span className="text-xs font-medium text-gray-600 font-lato">Quality Guarantee</span>
              </div>
              
              <div className="flex flex-col items-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 sm:w-6 sm:h-6 mb-1 sm:mb-2 text-gray-600">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                <span className="text-xs font-medium text-gray-600 font-lato">Fast Delivery</span>
              </div>
            </div>
            
            {/* Payment Methods */}
            <div className="mt-4 flex justify-center">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-lato">Powered by</span>
                <Image 
                  src="/yoco-logo.png" 
                  alt="Yoco Payments" 
                  width={60} 
                  height={24} 
                  className="h-5 sm:h-6 object-contain" 
                />
              </div>
            </div>
          </div>

          {/* Product Description */}
          <div className="pt-6 border-t">
            <h3 className="text-lg font-semibold font-lato mb-4">Product Details</h3>
            <div 
              className="prose text-gray-600 font-lato"
              dangerouslySetInnerHTML={{ 
                __html: product.description || product.short_description || '' 
              }}
            />
          </div>
        </div>
      </div>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity="error"
          sx={{ width: '100%' }}
        >
          This product is currently out of stock
        </Alert>
      </Snackbar>
    </div>
  );
};

export default memo(ProductContentTypesense);