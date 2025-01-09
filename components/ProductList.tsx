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
import { ProductCardSkeleton } from './ui/LoadingSkeleton';

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
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        ... on SimpleProduct {
          id
          slug
          name
          price
          stockStatus
          stockQuantity
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
          variations(first: 100) {
            nodes {
              id
              stockStatus
              stockQuantity
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

interface ProductVariation {
  id: string;
  name: string;
  stockStatus: string;
  stockQuantity?: number;
  attributes: {
    nodes: {
      name: string;
      value: string;
    }[];
  };
}

interface Product {
  __typename: 'SimpleProduct' | 'VariableProduct';
  id: string;
  slug: string;
  name: string;
  price?: string;
  stockStatus?: string;
  stockQuantity?: number;
  image?: {
    sourceUrl: string;
  };
  productCategories?: {
    nodes: {
      id: string;
      name: string;
      slug?: string;
    }[];
  };
  attributes?: {
    nodes: {
      name: string;
      options: string[];
    }[];
  };
  variations?: {
    nodes: ProductVariation[];
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
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: 1000 });
  const [currentPriceRange, setCurrentPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: 1000 });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [displayedProducts, setDisplayedProducts] = useState(24);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [endCursor, setEndCursor] = useState<string | null>(null);
  const ITEMS_PER_LOAD = 24;
  const FETCH_LIMIT = 100; // WooCommerce's maximum limit per request

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const { loading, error, data, fetchMore } = useQuery(GET_PRODUCTS, {
    variables: { 
      first: FETCH_LIMIT,
      after: null, 
      sortBy, 
      sortOrder,
      categories: selectedCategories.length > 0 
        ? selectedCategories.map(cat => cat.toLowerCase())
        : null
    },
    fetchPolicy: 'cache-and-network',
    nextFetchPolicy: 'cache-first',
    onCompleted: (data) => {
      console.log('Query completed. Total products:', data?.products?.nodes?.length);
      console.log('Page Info:', data?.products?.pageInfo);
      if (data?.products?.pageInfo) {
        setHasNextPage(data.products.pageInfo.hasNextPage);
        setEndCursor(data.products.pageInfo.endCursor);
      }
    },
    onError: (error) => {
      console.error('GraphQL Error:', error);
    }
  });

  useEffect(() => {
    if (error) {
      console.error('GraphQL Error:', error);
    }
  }, [error]);

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      if (hasNextPage && endCursor) {
        const result = await fetchMore({
          variables: {
            after: endCursor,
            first: FETCH_LIMIT
          },
          updateQuery: (prev, { fetchMoreResult }) => {
            if (!fetchMoreResult) return prev;
            
            console.log('Previous products:', prev.products.nodes.length);
            console.log('New products:', fetchMoreResult.products.nodes.length);
            console.log('Previous cursor:', endCursor);
            console.log('New cursor:', fetchMoreResult.products.pageInfo.endCursor);
            
            return {
              products: {
                ...fetchMoreResult.products,
                nodes: [
                  ...prev.products.nodes,
                  ...fetchMoreResult.products.nodes
                ],
                pageInfo: fetchMoreResult.products.pageInfo
              }
            };
          }
        });

        if (result.data?.products?.pageInfo) {
          setHasNextPage(result.data.products.pageInfo.hasNextPage);
          setEndCursor(result.data.products.pageInfo.endCursor);
        }
      }
      setDisplayedProducts(prev => prev + ITEMS_PER_LOAD);
    } catch (error) {
      console.error('Error loading more products:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasNextPage, isLoadingMore, endCursor, fetchMore]);

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

  const products = useMemo(() => {
    return data?.products?.nodes || [];
  }, [data]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    
    console.log('Starting filtering with total products:', products.length);
    
    return products.filter((product: Product) => {
      // Debug log for each product's stock status
      if (product.__typename === 'VariableProduct') {
        const totalVariations = product.variations?.nodes?.length || 0;
        const inStockVariations = product.variations?.nodes?.filter(
          v => v.stockStatus === 'IN_STOCK' || v.stockStatus === 'ON_BACKORDER'
        ).length || 0;

        console.log('Product:', {
          id: product.id,
          name: product.name,
          totalVariations,
          inStockVariations,
          variations: product.variations?.nodes?.map(v => ({
            id: v.id,
            name: v.name,
            stockStatus: v.stockStatus,
            attributes: v.attributes.nodes.map(attr => ({
              name: attr.name,
              value: attr.value
            }))
          }))
        });
      }

      // Check stock status for simple products
      if (product.__typename === 'SimpleProduct') {
        if (product.stockStatus === 'OUT_OF_STOCK') {
          return false;
        }
      }

      // Check stock status for variable products
      if (product.__typename === 'VariableProduct' && product.variations?.nodes) {
        // Check if at least one variation is in stock or on backorder
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
          const matches = selectedCategories.includes(category.slug?.toLowerCase() || '');
          return matches;
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
          // Only check available variations for attribute matches
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
  }, [products, selectedCategories, currentPriceRange, selectedColors, selectedSizes]);

  useEffect(() => {
    console.log('Selected Categories:', selectedCategories);
    console.log('Available Categories:', initialCategories);
    console.log('Total Products:', data?.products?.nodes?.length);
    console.log('Filtered Products:', filteredProducts.length);
    console.log('Has Next Page:', hasNextPage);
    console.log('End Cursor:', endCursor);
  }, [selectedCategories, initialCategories, data, filteredProducts, hasNextPage, endCursor]);

  const debouncedPriceChange = useCallback(
    debounce((min: number, max: number) => {
      setCurrentPriceRange({ min, max });
    }, 300),
    []
  );

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
    <div className="w-full bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-[60px] md:pt-[75px]">
        <div className="lg:hidden mb-8">
          <Button 
            onClick={handleDrawerToggle} 
            variant="outline" 
            className="w-full py-2 text-sm font-medium"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>
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
              maxWidth: '280px',
              top: { xs: '116px', sm: '116px' },
              height: 'calc(100% - 116px)',
              boxSizing: 'border-box',
              padding: '16px',
              backgroundColor: 'white'
            },
            '& .MuiBackdrop-root': {
              top: { xs: '116px', sm: '116px' }
            }
          }}
        >
          {filterContent}
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
            ) : loading && !data ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 lg:gap-12">
                {[...Array(12)].map((_, index) => (
                  <div key={index} className="animate-pulse">
                    <ProductCardSkeleton count={1} />
                  </div>
                ))}
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
                  <div className="flex justify-center mt-8">
                    <button
                      className="bg-gray-900 hover:bg-gray-800 text-white font-medium text-sm py-3 px-8 rounded-md transition-colors duration-200 flex items-center gap-2"
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                    >
                      {isLoadingMore ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Loading More Products...
                        </>
                      ) : (
                        <>Show More ({Math.min(ITEMS_PER_LOAD, filteredProducts.length - displayedProducts)} products)</>
                      )}
                    </button>
                  </div>
                )}

                {isLoadingMore && (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 lg:gap-12 mt-8">
                    {[...Array(Math.min(ITEMS_PER_LOAD, filteredProducts.length - displayedProducts))].map((_, index) => (
                      <div key={`loading-${index}`} className="animate-pulse">
                        <ProductCardSkeleton count={1} />
                      </div>
                    ))}
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
