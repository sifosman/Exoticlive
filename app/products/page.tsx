import { gql } from '@apollo/client';
import { getApolloClient } from '@/lib/apollo-client';
import ProductList from '@/components/ProductList';
import FilterPanel from '@/components/FilterPanel';
import { Suspense } from 'react';
import React from 'react';

// Add ISR revalidation
export const revalidate = 3600;

const GET_PRODUCTS = gql`
  query GetProducts {
    products(first: 50, where: { status: "publish" }) {
      nodes {
        id
        slug
        name
        shortDescription
        ... on SimpleProduct {
          price
          regularPrice
          salePrice
        }
        ... on VariableProduct {
          price
          regularPrice
          salePrice
        }
        image {
          sourceUrl
          altText
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

// Define the Category type
type Category = {
  name: string;
  id: string;
  slug: string;
};

// Create a client wrapper component for FilterPanel
function FilterWrapper({ categories }: { categories: Category[] }) {
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>([]);

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category.toLowerCase())
        ? prev.filter(c => c !== category.toLowerCase())
        : [...prev, category.toLowerCase()]
    );
  };

  return (
    <FilterPanel
      categories={categories}
      selectedCategories={selectedCategories}
      onCategoryToggle={handleCategoryToggle}
    />
  );
}

// Keep the type definition
type ProductListProps = {
  products: Array<{
    id: string;
    slug: string;
    name: string;
    shortDescription: string;
    price: string;
    regularPrice: string;
    salePrice: string;
    image: {
      sourceUrl: string;
      altText: string;
    };
  }>;
};

// Main server component
export default async function ProductsPage() {
  const { data } = await getApolloClient().query({ 
    query: GET_PRODUCTS 
  });

  const categories: Category[] = [
    // Update your categories array to include slug
    { name: "Category1", id: "1", slug: "category-1" },
    // ... other categories
  ];

  return (
    <div className="flex">
      <Suspense fallback={<div>Loading filters...</div>}>
        <FilterWrapper categories={categories} />
      </Suspense>
      
      <ProductList />
    </div>
  )
}
