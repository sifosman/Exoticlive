"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, gql } from '@apollo/client';
import { useSearchParams } from 'next/navigation';
import { ProductsOrderByEnum, OrderEnum } from '../@types/graphql';
import { Button } from './ui/button';
import { Filter } from "lucide-react";
import { 
  Grid, 
  Container, 
  Drawer,
  Box,
  Typography,
  IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ProductCard from './ProductCard';
import FilterPanel from './FilterPanel';
import SortDropdown from './SortDropdown';
import PriceRangeFilter from './PriceRangeFilter';
import AttributeFilters from './AttributeFilters';
import MobileFilterPanel from './MobileFilterPanel';
import { ProductCardSkeleton } from './ui/LoadingSkeleton';
import { Product } from '@/components/product/types';
import { Product as GraphQLProduct, Category } from '../types/product';

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
          regularPrice
          salePrice
          onSale
          averageRating
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
          regularPrice
          salePrice
          onSale
          averageRating
          stockStatus
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
              id
              name
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

interface ProductListProps {
  initialCategories?: Category[];
}

const ITEMS_PER_LOAD = 24;
const FETCH_LIMIT = 100; // WooCommerce's maximum limit per request

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
  const [displayedProducts, setDisplayedProducts] = useState(ITEMS_PER_LOAD);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [endCursor, setEndCursor] = useState<string | null>(null);
  const [allProducts, setAllProducts] = useState<GraphQLProduct[]>([]);
  const [isBackgroundLoading, setIsBackgroundLoading] = useState(false);

  const filterProducts = useCallback((products: GraphQLProduct[]) => {
    if (!products) return [];
    console.log('Filtering products:', products.length);
    
    return products.filter(product => {
      // For SimpleProduct, check if it's in stock
      if (!('variations' in product)) {
        return product.stockStatus === 'instock' || product.stockStatus === 'IN_STOCK';
      }
      
      // For VariableProduct, check if any variation is in stock
      const variableProduct = product as any;
      if (!variableProduct.variations?.nodes?.length) {
        return variableProduct.stockStatus === 'instock' || variableProduct.stockStatus === 'IN_STOCK';
      }
      
      // Check if at least one variation is in stock
      return variableProduct.variations.nodes.some(
        (variation: any) => variation.stockStatus === 'instock' || variation.stockStatus === 'IN_STOCK'
      );
    });
  }, []);

  const { loading, error, data, fetchMore } = useQuery(GET_PRODUCTS, {
    variables: { 
      first: FETCH_LIMIT,
      after: null,
      sortBy,
      sortOrder,
      categories: selectedCategories.length > 0 ? selectedCategories : null
    },
    notifyOnNetworkStatusChange: true,
    onError: (error) => {
      console.error('Error fetching products:', error);
    }
  });

  useEffect(() => {
    if (data?.products?.nodes) {
      console.log('Raw products data:', data.products.nodes);
      
      
      // Filter and deduplicate products when setting allProducts
      setAllProducts(prevProducts => {
        const existingIds = new Set(prevProducts.map(p => p.id));
        const newProducts = [...prevProducts];
        const filteredProducts = filterProducts(data.products.nodes);
        console.log('Filtered products:', filteredProducts.length);
        
        filteredProducts.forEach((product: GraphQLProduct) => {
          if (!existingIds.has(product.id)) {
            newProducts.push(product);
            existingIds.add(product.id);
          }
        });
        console.log('Final products count:', newProducts.length);
        return newProducts;
      });

      if (data.products.pageInfo) {
        setHasNextPage(data.products.pageInfo.hasNextPage);
        setEndCursor(data.products.pageInfo.endCursor);
      }
    }
  }, [data, filterProducts]);

  // Calculate filtered products
  const filteredProducts = useMemo(() => {
    console.log('Calculating filtered products from:', allProducts.length);
    let filtered = [...allProducts];

    // Apply category filter if categories are selected
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(product => {
        return product.productCategories?.nodes?.some(category => 
          selectedCategories.includes(category.slug?.toLowerCase() || '')
        );
      });
    }

    // Apply price filter if price range is set
    if (priceRange.min > 0 || priceRange.max < Infinity) {
      filtered = filtered.filter(product => {
        const price = parseFloat(product.price?.replace(/[^\d.]/g, '') || '0');
        return price >= priceRange.min && price <= priceRange.max;
      });
    }

    console.log('After category filter:', filtered.length);
    console.log('Selected categories:', selectedCategories);
    console.log('Price range:', priceRange);
    console.log('Final filtered count:', filtered.length);
    return filtered;
  }, [allProducts, selectedCategories, priceRange]);

  // Update displayedProducts when needed
  useEffect(() => {
    setDisplayedProducts(ITEMS_PER_LOAD);
  }, [filteredProducts]);

  // Update price range when products change
  useEffect(() => {
    if (allProducts.length > 0) {
      const prices = allProducts.map(product => {
        const price = product.price ? parseFloat(product.price.replace(/[^\d.]/g, '')) : 0;
        return price;
      });
      
      const validPrices = prices.filter(price => !isNaN(price) && price > 0);
      if (validPrices.length > 0) {
        const minPrice = Math.floor(Math.min(...validPrices));
        const maxPrice = Math.ceil(Math.max(...validPrices));
        setPriceRange({ min: minPrice, max: maxPrice });
        setCurrentPriceRange({ min: minPrice, max: maxPrice });
      }
    }
  }, [allProducts]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

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

  const { availableColors, availableSizes } = useMemo(() => {
    const colors = new Set<string>();
    const sizes = new Set<string>();

    allProducts.forEach((product: GraphQLProduct) => {
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
  }, [allProducts]);

  const availableSizesForColors = useMemo(() => {
    if (selectedColors.length === 0) return availableSizes;
    
    const sizes = new Set<string>();
    allProducts.forEach((product: GraphQLProduct) => {
      if (product.__typename === 'VariableProduct') {
        product.variations?.nodes.forEach((variation) => {
          const colorAttr = variation.attributes.nodes.find(
            attr => attr.name.toLowerCase() === 'pa_color'
          );
          const sizeAttr = variation.attributes.nodes.find(
            attr => attr.name.toLowerCase() === 'pa_size'
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
  }, [allProducts, selectedColors, availableSizes]);

  const availableColorsForSizes = useMemo(() => {
    if (selectedSizes.length === 0) return availableColors;
    
    const colors = new Set<string>();
    allProducts.forEach((product: GraphQLProduct) => {
      if (product.__typename === 'VariableProduct') {
        product.variations?.nodes.forEach((variation) => {
          const colorAttr = variation.attributes.nodes.find(
            attr => attr.name.toLowerCase() === 'pa_color'
          );
          const sizeAttr = variation.attributes.nodes.find(
            attr => attr.name.toLowerCase() === 'pa_size'
          );
          
          if (colorAttr && sizeAttr && selectedSizes.includes(sizeAttr.value)) {
            colors.add(colorAttr.value);
          }
        });
      }
    });
    
    return Array.from(colors).sort();
  }, [allProducts, selectedSizes, availableColors]);

  const handleColorToggle = (colors: string[]) => {
    const color = colors[0];
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

  const debouncedPriceChange = useCallback(
    debounce((min: number, max: number) => {
      setCurrentPriceRange({ min, max });
    }, 300),
    []
  );

  const handleLoadMore = () => {
    if (!isLoadingMore && hasNextPage) {
      setIsLoadingMore(true);
      console.log('Loading more products...');
      
      fetchMore({
        variables: {
          after: endCursor,
          first: ITEMS_PER_LOAD,
          sortBy,
          sortOrder,
          categories: selectedCategories.length > 0 ? selectedCategories : null
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev;
          if (!prev || !prev.products || !prev.products.nodes) return fetchMoreResult;
          
          try {
            setHasNextPage(fetchMoreResult.products.pageInfo.hasNextPage);
            setEndCursor(fetchMoreResult.products.pageInfo.endCursor);
            
            // Filter and deduplicate products
            const existingIds = new Set(prev.products.nodes.map((node: GraphQLProduct) => node.id));
            const filteredNewProducts = filterProducts(fetchMoreResult.products.nodes);
            const newNodes = filteredNewProducts.filter(
              (node: GraphQLProduct) => !existingIds.has(node.id)
            );
            
            const result = {
              products: {
                ...fetchMoreResult.products,
                nodes: [...prev.products.nodes, ...newNodes],
                pageInfo: fetchMoreResult.products.pageInfo
              }
            };
            
            console.log('New nodes added:', newNodes.length);
            return result;
          } catch (error) {
            console.error('Error in updateQuery:', error);
            return prev;
          }
        }
      }).finally(() => {
        setIsLoadingMore(false);
        setDisplayedProducts(prev => prev + ITEMS_PER_LOAD);
      });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        <div className="lg:hidden mb-8">
          <Button 
            onClick={handleDrawerToggle} 
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Desktop Filter Panel */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="space-y-6">
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
                onPriceChange={(min: number, max: number) => debouncedPriceChange(min, max)}
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
          </div>

          {/* Mobile Filter Drawer */}
          <Drawer
            variant="temporary"
            anchor="left"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true, // Better open performance on mobile.
            }}
            sx={{
              display: { xs: 'block', sm: 'none' },
              '& .MuiDrawer-paper': { 
                boxSizing: 'border-box', 
                width: 280,
                padding: 2,
                backgroundColor: 'background.paper'
              },
            }}
          >
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              mb: 2, 
              borderBottom: 1, 
              borderColor: 'divider', 
              pb: 1,
              pt: 1.5
            }}>
              <Typography variant="h6">Filters</Typography>
              <IconButton onClick={handleDrawerToggle}>
                <CloseIcon />
              </IconButton>
            </Box>
            <div className="space-y-6 mt-4">
              <MobileFilterPanel 
                categories={[
                  {id: 'all', name: 'All', slug: 'all'}, 
                  ...initialCategories
                ]}
                selectedCategories={selectedCategories}
                onCategoryToggle={handleCategoryToggle}
                onClose={handleDrawerToggle}
              />
              <AttributeFilters
                availableColors={availableColorsForSizes}
                selectedColors={selectedColors}
                onColorToggle={handleColorToggle}
                availableSizes={availableSizesForColors}
                selectedSizes={selectedSizes}
                onSizeToggle={handleSizeToggle}
              />
              <PriceRangeFilter
                minPrice={priceRange.min}
                maxPrice={priceRange.max}
                currentMin={currentPriceRange.min}
                currentMax={currentPriceRange.max}
                onPriceChange={(min: number, max: number) => debouncedPriceChange(min, max)}
              />
            </div>
          </Drawer>

          {/* Product Grid */}
          <div className="flex-1">
            <div className="mb-8">
              <SortDropdown onSortChange={handleSortChange} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {loading && !allProducts.length ? (
                // Initial loading state
                Array.from({ length: 12 }).map((_, index) => (
                  <ProductCardSkeleton key={`initial-${index}`} count={1} />
                ))
              ) : filteredProducts.length === 0 ? (
                // No products found
                <div className="col-span-full text-center py-12">
                  <p className="text-xl text-gray-600">No products found matching your criteria.</p>
                </div>
              ) : (
                // Product list
                <>
                  {filteredProducts
                    .slice(0, displayedProducts)
                    .map((product: GraphQLProduct, index: number) => (
                      <ProductCard 
                        key={product.id} 
                        product={product as Product}
                        index={index}
                      />
                    ))}
                  {isLoadingMore && (
                    Array.from({ length: 3 }).map((_, index) => (
                      <ProductCardSkeleton key={`loading-more-${index}`} count={1} />
                    ))
                  )}
                </>
              )}
            </div>

            {hasNextPage && filteredProducts.length >= displayedProducts && (
              <div className="flex justify-center mt-12 mb-8">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="font-lato px-8 py-3 bg-black text-white rounded-lg transition-all duration-300 
                    hover:bg-gray-900 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed
                    text-base tracking-wide font-medium transform hover:-translate-y-0.5"
                >
                  {isLoadingMore ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading...
                    </span>
                  ) : (
                    'Load More'
                  )}
                </button>
              </div>
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
