import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Minus, ShoppingCart } from 'lucide-react';
import Image from 'next/image';
import parse from 'html-react-parser';

// Types for Product and Variation
interface Attribute {
  name: string;
  option: string;
}

interface Variation {
  id: number;
  sku: string;
  price: number;
  regular_price: number;
  sale_price: number | null;
  on_sale: boolean;
  purchasable: boolean;
  stock_status: string;
  stock_quantity: number;
  image: {
    src: string;
    alt: string;
  } | null;
  attributes: Attribute[];
}

interface ProductAttribute {
  id: number;
  name: string;
  slug: string;
  position: number;
  visible: boolean;
  variation: boolean;
  options: string[];
  option_ids?: number[];
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  regular_price: number;
  sale_price: number | null;
  on_sale: boolean;
  stock_status: string;
  stock_quantity: number;
  image_url: string;
  image_alt: string;
  colors?: string[];
  sizes?: string[];
  gallery_images?: string[];
  attributes_json?: string;
  variations_json?: string;
  type: string;
}

const ProductContentEnhanced = ({ product }: { product: Product }) => {
  // Parse JSON strings into objects
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [currentVariation, setCurrentVariation] = useState<Variation | null>(null);
  const [mainImage, setMainImage] = useState(product.image_url);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  // Parse the product data on component mount
  useEffect(() => {
    // Parse attributes JSON
    try {
      if (product.attributes_json) {
        const parsedAttributes = JSON.parse(product.attributes_json);
        if (Array.isArray(parsedAttributes)) {
          setAttributes(parsedAttributes);
          
          // Initialize selected attributes with default values
          const initialAttributes: Record<string, string> = {};
          parsedAttributes.forEach(attr => {
            if (attr.options && attr.options.length > 0) {
              initialAttributes[attr.name] = attr.options[0];
            }
          });
          setSelectedAttributes(initialAttributes);
        }
      }
    } catch (e) {
      console.error('Error parsing attributes:', e);
    }
    
    // Parse variations JSON
    try {
      if (product.variations_json) {
        const parsedVariations = JSON.parse(product.variations_json);
        if (Array.isArray(parsedVariations)) {
          setVariations(parsedVariations);
        }
      }
    } catch (e) {
      console.error('Error parsing variations:', e);
    }
    
    // Set up gallery images
    const gallery = product.gallery_images || [];
    if (product.image_url && !gallery.includes(product.image_url)) {
      setGalleryImages([product.image_url, ...gallery]);
    } else {
      setGalleryImages(gallery);
    }
  }, [product]);

  // Find matching variation when selected attributes change
  useEffect(() => {
    if (variations.length === 0 || Object.keys(selectedAttributes).length === 0) {
      setCurrentVariation(null);
      return;
    }

    // Find a variation that matches all selected attributes
    const matchingVariation = variations.find(variation => {
      // Must match all selected attributes
      return variation.attributes.every(attr => {
        const attrName = attr.name;
        const attrValue = attr.option;
        return selectedAttributes[attrName]?.toLowerCase() === attrValue?.toLowerCase();
      });
    });

    if (matchingVariation) {
      setCurrentVariation(matchingVariation);
      
      // Update main image if variation has an image
      if (matchingVariation.image && matchingVariation.image.src) {
        setMainImage(matchingVariation.image.src);
      } else {
        setMainImage(product.image_url);
      }
      
      // Clear any error messages
      setErrorMessage('');
    } else {
      setCurrentVariation(null);
      setErrorMessage('This combination is not available');
      setMainImage(product.image_url);
    }
  }, [selectedAttributes, variations, product.image_url]);

  // Handle attribute selection
  const handleAttributeChange = (attributeName: string, value: string) => {
    setSelectedAttributes(prev => ({
      ...prev,
      [attributeName]: value
    }));
  };

  // Handle quantity change
  const incrementQuantity = () => {
    // Don't allow incrementing if current variation is out of stock
    if (currentVariation && currentVariation.stock_status === 'outofstock') {
      return;
    }
    
    // Check stock quantity limits if available
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
    if (product.type === 'VARIABLE' && !currentVariation) {
      setErrorMessage('Please select all options');
      return;
    }

    if (currentVariation && currentVariation.stock_status === 'outofstock') {
      setErrorMessage('This product is out of stock');
      return;
    }

    setIsAddingToCart(true);
    
    try {
      // Implement your add to cart logic here
      // This is a placeholder implementation
      console.log('Adding to cart:', {
        product_id: product.id,
        variation_id: currentVariation?.id || 0,
        quantity,
        attributes: selectedAttributes
      });
      
      // Clear error message
      setErrorMessage('');
      
      // Show success message or redirect to cart
      // This is a placeholder implementation
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

  // Helper function to display price with currency
  const formatPrice = (price: number) => {
    return `R${price.toFixed(2)}`;
  };

  // Determine if the product is purchasable
  const isPurchasable = () => {
    if (product.type === 'SIMPLE') {
      return product.stock_status !== 'outofstock';
    }
    
    if (product.type === 'VARIABLE') {
      return currentVariation ? currentVariation.stock_status !== 'outofstock' : false;
    }
    
    return false;
  };

  // Determine stock status text and style
  const getStockStatus = () => {
    let status = product.stock_status;
    let statusText = 'In Stock';
    let statusClass = 'text-green-600';
    
    if (currentVariation) {
      status = currentVariation.stock_status;
    }
    
    switch (status) {
      case 'instock':
        statusText = 'In Stock';
        statusClass = 'text-green-600';
        break;
      case 'outofstock':
        statusText = 'Out of Stock';
        statusClass = 'text-red-600';
        break;
      case 'onbackorder':
        statusText = 'On Backorder';
        statusClass = 'text-amber-600';
        break;
      default:
        statusText = 'In Stock';
        statusClass = 'text-green-600';
    }
    
    return { statusText, statusClass };
  };

  // Get the current price display
  const getPriceDisplay = () => {
    if (product.type === 'VARIABLE' && currentVariation) {
      if (currentVariation.on_sale && currentVariation.sale_price) {
        return (
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold">{formatPrice(currentVariation.sale_price)}</span>
            <span className="text-lg text-gray-500 line-through">{formatPrice(currentVariation.regular_price)}</span>
          </div>
        );
      }
      return <span className="text-2xl font-bold">{formatPrice(currentVariation.price)}</span>;
    }
    
    if (product.on_sale && product.sale_price) {
      return (
        <div className="flex items-center space-x-2">
          <span className="text-2xl font-bold">{formatPrice(product.sale_price)}</span>
          <span className="text-lg text-gray-500 line-through">{formatPrice(product.regular_price)}</span>
        </div>
      );
    }
    
    return <span className="text-2xl font-bold">{formatPrice(product.price)}</span>;
  };
  
  // Function to check if an attribute option is available based on current selections
  const isAttributeOptionAvailable = (attributeName: string, optionValue: string) => {
    if (variations.length === 0) return true;
    
    // Create a copy of current selected attributes 
    const testAttributes = { ...selectedAttributes, [attributeName]: optionValue };
    
    // Check if any variation matches these attributes
    return variations.some(variation => {
      const variationAttrs = variation.attributes.reduce((acc, attr) => {
        acc[attr.name] = attr.option;
        return acc;
      }, {} as Record<string, string>);
      
      // Check if all test attributes match this variation's attributes
      return Object.entries(testAttributes).every(([name, value]) => {
        return !variationAttrs[name] || variationAttrs[name].toLowerCase() === value.toLowerCase();
      });
    });
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
        
        {/* Attributes Selection */}
        {product.type === 'VARIABLE' && attributes.length > 0 && (
          <div className="space-y-4">
            {attributes
              .filter(attr => attr.variation)
              .map((attribute) => (
                <div key={attribute.id} className="space-y-2">
                  <label className="block text-sm font-medium">
                    {attribute.name}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {attribute.options.map((option) => {
                      const isAvailable = isAttributeOptionAvailable(attribute.name, option);
                      const isSelected = selectedAttributes[attribute.name] === option;
                      
                      // Determine className based on attribute type and state
                      let className = "border rounded-md px-3 py-1 text-sm cursor-pointer ";
                      
                      // For color swatches
                      if (attribute.name.toLowerCase().includes('color')) {
                        className = "w-8 h-8 rounded-full cursor-pointer flex items-center justify-center ";
                        
                        if (isSelected) {
                          className += "ring-2 ring-offset-2 ring-blue-500 ";
                        } else {
                          className += "ring-1 ring-offset-1 ring-gray-300 ";
                        }
                        
                        if (!isAvailable) {
                          className += "opacity-50 cursor-not-allowed ";
                        }
                        
                        return (
                          <div 
                            key={option}
                            title={option}
                            className={className}
                            style={{ 
                              backgroundColor: option.toLowerCase(),
                              border: option.toLowerCase() === 'white' ? '1px solid #e5e7eb' : 'none'
                            }}
                            onClick={() => {
                              if (isAvailable) {
                                handleAttributeChange(attribute.name, option);
                              }
                            }}
                          >
                            {isSelected && (
                              <div className="w-4 h-4 rounded-full bg-white bg-opacity-50" />
                            )}
                          </div>
                        );
                      } 
                      
                      // For size and other attributes
                      if (isSelected) {
                        className += "bg-blue-100 border-blue-500 ";
                      } else {
                        className += "border-gray-300 ";
                      }
                      
                      if (!isAvailable) {
                        className += "opacity-50 cursor-not-allowed text-gray-400 line-through";
                      } else {
                        className += "hover:border-blue-500";
                      }
                      
                      return (
                        <div 
                          key={option}
                          className={className}
                          onClick={() => {
                            if (isAvailable) {
                              handleAttributeChange(attribute.name, option);
                            }
                          }}
                        >
                          {option}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
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
              disabled={
                (currentVariation && currentVariation.stock_status === 'outofstock') ||
                (currentVariation && currentVariation.stock_quantity > 0 && quantity >= currentVariation.stock_quantity)
              }
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Add to Cart Button */}
        <Button 
          className="w-full md:w-auto"
          disabled={!isPurchasable() || isAddingToCart}
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
        
        {/* SKU Display */}
        {currentVariation && currentVariation.sku && (
          <div className="text-sm text-gray-600">
            SKU: {currentVariation.sku}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductContentEnhanced;
