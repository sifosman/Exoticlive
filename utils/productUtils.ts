import { Product } from './typesense-search';

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const filterProducts = (
  products: Product[],
  selectedCategories: string[],
  currentPriceRange: { min: number; max: number },
  selectedColors: string[],
  selectedSizes: string[]
): Product[] => {
  if (!products) return [];
  
  return products.filter((product) => {
    // Check stock status
    if (product.stock_status === 'outofstock') {
      return false;
    }

    // Category filter
    const categoryMatch = selectedCategories.length === 0 || 
      product.categories.some(category => 
        selectedCategories.includes(category.toLowerCase())
      );

    if (!categoryMatch) {
      return false;
    }

    // Price filter
    const price = product.sale_price || product.price;
    const priceMatch = price >= currentPriceRange.min && price <= currentPriceRange.max;

    if (!priceMatch) {
      return false;
    }

    // Color filter
    if (selectedColors.length > 0) {
      const productColors = product.attributes
        .find(attr => attr.name.toLowerCase() === 'color')
        ?.options || [];
      
      const colorMatch = productColors.some(color => 
        selectedColors.includes(color.toLowerCase())
      );

      if (!colorMatch) {
        return false;
      }
    }

    // Size filter
    if (selectedSizes.length > 0) {
      const productSizes = product.attributes
        .find(attr => attr.name.toLowerCase() === 'size')
        ?.options || [];
      
      const sizeMatch = productSizes.some(size => 
        selectedSizes.includes(size.toLowerCase())
      );

      if (!sizeMatch) {
        return false;
      }
    }

    return true;
  });
};

export const getAvailableAttributes = (products: Product[]) => {
  const attributes = {
    colors: new Set<string>(),
    sizes: new Set<string>(),
    brands: new Set<string>(),
    categories: new Set<string>(),
    minPrice: Infinity,
    maxPrice: -Infinity
  };

  products.forEach(product => {
    // Categories
    product.categories.forEach(category => {
      attributes.categories.add(category);
    });

    // Brand
    if (product.brand) {
      attributes.brands.add(product.brand);
    }

    // Colors
    const colorAttr = product.attributes.find(attr => attr.name.toLowerCase() === 'color');
    if (colorAttr) {
      colorAttr.options.forEach(color => attributes.colors.add(color));
    }

    // Sizes
    const sizeAttr = product.attributes.find(attr => attr.name.toLowerCase() === 'size');
    if (sizeAttr) {
      sizeAttr.options.forEach(size => attributes.sizes.add(size));
    }

    // Price range
    const price = product.sale_price || product.price;
    if (price < attributes.minPrice) attributes.minPrice = price;
    if (price > attributes.maxPrice) attributes.maxPrice = price;
  });

  return {
    colors: Array.from(attributes.colors),
    sizes: Array.from(attributes.sizes),
    brands: Array.from(attributes.brands),
    categories: Array.from(attributes.categories),
    priceRange: {
      min: attributes.minPrice === Infinity ? 0 : attributes.minPrice,
      max: attributes.maxPrice === -Infinity ? 1000 : attributes.maxPrice
    }
  };
};
