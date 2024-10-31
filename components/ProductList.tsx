"use client";

import { useState, useEffect } from 'react';
import { useQuery, gql } from '@apollo/client';
import ProductCard from './ProductCard';
import FilterPanel from './FilterPanel';
import SortDropdown from './SortDropdown';
import { ProductsOrderByEnum, OrderEnum } from '../@types/graphql';
import { Button } from './ui/button'; // Assuming you have a Button component
import PriceRangeFilter from './PriceRangeFilter';

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

interface FilterPanelProps {
  categories: Array<{ id: string; name: string; slug: string }>;
  selectedCategories: string[];
  onCategoryChange: (category: string) => void;
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

interface ProductListProps {
  categoryFilter: string | null;
}

const ProductList: React.FC<ProductListProps> = ({ categoryFilter }) => {
  const [sortBy, setSortBy] = useState<ProductsOrderByEnum>(ProductsOrderByEnum.DATE);
  const [sortOrder, setSortOrder] = useState<OrderEnum>(OrderEnum.DESC);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [displayedProducts, setDisplayedProducts] = useState(12);
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: 1000 });
  const [currentPriceRange, setCurrentPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: 1000 });

  const { loading, error, data } = useQuery(GET_PRODUCTS_AND_CATEGORIES, {
    variables: { first: 120, after: null, sortBy, sortOrder },
  });

  useEffect(() => {
    if (categoryFilter) {
      if (categoryFilter.toLowerCase() === 'uncategorized') {
        setSelectedCategories([]); // Clear selection for "ALL"
      } else {
        setSelectedCategories([categoryFilter.toLowerCase()]);
      }
    } else {
      setSelectedCategories([]);
    }
  }, [categoryFilter]);

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

  if (loading) return <p>Loading...</p>;
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

  return (
    <div className="container mx-auto my-12 flex">
      <div className="w-1/4 pr-8">
        <FilterPanel 
          categories={[{id: 'all', name: 'All', slug: 'all'}, ...(data?.productCategories?.nodes || [])]}
          selectedCategories={selectedCategories}
          onCategoryToggle={handleCategoryToggle}
        />
        <PriceRangeFilter
          minPrice={priceRange.min}
          maxPrice={priceRange.max}
          currentMin={currentPriceRange.min}
          currentMax={currentPriceRange.max}
          onPriceChange={handlePriceChange}
        />
      </div>
      <div className="w-3/4">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-lato font-bold">Our Products</h2>
          <SortDropdown onSortChange={(newSortBy: string, newSortOrder: string) => 
            handleSortChange(newSortBy as ProductsOrderByEnum, newSortOrder as OrderEnum)
          } />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"> {/* Updated grid */}
          {filteredProducts.slice(0, displayedProducts).map((product: any) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        {displayedProducts < filteredProducts.length && (
          <div className="mt-8 text-center">
            <Button 
              onClick={handleShowMore}
              className="font-lato"
            >
              Show More
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductList;
