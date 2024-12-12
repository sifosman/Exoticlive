"use client";

import { useQuery } from '@apollo/client';
import ProductCard from './ProductCard';
import { ProductCardSkeleton } from './ui/LoadingSkeleton';
import { GET_PRODUCT } from '../graphql/queries';

const FeaturedProducts = () => {
  const { loading, error, data } = useQuery(GET_PRODUCT, {
    variables: { 
      first: 50,  // Increased to ensure we have enough products after filtering
      orderby: [{ field: 'DATE', order: 'DESC' }]
    },
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

  // Take exactly 9 most recent products
  const recentProducts = productsWithValidImages.slice(0, 9);

  if (recentProducts.length === 0) {
    return <p>No products with valid images found.</p>;
  }

  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl mb-8 font-lato text-center">Featured Products</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 lg:gap-12">
          {recentProducts.map((product: any, index: number) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;
