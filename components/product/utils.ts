import { Product } from './types';

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
) => {
  if (!products) return [];
  
  return products.filter((product: Product) => {
    // Check stock status for simple products
    if (product.__typename === 'SimpleProduct') {
      if (product.stockStatus === 'OUT_OF_STOCK') {
        return false;
      }
    }

    // Check stock status for variable products
    if (product.__typename === 'VariableProduct' && product.variations?.nodes) {
      const hasAvailableVariation = product.variations.nodes.some(
        variation => variation.stockStatus === 'IN_STOCK' || variation.stockStatus === 'ON_BACKORDER'
      );
      
      if (!hasAvailableVariation) {
        return false;
      }
    }

    // Category filter
    const categoryMatch = selectedCategories.length === 0 || 
      (product.productCategories?.nodes?.some(category => {
        return selectedCategories.includes(category.slug?.toLowerCase() || '');
      }) ?? false);

    if (!categoryMatch) {
      return false;
    }

    // Price filter
    const price = product.price ? parseFloat(product.price.replace(/[^\d.]/g, '')) / 100 : 0;
    const priceMatch = price >= currentPriceRange.min && price <= currentPriceRange.max;
    if (!priceMatch) {
      return false;
    }

    // Color and size filters
    let attributeMatch = true;
    if (selectedColors.length > 0 || selectedSizes.length > 0) {
      if (product.__typename === 'VariableProduct' && product.variations?.nodes) {
        const availableVariations = product.variations.nodes.filter(
          variation => variation.stockStatus === 'IN_STOCK' || variation.stockStatus === 'ON_BACKORDER'
        );
        
        attributeMatch = availableVariations.some(variation => {
          const colorAttr = variation.attributes.nodes.find(
            attr => attr.name.toLowerCase() === 'pa_color'
          );
          const sizeAttr = variation.attributes.nodes.find(
            attr => attr.name.toLowerCase() === 'pa_size'
          );

          const matchesColor = selectedColors.length === 0 || 
            (colorAttr && selectedColors.includes(colorAttr.value));
          const matchesSize = selectedSizes.length === 0 || 
            (sizeAttr && selectedSizes.includes(sizeAttr.value));

          return matchesColor && matchesSize;
        });
      } else {
        const attributes = product.attributes?.nodes || [];
        const colorAttr = attributes.find(attr => attr.name.toLowerCase() === 'pa_color');
        const sizeAttr = attributes.find(attr => attr.name.toLowerCase() === 'pa_size');

        const matchesColor = selectedColors.length === 0 || 
          (colorAttr && colorAttr.options.some(option => selectedColors.includes(option)) || false);
        const matchesSize = selectedSizes.length === 0 || 
          (sizeAttr && sizeAttr.options.some(option => selectedSizes.includes(option)) || false);

        attributeMatch = matchesColor && matchesSize;
      }
    }

    return attributeMatch;
  });
};

export const getAvailableAttributes = (products: Product[]) => {
  const colors = new Set<string>();
  const sizes = new Set<string>();

  products?.forEach((product: Product) => {
    const attributes = product.attributes?.nodes || [];
    const variations = product.variations?.nodes || [];

    // Check direct attributes
    attributes.forEach((attr) => {
      if (attr.name.toLowerCase() === 'pa_color') {
        attr.options.forEach((color: string) => colors.add(color));
      }
      if (attr.name.toLowerCase() === 'pa_size') {
        attr.options.forEach((size: string) => sizes.add(size));
      }
    });

    // Check variation attributes
    variations.forEach((variation) => {
      variation.attributes.nodes.forEach((attr) => {
        if (attr.name.toLowerCase() === 'pa_color') {
          colors.add(attr.value);
        }
        if (attr.name.toLowerCase() === 'pa_size') {
          sizes.add(attr.value);
        }
      });
    });
  });

  return {
    availableColors: Array.from(colors).sort(),
    availableSizes: Array.from(sizes).sort((a, b) => {
      const numA = parseFloat(a);
      const numB = parseFloat(b);
      if (isNaN(numA) || isNaN(numB)) return a.localeCompare(b);
      return numA - numB;
    })
  };
};
