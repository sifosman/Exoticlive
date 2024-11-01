"use client";

import { useQuery, gql } from '@apollo/client';
import ProductCard from './ProductCard';
import { ProductCardSkeleton } from './ui/LoadingSkeleton';
import { GET_PRODUCT } from '../graphql/queries';

const FeaturedProducts = () => {
  const { loading, error, data } = useQuery(GET_PRODUCT, {
    variables: { first: 20 },
  });

  if (loading) return <ProductCardSkeleton count={8} />;
  if (error) return <p>Error loading featured products: {error.message}</p>;
  if (!data || !data.products || !data.products.nodes || data.products.nodes.length === 0) {
    return <p>No products found.</p>;
  }

  const productsWithValidImages = data.products.nodes.filter((product: any) => {
    return (
      product.image?.sourceUrl && 
      !product.image.sourceUrl.includes('placeholder') &&
      !product.image.sourceUrl.includes('woocommerce-placeholder')
    );
  });

  const shuffledProducts = [...productsWithValidImages].sort(() => Math.random() - 0.5);
  const randomFeaturedProducts = shuffledProducts.slice(0, 8);

  if (randomFeaturedProducts.length === 0) {
    return <p>No products with valid images found.</p>;
  }

  return (
    <section className="my-12 max-w-7xl mx-auto px-4">
      <h2 className="text-3xl font-lato font-light tracking-wider text-center mb-8">
        Featured Products
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {randomFeaturedProducts.map((product: any, index: number) => (
          <ProductCard key={product.id} product={product} index={index} />
        ))}
      </div>
    </section>
  );
};

export default FeaturedProducts;
