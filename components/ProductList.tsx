"use client";

import { useState, useEffect } from 'react';
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

const GET_PRODUCTS_AND_CATEGORIES = gql`
  query GetProductsAndCategories($first: Int!, $after: String, $sortBy: ProductsOrderByEnum!, $sortOrder: OrderEnum!) {
    products(first: $first, after: $after, where: { orderby: { field: $sortBy, order: $sortOrder } }) {
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
          image {
            sourceUrl
          }
          productCategories {
            nodes {
              name
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
          image {
            sourceUrl
          }
          productCategories {
            nodes {
              name
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
    productCategories(first: 100) {
      nodes {
        id
        name
        slug
      }
    }
  }
`;

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


const ProductList = () => {
  const searchParams = useSearchParams();
  const [sortBy, setSortBy] = useState<ProductsOrderByEnum>(ProductsOrderByEnum.DATE);
  const [sortOrder, setSortOrder] = useState<OrderEnum>(OrderEnum.DESC);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [displayedProducts, setDisplayedProducts] = useState(12);
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: 1000 });
  const [currentPriceRange, setCurrentPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: 1000 });
  const [mobileOpen, setMobileOpen] = useState(false);

  const { loading, error, data } = useQuery(GET_PRODUCTS_AND_CATEGORIES, {
    variables: { first: 120, after: null, sortBy, sortOrder },
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
        return parseFloat(price) / 100; // Divide by 100 to convert cents to rand
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

 
  if (error) return <p>Error: {error.message}</p>;

  const products = data?.products.nodes || [];

  const filteredProducts = products.filter((product: Product) => {
    const price = product.price ? parseFloat(product.price.replace(/[^\d.]/g, '')) / 100 : 0; // Divide by 100 here as well
    const categoryMatch = selectedCategories.length === 0 || 
      product.productCategories?.nodes?.some(category => 
        selectedCategories.includes(category.name.toLowerCase())
      );
    const priceMatch = price >= currentPriceRange.min && price <= currentPriceRange.max;
    return categoryMatch && priceMatch;
  });

  const handleSortChange = (newSortBy: ProductsOrderByEnum, newSortOrder: OrderEnum) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
  };

  const handleCategoryToggle = (category: string) => {
    if (category.toLowerCase() === 'all') {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(prev => 
        prev.includes(category.toLowerCase()) 
          ? prev.filter(c => c !== category.toLowerCase()) 
          : [...prev, category.toLowerCase()]
      );
    }
  };

  const handlePriceChange = (min: number, max: number) => {
    setCurrentPriceRange({ min, max });
  };

  const handleShowMore = () => {
    setDisplayedProducts(prev => Math.min(prev + 12, filteredProducts.length));
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const filterContent = (
    <div className="w-full">
      <FilterPanel 
        categories={[{id: 'all', name: 'All', slug: 'all'}, ...(data?.productCategories?.nodes || [])]}
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
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-1 sm:gap-2 md:gap-3">
            {filteredProducts.slice(0, displayedProducts).map((product: any, index: number) => (
              <div key={product.id} className="flex justify-center">
                <div className="w-[calc(50vw-16px)] sm:w-full sm:max-w-[170px] md:max-w-[190px] lg:max-w-[210px]">
                  <ProductCard product={product} index={index} />
                </div>
              </div>
            ))}
          </div>
          {displayedProducts < filteredProducts.length && (
            <div className="mt-4 md:mt-6 text-center">
              <Button 
                onClick={handleShowMore}
                className="font-lato text-xs md:text-sm py-2 px-4 md:px-6"
              >
                Show More
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductList;
