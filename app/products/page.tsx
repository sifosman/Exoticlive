import { gql } from '@apollo/client';
import { getApolloClient } from '@/lib/apollo-client';
import ProductList from '@/components/ProductList';
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

// Loading component
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-gray-600 text-sm md:text-base font-lato">Loading products...</p>
    </div>
  </div>
);

export default async function ProductsPage() {
  const { data } = await getApolloClient().query({ 
    query: GET_CATEGORIES 
  });

  const categories = data?.productCategories?.nodes || [];

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="pt-16 md:pt-20 pb-6 md:pb-8">
          <h1 className="text-2xl md:text-3xl font-lato font-bold text-gray-900 text-center mb-2">
            Our Products
          </h1>
          <p className="text-sm md:text-base text-gray-600 text-center max-w-2xl mx-auto">
            Discover our collection of quality footwear for every occasion
          </p>
        </div>

        {/* Products Grid */}
        <div className="pb-12 md:pb-16">
          <Suspense fallback={<LoadingFallback />}>
            <ProductList />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
