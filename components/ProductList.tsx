"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, gql } from '@apollo/client';
import { useSearchParams } from 'next/navigation';
import ProductCard from './ProductCard';
import FilterPanel from './FilterPanel';
import SortDropdown from './SortDropdown';
import { ProductsOrderByEnum, OrderEnum } from '../@types/graphql';
import { Button } from './ui/button';
import PriceRangeFilter from './PriceRangeFilter';
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { Filter } from "lucide-react";
import { Drawer } from '@mui/material';
import AttributeFilters from './AttributeFilters';

const GET_PRODUCTS = gql`
  query GetProducts(
    $first: Int!, 
    $after: String, 
    $sortBy: ProductsOrderByEnum!, 
    $sortOrder: OrderEnum!,
    $categories: [String]
  ) {
    products(
      first: $first, 
      after: $after, 
      where: { 
        orderby: { field: $sortBy, order: $sortOrder },
        status: "publish",
        categoryIn: $categories
      }
    ) {
      nodes {
        ... on SimpleProduct {
          id
          slug
          name
          price
          image {
            sourceUrl
          }
          productCategories {
            nodes {
              id
              name
              slug
            }
          }
          attributes {
            nodes {
              name
              options
            }
          }
        }
        ... on VariableProduct {
          id
          slug
          name
          price
          image {
            sourceUrl
          }
          productCategories {
            nodes {
              id
              name
              slug
            }
          }
          attributes {
            nodes {
              name
              options
            }
          }
          variations {
            nodes {
              attributes {
                nodes {
                  name
                  value
                }
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface ProductListProps {
  initialCategories?: Category[];
}

interface Product {
  __typename?: string;
  id: string;
  slug: string;
  name: string;
  price: string;
  image: {
    sourceUrl: string;
  };
  productCategories?: {
    nodes?: Array<{
      name: string;
      slug?: string;
    }>;
  };
  variations?: {
    nodes?: Array<{
      attributes: {
        nodes: Array<{
          name: string;
          value: string;
        }>;
      };
    }>;
  };
  attributes?: {
    nodes?: Array<{
      name: string;
      options: string[];
    }>;
  };
}

const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

const ProductList: React.FC<ProductListProps> = ({ initialCategories = [] }) => {
  const searchParams = useSearchParams();
  const [sortBy, setSortBy] = useState<ProductsOrderByEnum>(ProductsOrderByEnum.DATE);
  const [sortOrder, setSortOrder] = useState<OrderEnum>(OrderEnum.DESC);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [displayedProducts, setDisplayedProducts] = useState(12);
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: 1000 });
  const [currentPriceRange, setCurrentPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: 1000 });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 48;

  const { data, error } = useQuery(GET_PRODUCTS, {
    variables: { 
      first: ITEMS_PER_PAGE, 
      after: null, 
      sortBy, 
      sortOrder,
      categories: selectedCategories.length > 0 
        ? selectedCategories.map(cat => cat.toLowerCase())
        : null
    },
    fetchPolicy: 'cache-and-network',
    nextFetchPolicy: 'cache-first'
  });

  useEffect(() => {
    const category = searchParams?.get('category');
    if (category) {
      if (category.toLowerCase() === 'uncategorized') {
        setSelectedCategories([]);
      } else {
        setSelectedCategories([category.toLowerCase()]);
      }
    } else {
      setSelectedCategories([]);
    }
  }, [searchParams]);

  useEffect(() => {
    if (data?.products?.nodes) {
      const prices = data.products.nodes.map((product: Product) => {
        const price = product.price ? product.price.replace(/[^\d.]/g, '') : '0';
        return parseFloat(price) / 100;
      });
      const validPrices = prices.filter((price: number) => !isNaN(price));
      if (validPrices.length > 0) {
        const minPrice = Math.floor(Math.min(...validPrices));
        const maxPrice = Math.ceil(Math.max(...validPrices));
        setPriceRange({ min: minPrice, max: maxPrice });
        setCurrentPriceRange({ min: minPrice, max: maxPrice });
      }
    }
  }, [data]);

  const debouncedPriceChange = useCallback(
    debounce((min: number, max: number) => {
      setCurrentPriceRange({ min, max });
    }, 300),
    []
  );

  const handleShowMore = useCallback(() => {
    setDisplayedProducts(prev => prev + 12);
  }, []);

  const products = useMemo(() => {
    return data?.products?.nodes || [];
  }, [data]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    
    return products.filter((product: Product) => {
      // Price filter
      const price = product.price ? parseFloat(product.price.replace(/[^\d.]/g, '')) / 100 : 0;
      const priceMatch = price >= currentPriceRange.min && price <= currentPriceRange.max;

      // Category filter
      const categoryMatch = selectedCategories.length === 0 || 
        (product.productCategories?.nodes?.some(category => 
          selectedCategories.includes(category.slug?.toLowerCase() || '')
        ) ?? false);

      // Color and size filters
      let attributeMatch = true;
      if (selectedColors.length > 0 || selectedSizes.length > 0) {
        if (product.__typename === 'VariableProduct' && product.variations?.nodes) {
          // Check if any variation matches the selected attributes
          attributeMatch = product.variations.nodes.some(variation => {
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
          // For simple products, check direct attributes
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

      return priceMatch && categoryMatch && attributeMatch;
    });
  }, [products, selectedCategories, currentPriceRange, selectedColors, selectedSizes]);

  useEffect(() => {
    console.log('Selected Categories:', selectedCategories);
    console.log('Available Categories:', initialCategories);
    console.log('Total Products:', data?.products?.nodes?.length);
    console.log('Filtered Products:', filteredProducts.length);
  }, [selectedCategories, initialCategories, data, filteredProducts]);

  const handleSortChange = (newSortBy: ProductsOrderByEnum, newSortOrder: OrderEnum) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
  };

  const handleCategoryToggle = (categorySlug: string) => {
    setSelectedCategories(prev => {
      if (categorySlug.toLowerCase() === 'all') {
        return [];
      }
      
      if (prev.includes(categorySlug.toLowerCase())) {
        return prev.filter(c => c !== categorySlug.toLowerCase());
      }
      
      return [...prev, categorySlug.toLowerCase()];
    });
  };

  const handlePriceChange = (min: number, max: number) => {
    setCurrentPriceRange({ min, max });
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  useEffect(() => {
    console.log('Selected Categories:', selectedCategories);
    console.log('Available Categories:', initialCategories);
    console.log('Products Data:', data?.products?.nodes);
  }, [selectedCategories, initialCategories, data]);

  // Extract unique colors and sizes from products
  const { availableColors, availableSizes } = useMemo(() => {
    const colors = new Set<string>();
    const sizes = new Set<string>();

    data?.products.nodes.forEach((product: any) => {
      // Get attributes from both simple and variable products
      const attributes = product.attributes?.nodes || [];
      const variations = product.variations?.nodes || [];

      // Check direct attributes
      attributes.forEach((attr: any) => {
        if (attr.name.toLowerCase() === 'pa_color') {
          attr.options.forEach((color: string) => colors.add(color));
        }
        if (attr.name.toLowerCase() === 'pa_size') {
          attr.options.forEach((size: string) => sizes.add(size));
        }
      });

      // Check variation attributes
      variations.forEach((variation: any) => {
        variation.attributes.nodes.forEach((attr: any) => {
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
      availableSizes: Array.from(sizes)
        .sort((a, b) => {
          const numA = parseFloat(a);
          const numB = parseFloat(b);
          if (isNaN(numA) || isNaN(numB)) return a.localeCompare(b);
          return numA - numB;
        })
    };
  }, [data]);

  // Get available sizes for selected colors
  const availableSizesForColors = useMemo(() => {
    if (selectedColors.length === 0) return availableSizes;
    
    const sizes = new Set<string>();
    data?.products.nodes.forEach((product: any) => {
      if (product.__typename === 'VariableProduct') {
        product.variations.nodes.forEach((variation: any) => {
          const colorAttr = variation.attributes.nodes.find((attr: any) => 
            attr.name.toLowerCase() === 'pa_color'
          );
          const sizeAttr = variation.attributes.nodes.find((attr: any) => 
            attr.name.toLowerCase() === 'pa_size'
          );
          
          if (colorAttr && sizeAttr && selectedColors.includes(colorAttr.value)) {
            sizes.add(sizeAttr.value);
          }
        });
      }
    });
    
    return Array.from(sizes).sort((a, b) => {
      const numA = parseFloat(a);
      const numB = parseFloat(b);
      if (isNaN(numA) || isNaN(numB)) return a.localeCompare(b);
      return numA - numB;
    });
  }, [data, selectedColors, availableSizes]);

  // Get available colors for selected sizes
  const availableColorsForSizes = useMemo(() => {
    if (selectedSizes.length === 0) return availableColors;
    
    const colors = new Set<string>();
    data?.products.nodes.forEach((product: any) => {
      if (product.__typename === 'VariableProduct') {
        product.variations.nodes.forEach((variation: any) => {
          const colorAttr = variation.attributes.nodes.find((attr: any) => 
            attr.name.toLowerCase() === 'pa_color'
          );
          const sizeAttr = variation.attributes.nodes.find((attr: any) => 
            attr.name.toLowerCase() === 'pa_size'
          );
          
          if (colorAttr && sizeAttr && selectedSizes.includes(sizeAttr.value)) {
            colors.add(colorAttr.value);
          }
        });
      }
    });
    
    return Array.from(colors).sort();
  }, [data, selectedSizes, availableColors]);

  // Handle color and size selection
  const handleColorToggle = (colors: string[]) => {
    const color = colors[0]; // Get the first color from the array
    setSelectedColors(prev => 
      prev.includes(color) 
        ? prev.filter(c => c !== color)
        : [...prev, color]
    );
  };

  const handleSizeToggle = (size: string) => {
    setSelectedSizes(prev => 
      prev.includes(size) 
        ? prev.filter(s => s !== size)
        : [...prev, size]
    );
  };

  const filterContent = (
    <div className="w-full">
      <FilterPanel 
        categories={[
          {id: 'all', name: 'All', slug: 'all'}, 
          ...initialCategories
        ]}
        selectedCategories={selectedCategories}
        onCategoryToggle={handleCategoryToggle}
        onClose={handleDrawerToggle}
      />
      <PriceRangeFilter
        minPrice={priceRange.min}
        maxPrice={priceRange.max}
        currentMin={currentPriceRange.min}
        currentMax={currentPriceRange.max}
        onPriceChange={handlePriceChange}
      />
      <AttributeFilters
        availableColors={availableColorsForSizes}
        selectedColors={selectedColors}
        onColorToggle={handleColorToggle}
        availableSizes={availableSizesForColors}
        selectedSizes={selectedSizes}
        onSizeToggle={handleSizeToggle}
      />
    </div>
  );

  console.log('Products:', products);
  console.log('Filtered Products:', filteredProducts);
  console.log('Categories:', initialCategories);

  return (
    <div className="bg-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl mb-8 font-lato">Our Products</h1>
        <div className="lg:hidden mb-8">
          <Button 
            onClick={handleDrawerToggle} 
            variant="outline" 
            className="w-full py-2 text-sm font-medium flex items-center justify-center"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>

        {/* Mobile Filter Drawer */}
        <Drawer
          anchor="left"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', lg: 'none' },
            '& .MuiDrawer-paper': { 
              width: '100%', 
              maxWidth: '320px',
              boxSizing: 'border-box',
              padding: '20px',
              paddingTop: '100px', // Account for header
              backgroundColor: 'white',
              borderRight: '1px solid rgba(0, 0, 0, 0.1)',
            },
            '& .MuiBackdrop-root': {
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
            }
          }}
        >
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 font-lato">Categories</h3>
              <FilterPanel 
                categories={[
                  {id: 'all', name: 'All', slug: 'all'}, 
                  ...initialCategories
                ]}
                selectedCategories={selectedCategories}
                onCategoryToggle={handleCategoryToggle}
                onClose={handleDrawerToggle}
              />
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4 font-lato">Price Range</h3>
              <PriceRangeFilter
                minPrice={priceRange.min}
                maxPrice={priceRange.max}
                currentMin={currentPriceRange.min}
                currentMax={currentPriceRange.max}
                onPriceChange={handlePriceChange}
              />
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4 font-lato">Filters</h3>
              <AttributeFilters
                availableColors={availableColorsForSizes}
                selectedColors={selectedColors}
                onColorToggle={handleColorToggle}
                availableSizes={availableSizesForColors}
                selectedSizes={selectedSizes}
                onSizeToggle={handleSizeToggle}
              />
            </div>

            <Button 
              onClick={handleDrawerToggle}
              className="w-full mt-4"
            >
              Apply Filters
            </Button>
          </div>
        </Drawer>
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="hidden lg:block w-[280px] flex-shrink-0">
            {filterContent}
          </div>
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-8">
              <h2 className="text-3xl font-bold mb-4 sm:mb-0">Our Products</h2>
              <SortDropdown 
                onSortChange={(newSortBy: string, newSortOrder: string) => 
                  handleSortChange(newSortBy as ProductsOrderByEnum, newSortOrder as OrderEnum)
                } 
              />
            </div>

            {error ? (
              <div className="text-center py-4 text-red-500">
                Error loading products. Please try again.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 lg:gap-12">
                  {filteredProducts.slice(0, displayedProducts).map((product: any, index: number) => (
                    <div key={product.id}>
                      <ProductCard product={product} index={index} />
                    </div>
                  ))}
                </div>

                {filteredProducts.length > displayedProducts && (
                  <div className="mt-8 text-center">
                    <Button 
                      onClick={handleShowMore}
                      className="font-medium text-sm py-2 px-8 bg-gray-900 text-white hover:bg-gray-800"
                    >
                      Show More ({filteredProducts.length - displayedProducts} more)
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

ProductList.defaultProps = {
  initialCategories: []
};

export default ProductList;
