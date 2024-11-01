"use client";

import { useQuery, gql } from '@apollo/client';
import ProductCard from './ProductCard';
import { useState, useEffect } from 'react';

const GET_PRODUCTS = gql`
  query GetProducts {
    products(first: 20, where: { status: "publish" }) {
      nodes {
        id
        databaseId
        name
        slug
        image {
          sourceUrl
          altText
        }
        ... on SimpleProduct {
          price
          regularPrice
          salePrice
          productCategories {
            nodes {
              id
              name
              slug
            }
          }
        }
        ... on VariableProduct {
          price
          regularPrice
          salePrice
          variations {
            nodes {
              id
              name
              price
              regularPrice
              salePrice
            }
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
    }
  }
`;

const RelatedProducts: React.FC = () => {
  const { loading, error, data } = useQuery(GET_PRODUCTS);
  const [randomProducts, setRandomProducts] = useState<any[]>([]);

  useEffect(() => {
    if (data?.products?.nodes) {
      // Filter out products without images
      const filteredProducts = data.products.nodes.filter((product: any) => 
        product.image?.sourceUrl
      );
      
      // Shuffle and get 4 random products
      const shuffled = [...filteredProducts].sort(() => 0.5 - Math.random());
      setRandomProducts(shuffled.slice(0, 4));
    }
  }, [data]);

  if (loading) return <div className="mt-12 text-center">Loading more products...</div>;
  if (error) {
    console.error('Related products error:', error);
    return null;
  }
  if (!randomProducts.length) return null;

  return (
    <div className="mt-12 pt-8 container mx-auto px-6">
      <h2 className="text-2xl font-lato font-bold mb-6">You May Also Like</h2>
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {randomProducts.map((product: any, index: number) => (
          <div key={product.id} className="flex justify-center">
            <div className="w-full max-w-[250px]">
              <ProductCard 
                product={product}
                index={index}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RelatedProducts;
