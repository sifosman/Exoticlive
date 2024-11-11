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
  initialCategories: Category[];
}

interface Product {
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

const ProductList = ({ initialCategories }: ProductListProps) => {
  const searchParams = useSearchParams();
  const [sortBy, setSortBy] = useState<ProductsOrderByEnum>(ProductsOrderByEnum.DATE);
  const [sortOrder, setSortOrder] = useState<OrderEnum>(OrderEnum.DESC);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
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
      categories: selectedCategories.length > 0 ? selectedCategories : null
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
    const products = data?.products?.nodes || [];
    if (!products.length) return [];

    return products.filter((product: Product) => {
      const price = product.price ? parseFloat(product.price.replace(/[^\d.]/g, '')) / 100 : 0;
      const priceMatch = price >= currentPriceRange.min && price <= currentPriceRange.max;
      
      return priceMatch;
    });
  }, [data, currentPriceRange]);

  useEffect(() => {
    console.log('Total products loaded:', products.length);
    console.log('Filtered products:', filteredProducts.length);
    console.log('Selected categories:', selectedCategories);
  }, [products.length, filteredProducts.length, selectedCategories]);

  const handleSortChange = (newSortBy: ProductsOrderByEnum, newSortOrder: OrderEnum) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
  };

  const handleCategoryToggle = (categorySlug: string) => {
    setSelectedCategories(prev => {
      if (categorySlug.toLowerCase() === 'all') {
        return [];
      }
      return prev.includes(categorySlug)
        ? prev.filter(c => c !== categorySlug)
        : [...prev, categorySlug];
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
    </div>
  );

  console.log('Products:', products);
  console.log('Filtered Products:', filteredProducts);
  console.log('Categories:', initialCategories);

  return (
    <div className="container mx-auto px-1 sm:px-2 md:px-3 lg:px-8 pt-[60px] md:pt-[75px]">
      <div className="lg:hidden mb-3">
        <Button 
          onClick={handleDrawerToggle} 
          variant="outline" 
          className="w-full py-2 text-xs md:text-sm"
        >
          <Filter className="h-3 w-3 md:h-4 md:w-4 mr-2" />
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
            top: '60px',
            height: 'calc(100% - 60px)',
            boxSizing: 'border-box',
            padding: '16px',
          },
        }}
      >
        {filterContent}
      </Drawer>
      <div className="flex flex-col lg:flex-row gap-3 md:gap-4 lg:gap-8">
        <div className="hidden lg:block w-[220px] flex-shrink-0">
          {filterContent}
        </div>
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 md:mb-4">
            <h2 className="text-lg md:text-xl lg:text-2xl font-lato font-bold mb-2 sm:mb-0 w-full text-center">
              Our Products
            </h2>
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
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-1 sm:gap-2 md:gap-3">
                {filteredProducts.slice(0, displayedProducts).map((product: any, index: number) => (
                  <div key={product.id} className="flex justify-center">
                    <div className="w-[calc(50vw-16px)] sm:w-full sm:max-w-[170px] md:max-w-[190px] lg:max-w-[210px]">
                      <ProductCard product={product} index={index} />
                    </div>
                  </div>
                ))}
              </div>

              {filteredProducts.length > displayedProducts && (
                <div className="mt-4 md:mt-6 text-center">
                  <Button 
                    onClick={handleShowMore}
                    className="font-lato text-xs md:text-sm py-2 px-4 md:px-6"
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
  );
};

export default ProductList;
