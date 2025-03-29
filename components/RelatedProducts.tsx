"use client";

import { useQuery, gql } from '@apollo/client';
import ProductCard from './ProductCard';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

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
      const filteredProducts = data.products.nodes.filter((product: any) => 
        product.image?.sourceUrl
      );
      
      const shuffled = [...filteredProducts].sort(() => 0.5 - Math.random());
      setRandomProducts(shuffled.slice(0, 5));
    }
  }, [data]);

  if (loading) return (
    <div className="mt-8 md:mt-12 text-center text-gray-600 text-sm md:text-base">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        Loading more products...
      </motion.div>
    </div>
  );
  
  if (error) {
    console.error('Related products error:', error);
    return null;
  }
  if (!randomProducts.length) return null;

  return (
    <section className="mt-4 md:mt-6">
      <div className="max-w-7xl mx-auto px-2 sm:px-3 lg:px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-4">
            {randomProducts.map((product: any, index: number) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  duration: 0.5,
                  delay: index * 0.1 
                }}
                className="flex justify-center"
              >
                <div className="w-full max-w-full">
                  <ProductCard 
                    product={product}
                    index={index}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div 
          className="flex justify-center mt-6 md:mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <button 
            onClick={() => window.location.href = '/products'}
            className="inline-flex items-center justify-center 
              px-4 py-2 md:px-5 md:py-2.5
              text-xs md:text-sm font-medium 
              text-white bg-black hover:bg-gray-800
              rounded transition-colors duration-200
              focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-900
              shadow-sm hover:shadow-md"
          >
            Shop All Products
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default RelatedProducts;
