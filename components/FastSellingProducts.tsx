"use client";

import { useQuery } from '@apollo/client';
import ProductCard from './ProductCard';
import { ProductCardSkeleton } from './ui/LoadingSkeleton';
import { GET_PRODUCT } from '../graphql/queries';

const FastSellingProducts = () => {
  const { loading, error, data } = useQuery(GET_PRODUCT, {
    variables: { first: 50 },  // Increased to ensure we have enough products after filtering
  });

  if (loading) return <ProductCardSkeleton count={9} />;
  if (error) return <p>Error loading products: {error.message}</p>;
  if (!data?.products?.nodes || data.products.nodes.length === 0) {
    return <p>No products found.</p>;
  }

  const productsWithValidImages = data.products.nodes.filter((product: any) => {
    return (
      product.image?.sourceUrl && 
      !product.image.sourceUrl.includes('placeholder') &&
      !product.image.sourceUrl.includes('woocommerce-placeholder')
    );
  });

  // Take exactly 9 random products
  const shuffledProducts = [...productsWithValidImages].sort(() => Math.random() - 0.5);
  const randomProducts = shuffledProducts.slice(0, 9);

  if (randomProducts.length === 0) {
    return <p>No products with valid images found.</p>;
  }

  return (
    <section className="w-full py-12 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center mb-8">
          Fast Selling Products
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 lg:gap-12">
          {randomProducts.map((product: any, index: number) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FastSellingProducts;
