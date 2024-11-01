import { gql } from '@apollo/client';
import { getApolloClient } from '@/lib/apollo-client';
import ProductList from '@/components/ProductList';

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

export default async function ProductsPage() {
  try {
    const { data } = await getApolloClient().query({
      query: GET_PRODUCTS,
    });

    if (!data?.products?.nodes) {
      return <div>No products found</div>;
    }

    return (
      <div className="container mx-auto px-4 py-8" style={{ marginTop: '50px' }}>
        <div className="max-w-7xl mx-auto">
          <ProductList />
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
}
