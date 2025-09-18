'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Box, Button, Container, Grid, Typography, Divider, TextField, Alert, CircularProgress } from '@mui/material';
import { styled } from '@mui/material/styles';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import { formatPrice } from '@/lib/utils';
import ProductGallery from './ProductGallery';
import ProductAttributes from './ProductAttributes';
import ProductQuantity from './ProductQuantity';
import ProductPrice from './ProductPrice';
import ProductStockStatus from './ProductStockStatus';
import { STOCK_STATUS_IN_STOCK, STOCK_STATUS_OUT_OF_STOCK } from '@/lib/constants';

// Debug mode flag
const DEBUG_MODE = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';

// Styled components
const ProductContainer = styled(Container)(({ theme }) => ({
  paddingTop: theme.spacing(4),
  paddingBottom: theme.spacing(8),
}));

const ProductTitle = styled(Typography)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  fontWeight: 600,
}));

const ProductDescription = styled(Typography)(({ theme }) => ({
  marginBottom: theme.spacing(3),
}));

const AddToCartButton = styled(Button)(({ theme }) => ({
  marginTop: theme.spacing(2),
  padding: theme.spacing(1, 3),
}));

// Main component
export default function ProductContentSimplifiedWithRealTimeStock({ product }: { product: any }) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [maxQuantity, setMaxQuantity] = useState(99);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [currentStockStatus, setCurrentStockStatus] = useState(STOCK_STATUS_IN_STOCK);
  const [currentStockQuantity, setCurrentStockQuantity] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize selected attributes with the first option of each attribute
  useEffect(() => {
    if (product.attributes && Array.isArray(product.attributes)) {
      const initialAttributes: Record<string, string> = {};
      
      product.attributes.forEach((attribute: any) => {
        if (attribute.options && attribute.options.length > 0) {
          initialAttributes[attribute.name] = attribute.options[0];
        }
      });
      
      setSelectedAttributes(initialAttributes);
      
      if (DEBUG_MODE) {
        console.log('SIMPLIFIED: Initialized attributes:', initialAttributes);
      }
    }
  }, [product.attributes]);

  // Update stock status when attributes change
  useEffect(() => {
    if (Object.keys(selectedAttributes).length > 0) {
      handleAttributeChange(Object.keys(selectedAttributes)[0], selectedAttributes[Object.keys(selectedAttributes)[0]]);
    }
  }, []);

  // Check if a variation is in stock
  const isVariationInStock = (variation: any) => {
    // First check stock_status
    if (variation.stock_status === 'instock') {
      return true;
    }
    
    // Then check stock_quantity if stock_status is not definitive
    if (typeof variation.stock_quantity === 'number') {
      return variation.stock_quantity > 0;
    }
    
    // Default to out of stock if we can't determine
    return false;
  };

  // Find matching variation based on selected attributes
  const findMatchingVariation = (variations: any[], selectedAttrs: Record<string, string>) => {
    if (!variations || !Array.isArray(variations)) return null;

    // Filter variations that match all selected attributes
    const matchingVariations = variations.filter(variation => {
      // Skip if variation doesn't have attributes
      if (!variation.attributes || !Array.isArray(variation.attributes)) return false;

      // Check if all selected attributes match this variation
      return Object.entries(selectedAttrs).every(([attrName, attrValue]) => {
        // Find the matching attribute in this variation
        const matchingAttr = variation.attributes.find((attr: any) => 
          attr.name.toLowerCase() === attrName.toLowerCase());

        // If attribute not found or value doesn't match, this variation doesn't match
        return matchingAttr && matchingAttr.option.toLowerCase() === attrValue.toLowerCase();
      });
    });

    if (DEBUG_MODE && matchingVariations.length > 0) {
      console.log('SIMPLIFIED: Found matching variation:', matchingVariations[0]);
    }

    // Return the first matching variation (if any)
    return matchingVariations.length > 0 ? matchingVariations[0] : null;
  };
  
  // Fetch fresh variation data from the server
  const fetchFreshVariationData = async (variationId: string) => {
    if (!variationId) return null;
    
    try {
      setLoading(true);
      console.log(`Fetching fresh data for variation ${variationId}...`);
      
      // Fetch the variation data from our API
      const response = await fetch(`/api/variation/${variationId}`);
      
      if (!response.ok) {
        console.error(`Error fetching variation data: ${response.statusText}`);
        return null;
      }
      
      const data = await response.json();
      console.log('Fresh variation data:', data);
      
      return data.variation;
    } catch (error) {
      console.error('Error fetching fresh variation data:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Handle attribute selection
  const handleAttributeChange = async (attrName: string, attrValue: string) => {
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
      // Fetch fresh variation data to get the latest stock information
      let variationToUse = matchingVariation;
      let freshData = null;
      
      try {
        // Only fetch fresh data if the product has real-time stock data available
        if (product._dataSource?.realTimeStock) {
          freshData = await fetchFreshVariationData(matchingVariation.id);
          if (freshData) {
            variationToUse = freshData;
            console.log('Using fresh variation data:', freshData);
          }
        }
      } catch (error) {
        console.error('Error fetching fresh variation data:', error);
      }
      
      const inStock = isVariationInStock(variationToUse);

      if (DEBUG_MODE) {
        console.log('SIMPLIFIED: Matching variation found:', {
          id: variationToUse.id,
          stockStatus: variationToUse.stock_status,
          stockQuantity: variationToUse.stock_quantity,
          inStock: inStock,
          freshData: !!freshData
        });
      }

      // Update current stock status and quantity
      setCurrentStockStatus(inStock ? STOCK_STATUS_IN_STOCK : STOCK_STATUS_OUT_OF_STOCK);
      setCurrentStockQuantity(typeof variationToUse.stock_quantity === 'number'
        ? variationToUse.stock_quantity
        : null);

      // Update max quantity based on stock
      if (typeof variationToUse.stock_quantity === 'number' && variationToUse.stock_quantity > 0) {
        setMaxQuantity(variationToUse.stock_quantity);
        // Ensure quantity doesn't exceed stock
        if (quantity > variationToUse.stock_quantity) {
          setQuantity(variationToUse.stock_quantity);
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

  // Handle quantity change
  const handleQuantityChange = (newQuantity: number) => {
    setQuantity(newQuantity);
  };

  // Handle add to cart
  const handleAddToCart = () => {
    // Find the selected variation
    const selectedVariation = findMatchingVariation(product?.variations, selectedAttributes);
    
    if (!selectedVariation) {
      setError('Please select all options');
      return;
    }
    
    if (currentStockStatus !== STOCK_STATUS_IN_STOCK) {
      setError('This product is out of stock');
      return;
    }
    
    // Add to cart logic here
    console.log('Adding to cart:', {
      product,
      variation: selectedVariation,
      quantity,
      attributes: selectedAttributes
    });
    
    // Redirect to cart page or show success message
    router.push('/cart');
  };

  return (
    <ProductContainer maxWidth="lg">
      <Grid container spacing={4}>
        {/* Product Gallery */}
        <Grid item xs={12} md={6}>
          <ProductGallery images={product.gallery_images || []} />
        </Grid>
        
        {/* Product Details */}
        <Grid item xs={12} md={6}>
          <ProductTitle variant="h4" component="h1">
            {product.name}
          </ProductTitle>
          
          <ProductPrice
            price={product.price}
            regularPrice={product.regular_price}
            salePrice={product.sale_price}
          />
          
          {loading && (
            <Box sx={{ display: 'flex', alignItems: 'center', my: 2 }}>
              <CircularProgress size={24} sx={{ mr: 1 }} />
              <Typography variant="body2">Checking latest stock information...</Typography>
            </Box>
          )}
          
          <ProductStockStatus
            status={currentStockStatus}
            quantity={currentStockQuantity}
          />
          
          {error && (
            <Alert severity="error" sx={{ mt: 2, mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          
          <Divider sx={{ my: 2 }} />
          
          {/* Product Attributes */}
          {product.attributes && product.attributes.length > 0 && (
            <ProductAttributes
              attributes={product.attributes}
              selectedAttributes={selectedAttributes}
              onAttributeChange={handleAttributeChange}
              variations={product.variations}
            />
          )}
          
          {/* Quantity Selector */}
          <ProductQuantity
            quantity={quantity}
            maxQuantity={maxQuantity}
            onQuantityChange={handleQuantityChange}
            disabled={currentStockStatus !== STOCK_STATUS_IN_STOCK}
          />
          
          {/* Add to Cart Button */}
          <AddToCartButton
            variant="contained"
            color="primary"
            size="large"
            startIcon={<AddShoppingCartIcon />}
            fullWidth
            onClick={handleAddToCart}
            disabled={currentStockStatus !== STOCK_STATUS_IN_STOCK || loading}
          >
            Add to Cart
          </AddToCartButton>
          
          <Divider sx={{ my: 3 }} />
          
          {/* Product Description */}
          {product.description && (
            <ProductDescription variant="body1">
              {product.description}
            </ProductDescription>
          )}
        </Grid>
      </Grid>
    </ProductContainer>
  );
}
