import { gql } from '@apollo/client';
import { getApolloClient } from '@/lib/apollo-client';
import ProductList from '@/components/ProductList';
import { Suspense } from 'react';

// Add ISR revalidation
export const revalidate = 3600;

const GET_CATEGORIES = gql`
  query GetCategories {
    productCategories(first: 100, where: { exclude: "uncategorized" }) {
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
      
    </div>
  </div>
);

export default async function ProductsPage() {
  const { data } = await getApolloClient().query({ 
    query: GET_CATEGORIES,
    fetchPolicy: 'cache-first'
  });

  // Add console log for debugging
  console.log('Initial Categories:', data?.productCategories?.nodes);

  return (
    <main className="min-h-screen bg-white">
      <div className="pt-6 md:pt-6 pb-12 md:pb-16">
        <Suspense fallback={<LoadingFallback />}>
          <ProductList initialCategories={data?.productCategories?.nodes || []} />
        </Suspense>
      </div>
    </main>
  );
}
