"use client";

import { useQuery, gql } from '@apollo/client';
import ProductCard from './ProductCard';
import { ProductCardSkeleton } from './ui/LoadingSkeleton';

const GET_PRODUCTS = gql`
  query GetProducts($first: Int!) {
    products(first: $first) {
      nodes {
        ... on SimpleProduct {
          id
          slug
          name
          price
          regularPrice
          salePrice
          onSale
          averageRating
          image {
            sourceUrl
          }
        }
        ... on VariableProduct {
          id
          slug
          name
          price
          regularPrice
          salePrice
          onSale
          averageRating
          image {
            sourceUrl
          }
        }
      }
    }
  }
`;

const FastSellingProducts = () => {
  const { loading, error, data } = useQuery(GET_PRODUCTS, {
    variables: { first: 20 },
  });

  if (loading) return <ProductCardSkeleton count={8} />;
  if (error) return <p>Error loading products: {error.message}</p>;
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
  const randomProducts = shuffledProducts.slice(0, 8);

  if (randomProducts.length === 0) {
    return <p>No products with valid images found.</p>;
  }

  return (
    <section className="my-12 max-w-7xl mx-auto px-4">
      <h2 className="text-3xl font-lato font-light tracking-wider text-center mb-8">
        Fast Selling Products
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {randomProducts.map((product: any) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
};

export default FastSellingProducts;
