import { gql } from '@apollo/client';
import { getApolloClient } from '@/lib/apollo-client';
import ProductList from '@/components/ProductList';
import FilterWrapper from '@/components/FilterWrapper';
import { Suspense } from 'react';

// Add ISR revalidation
export const revalidate = 3600;

const GET_CATEGORIES = gql`
  query GetCategories {
    productCategories(first: 100) {
      nodes {
        id
        name
        slug
      }
    }
  }
`;

// Main server component
export default async function ProductsPage() {
  // Fetch categories from WordPress
  const { data } = await getApolloClient().query({ 
    query: GET_CATEGORIES 
  });

  const categories = data?.productCategories?.nodes || [];

  return (
    <div className="flex">
      <Suspense fallback={<div>Loading filters...</div>}>
        <FilterWrapper categories={categories} />
      </Suspense>
      
      <ProductList />
    </div>
  );
}
