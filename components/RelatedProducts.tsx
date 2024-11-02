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
      setRandomProducts(shuffled.slice(0, 4));
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
    <section className="mt-6 md:mt-8 pt-2 md:pt-4">
      <div className="max-w-7xl mx-auto px-2 sm:px-3 lg:px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-lg md:text-xl font-lato font-bold mb-3 md:mb-4 text-gray-900 px-1">
            You May Also Like
          </h2>
          
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3 lg:gap-4">
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
                <div className="w-full max-w-[180px] md:max-w-[220px]">
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
          className="flex justify-center mt-4 md:mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <button 
            onClick={() => window.location.href = '/products'}
            className="inline-flex items-center justify-center 
              px-3 py-1.5 md:px-4 md:py-2 
              text-[10px] md:text-xs font-medium 
              text-white bg-gray-900 hover:bg-gray-800
              rounded-full transition-colors duration-200
              focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-900
              shadow-sm hover:shadow-md"
          >
            View All Products
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default RelatedProducts;
