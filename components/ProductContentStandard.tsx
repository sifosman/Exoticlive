"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Minus, ShoppingCart } from 'lucide-react';
import Image from 'next/image';
import parse from 'html-react-parser';
import { formatPrice } from '@/lib/utils';

// Simplified product interface that works with our current Typesense data structure
interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  regular_price: number;
  sale_price: number | null;
  on_sale: boolean;
  is_on_sale: boolean;
  stock_status: string;
  stock_quantity: number;
  type: string;
  image_url: string;
  image_alt: string;
  gallery_images?: string[];
  attributes_json?: string;
  variations_json?: string;
  colors?: string[];
  sizes?: string[];
}

// Types for attributes and variations when we have them
interface Attribute {
  id: number;
  name: string;
  slug: string;
  options: string[];
  variation: boolean;
}

interface VariationAttribute {
  name: string;
  option: string;
}

interface Variation {
  id: number;
  price: number;
  stock_status: string;
  stock_quantity: number;
  attributes: VariationAttribute[];
}

const ProductContentStandard = ({ product }: { product: Product | null }) => {
  if (!product) {
    return <div className="py-8 text-center">Product not found</div>;
  }

  // State for product data
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [currentVariation, setCurrentVariation] = useState<Variation | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [mainImage, setMainImage] = useState(product.image_url);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [inStock, setInStock] = useState(true);

  // UI state
  const [galleryImages, setGalleryImages] = useState<string[]>([]);

  // Parse product data on component mount
  useEffect(() => {
    // Initialize state
    const colors = product.colors || [];
    const sizes = product.sizes || [];
    
    if (colors.length > 0) {
      setSelectedColor(colors[0]);
    }
    
    if (sizes.length > 0) {
      setSelectedSize(sizes[0]);
    }
    
    // Set initial stock status
    setInStock(product.stock_status === 'instock');
    
    // Setup gallery images
    const gallery = product.gallery_images || [];
    if (product.image_url && !gallery.includes(product.image_url)) {
      setGalleryImages([product.image_url, ...gallery]);
    } else {
      setGalleryImages(gallery);
    }
    
    // Try to parse attributes from JSON
    try {
      if (product.attributes_json) {
        const parsedAttributes = JSON.parse(product.attributes_json);
        setAttributes(parsedAttributes);
      }
    } catch (e) {
      console.error('Error parsing attributes:', e);
    }
    
    // Try to parse variations from JSON
    try {
      if (product.variations_json) {
        const parsedVariations = JSON.parse(product.variations_json);
        setVariations(parsedVariations);
      }
    } catch (e) {
      console.error('Error parsing variations:', e);
    }
  }, [product]);

  // Find matching variation when color or size changes
  useEffect(() => {
    if (!selectedColor && !selectedSize) return;
    
    // For variable products with variations data
    if (product.type === 'VARIABLE' && variations.length > 0) {
      const matchingVariation = variations.find(variation => {
        const matchesColor = !selectedColor || variation.attributes.some(
          attr => attr.name.toLowerCase().includes('color') && 
                attr.option.toLowerCase() === selectedColor.toLowerCase()
        );
        
        const matchesSize = !selectedSize || variation.attributes.some(
          attr => attr.name.toLowerCase().includes('size') && 
                attr.option.toLowerCase() === selectedSize.toLowerCase()
        );
        
        return matchesColor && matchesSize;
      });
      
      if (matchingVariation) {
        setCurrentVariation(matchingVariation);
        setInStock(matchingVariation.stock_status === 'instock');
        setErrorMessage('');
      } else {
        setCurrentVariation(null);
        setInStock(false);
        setErrorMessage('This combination is not available');
      }
    } 
    // Best-effort stock determination without variations
    else if (product.type === 'VARIABLE') {
      // Without variation data, we use the product level stock status
      // This is not ideal but better than nothing
      setInStock(product.stock_status === 'instock');
    }
  }, [selectedColor, selectedSize, variations, product.type, product.stock_status]);

  // Handle color selection
  const handleColorChange = (color: string) => {
    setSelectedColor(color);
  };

  // Handle size selection
  const handleSizeChange = (size: string) => {
    setSelectedSize(size);
  };

  // Handle quantity changes
  const incrementQuantity = () => {
    if (!inStock) return;
    
    // Limit by stock quantity if available
    if (currentVariation && currentVariation.stock_quantity > 0) {
      if (quantity < currentVariation.stock_quantity) {
        setQuantity(prev => prev + 1);
      }
    } else {
      setQuantity(prev => prev + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  // Handle add to cart
  const addToCart = async () => {
    if (!inStock) {
      setErrorMessage('This product is out of stock');
      return;
    }
    
    // For variable products, ensure options are selected
    if (product.type === 'VARIABLE') {
      if ((product.colors?.length && !selectedColor) || 
          (product.sizes?.length && !selectedSize)) {
        setErrorMessage('Please select all options');
        return;
      }
    }
    
    setIsAddingToCart(true);
    
    try {
      // Simulate adding to cart
      console.log('Adding to cart:', {
        product_id: product.id,
        variation_id: currentVariation?.id || 0,
        quantity,
        color: selectedColor,
        size: selectedSize
      });
      
      // Clear error message
      setErrorMessage('');
      
      // Simulate success (in a real implementation, you'd call your cart API)
      setTimeout(() => {
        setIsAddingToCart(false);
        alert('Product added to cart!');
      }, 1000);
    } catch (error) {
      console.error('Error adding to cart:', error);
      setErrorMessage('Error adding to cart. Please try again.');
      setIsAddingToCart(false);
    }
  };

  // Get current price display
  const getPriceDisplay = () => {
    if (currentVariation) {
      return (
        <div className="flex items-center space-x-2">
          <span className="text-2xl font-bold">{formatPrice(currentVariation.price)}</span>
        </div>
      );
    }
    
    if (product.is_on_sale && product.sale_price) {
      return (
        <div className="flex items-center space-x-2">
          <span className="text-2xl font-bold">{formatPrice(product.sale_price)}</span>
          <span className="text-lg text-gray-500 line-through">{formatPrice(product.regular_price)}</span>
        </div>
      );
    }
    
    return <span className="text-2xl font-bold">{formatPrice(product.price)}</span>;
  };

  // Get stock status text and styling
  const getStockStatus = () => {
    let statusText = 'In Stock';
    let statusClass = 'text-green-600';
    
    if (!inStock) {
      statusText = 'Out of Stock';
      statusClass = 'text-red-600';
    }
    
    return { statusText, statusClass };
  };

  // Handle thumbnail click
  const handleThumbnailClick = (imageSrc: string) => {
    setMainImage(imageSrc);
  };

  const { statusText, statusClass } = getStockStatus();

  return (
    <div className="grid md:grid-cols-2 gap-8 mt-8">
      {/* Product Images */}
      <div className="space-y-4">
        <div className="relative aspect-square w-full overflow-hidden rounded-md">
          {mainImage ? (
            <Image 
              src={mainImage} 
              alt={product.name} 
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500">
              No image available
            </div>
          )}
        </div>
        
        {/* Thumbnails Gallery */}
        {galleryImages.length > 1 && (
          <div className="flex space-x-2 overflow-x-auto">
            {galleryImages.map((img, index) => (
              <div 
                key={index}
                className={`relative w-20 h-20 cursor-pointer rounded-md overflow-hidden border-2 ${mainImage === img ? 'border-blue-500' : 'border-transparent'}`}
                onClick={() => handleThumbnailClick(img)}
              >
                <Image 
                  src={img} 
                  alt={`Product thumbnail ${index}`} 
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Product Info */}
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">{product.name}</h1>
        
        {/* Price */}
        <div className="space-y-1">
          {getPriceDisplay()}
          <div className={`text-sm font-medium ${statusClass}`}>
            {statusText}
          </div>
        </div>
        
        {/* Description */}
        {product.description && (
          <div className="prose prose-sm max-w-none">
            {parse(product.description)}
          </div>
        )}
        
        {/* Color Selection */}
        {product.colors && product.colors.length > 0 && (
          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {product.colors.map((color) => (
                <div 
                  key={color}
                  title={color}
                  className={`w-8 h-8 rounded-full cursor-pointer flex items-center justify-center 
                    ${selectedColor === color ? 'ring-2 ring-offset-2 ring-blue-500' : 'ring-1 ring-offset-1 ring-gray-300'}`}
                  style={{ 
                    backgroundColor: color.toLowerCase(),
                    border: color.toLowerCase() === 'white' ? '1px solid #e5e7eb' : 'none'
                  }}
                  onClick={() => handleColorChange(color)}
                >
                  {selectedColor === color && (
                    <div className="w-4 h-4 rounded-full bg-white bg-opacity-50" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Size Selection */}
        {product.sizes && product.sizes.length > 0 && (
          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Size
            </label>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((size) => (
                <div 
                  key={size}
                  className={`border rounded-md px-3 py-1 text-sm cursor-pointer 
                    ${selectedSize === size ? 'bg-blue-100 border-blue-500' : 'border-gray-300 hover:border-blue-500'}`}
                  onClick={() => handleSizeChange(size)}
                >
                  {size}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Error Message */}
        {errorMessage && (
          <div className="text-red-500 text-sm">{errorMessage}</div>
        )}
        
        {/* Quantity Selector */}
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium">Quantity</span>
          <div className="flex items-center border rounded-md">
            <button 
              onClick={decrementQuantity}
              className="px-3 py-1 hover:bg-gray-100"
              disabled={quantity <= 1}
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="px-4 py-1">{quantity}</span>
            <button 
              onClick={incrementQuantity}
              className="px-3 py-1 hover:bg-gray-100"
              disabled={!inStock}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Add to Cart Button */}
        <Button 
          className="w-full md:w-auto"
          disabled={!inStock || isAddingToCart}
          onClick={addToCart}
        >
          {isAddingToCart ? (
            <>Adding...</>
          ) : (
            <>
              <ShoppingCart className="mr-2 w-4 h-4" />
              Add to Cart
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default ProductContentStandard;
