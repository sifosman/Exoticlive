"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { useSearchParams } from 'next/navigation';
import { ProductsOrderByEnum, OrderEnum } from '../../@types/graphql';
import { Button } from '../ui/button';
import { Sheet, SheetContent, SheetTrigger } from "../ui/sheet";
import { Filter } from "lucide-react";
import { Drawer } from '@mui/material';
import { ProductCardSkeleton } from '../ui/LoadingSkeleton';
import ProductCard from '../ProductCard';
import SortDropdown from '../SortDropdown';
import ProductFilters from './ProductFilters';
import { GET_PRODUCTS } from './productQueries';
import { debounce, filterProducts, getAvailableAttributes } from './utils';
import { Category, Product } from './types';

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
  const [displayedProducts, setDisplayedProducts] = useState(24);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [endCursor, setEndCursor] = useState<string | null>(null);

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
    onCompleted: (data) => {
      if (data?.products?.pageInfo) {
        setHasNextPage(data.products.pageInfo.hasNextPage);
        setEndCursor(data.products.pageInfo.endCursor);
      }
    }
  });

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

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
    return filterProducts(
      products,
      selectedCategories,
      currentPriceRange,
      selectedColors,
      selectedSizes
    );
  }, [products, selectedCategories, currentPriceRange, selectedColors, selectedSizes]);

  const { availableColors, availableSizes } = useMemo(() => {
    return getAvailableAttributes(products);
  }, [products]);

  const availableSizesForColors = useMemo(() => {
    if (selectedColors.length === 0) return availableSizes;
    
    const sizes = new Set<string>();
    products.forEach((product: Product) => {
      if (product.__typename === 'VariableProduct') {
        product.variations?.nodes.forEach((variation) => {
          const colorAttr = variation.attributes.nodes.find((attr) => 
            attr.name.toLowerCase() === 'pa_color'
          );
          const sizeAttr = variation.attributes.nodes.find((attr) => 
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
  }, [products, selectedColors, availableSizes]);

  const availableColorsForSizes = useMemo(() => {
    if (selectedSizes.length === 0) return availableColors;
    
    const colors = new Set<string>();
    products.forEach((product: Product) => {
      if (product.__typename === 'VariableProduct') {
        product.variations?.nodes.forEach((variation) => {
          const colorAttr = variation.attributes.nodes.find((attr) => 
            attr.name.toLowerCase() === 'pa_color'
          );
          const sizeAttr = variation.attributes.nodes.find((attr) => 
            attr.name.toLowerCase() === 'pa_size'
          );
          
          if (colorAttr && sizeAttr && selectedSizes.includes(sizeAttr.value)) {
            colors.add(colorAttr.value);
          }
        });
      }
    });
    
    return Array.from(colors).sort();
  }, [products, selectedSizes, availableColors]);

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

  return (
    <div className="w-full bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-[60px] md:pt-[75px]">
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
            <ProductFilters
              categories={initialCategories}
              selectedCategories={selectedCategories}
              priceRange={priceRange}
              currentPriceRange={currentPriceRange}
              availableColors={availableColorsForSizes}
              selectedColors={selectedColors}
              availableSizes={availableSizesForColors}
              selectedSizes={selectedSizes}
              onCategoryToggle={handleCategoryToggle}
              onPriceChange={handlePriceChange}
              onColorToggle={handleColorToggle}
              onSizeToggle={handleSizeToggle}
              onClose={handleDrawerToggle}
            />
          </div>

          {/* Mobile Filter Panel */}
          <Drawer
            anchor="left"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            sx={{
              '& .MuiDrawer-paper': {
                width: 280,
                boxSizing: 'border-box',
                backgroundColor: 'white',
                padding: '1rem'
              },
            }}
          >
            <ProductFilters
              categories={initialCategories}
              selectedCategories={selectedCategories}
              priceRange={priceRange}
              currentPriceRange={currentPriceRange}
              availableColors={availableColorsForSizes}
              selectedColors={selectedColors}
              availableSizes={availableSizesForColors}
              selectedSizes={selectedSizes}
              onCategoryToggle={handleCategoryToggle}
              onPriceChange={handlePriceChange}
              onColorToggle={handleColorToggle}
              onSizeToggle={handleSizeToggle}
              onClose={handleDrawerToggle}
            />
          </Drawer>

          {/* Product Grid */}
          <div className="flex-1">
            <div className="mb-8">
              <SortDropdown onSortChange={handleSortChange} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {loading ? (
                Array.from({ length: 12 }).map((_, index) => (
                  <ProductCardSkeleton key={index} count={1} />
                ))
              ) : (
                filteredProducts
                  .slice(0, displayedProducts)
                  .map((product: Product, index: number) => (
                    <ProductCard key={product.id} product={product} index={index} />
                  ))
              )}
            </div>

            {filteredProducts.length > displayedProducts && (
              <div className="mt-8 flex justify-center">
                <Button
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="px-8"
                >
                  {isLoadingMore ? 'Loading...' : 'Load More'}
                </Button>
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
