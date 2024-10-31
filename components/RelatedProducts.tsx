import { useQuery, gql } from '@apollo/client';
import ProductCard from './ProductCard';
import { useState, useEffect } from 'react';

const GET_PRODUCTS = gql`
  query GetProducts {
    products(first: 20) {
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
              slug
            }
          }
        }
      }
    }
  }
`;

const RelatedProducts: React.FC = () => {
  const { loading, error, data } = useQuery(GET_PRODUCTS);
  const [randomProducts, setRandomProducts] = useState<any[]>([]);

  useEffect(() => {
    if (data && data.products && data.products.nodes) {
      const filteredProducts = data.products.nodes.filter((product: {
        productCategories: {
          nodes: { slug: string }[]
        }
      }) => 
        !product.productCategories.nodes.some(cat => cat.slug === 'uncategorized')
      );
      const shuffled = [...filteredProducts].sort(() => 0.5 - Math.random());
      setRandomProducts(shuffled.slice(0, 4));
    }
  }, [data]);

  if (loading) return <p>Loading more products...</p>;
  if (error) return <p>Error loading products: {error.message}</p>;

  return (
    <div className="mt-12 pt-8 container mx-auto px-6">
      <h2 className="text-2xl font-lato font-bold mb-6">You May Also Like</h2>
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {randomProducts.map((product: any) => (
          <div key={product.id} className="flex justify-center">
            <div className="w-full max-w-[250px]">
              <ProductCard 
                product={{
                  ...product,
                  variationId: product.id
                }} 
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RelatedProducts;
