"use client";

import { useState, useEffect } from 'react';
import ProductCardTypesense from './ProductCardTypesense';
import { ProductCardSkeleton } from './ui/LoadingSkeleton';
import { searchProducts, type Product } from '../utils/typesense-search';
// Import Swiper React components and required modules
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Autoplay } from 'swiper/modules';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';

const FeaturedProducts = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);

        // Generate a random seed for each fetch to ensure different results each time
        const randomSeed = Math.floor(Math.random() * 1000000).toString();

        // Use different random sorting strategies for more variety
        // Only use fields that are definitely sortable in Typesense
        const sortingStrategies = [
          '_rand', // Random sort using Typesense's built-in random sort
          'price:asc',
          'price:desc'
          // Removed name:asc and name:desc as they're causing errors
        ];

        // Randomly select a sorting strategy
        const randomSortIndex = Math.floor(Math.random() * sortingStrategies.length);
        const selectedSort = sortingStrategies[randomSortIndex];

        console.log(`Using sorting strategy: ${selectedSort} with random seed: ${randomSeed}`);

        let results;
        try {
          // Try with the selected sorting strategy
          results = await searchProducts({
            q: '*',
            query_by: 'name,description,brand',
            sort_by: selectedSort,
            per_page: 200, // Fetch a large pool of products to randomly select from
            filter_by: 'stock_status:=instock',
            // Add the random seed as a parameter to ensure different results each time
            ...(selectedSort === '_rand' && { random_seed: randomSeed })
          });
        } catch (sortError) {
          console.error('Error with selected sort strategy, falling back to default:', sortError);

          // Fallback to a simple search without sorting
          results = await searchProducts({
            q: '*',
            query_by: 'name,description,brand',
            per_page: 200,
            filter_by: 'stock_status:=instock'
          });
        }

        // Filter out products without valid images
        const productsWithValidImages = results.products.filter((product: Product) =>
          product.image_url &&
          !product.image_url.includes('placeholder') &&
          !product.image_url.includes('woocommerce-placeholder')
        );

        // Process the products to ensure prices are correctly formatted
        const processedProducts = productsWithValidImages.map(product => {
          // Convert string prices to numbers if they're strings
          const regular_price = typeof product.regular_price === 'string'
            ? parseFloat(product.regular_price)
            : product.regular_price || 0;

          const sale_price = product.sale_price
            ? (typeof product.sale_price === 'string'
                ? parseFloat(product.sale_price)
                : product.sale_price)
            : null;

          // Use price field as fallback if regular_price is not available
          const finalRegularPrice = regular_price || (product.price ? (typeof product.price === 'string' ? parseFloat(product.price) : product.price) : 0);

          return {
            ...product,
            regular_price: finalRegularPrice,
            sale_price: sale_price
          };
        });

        // Shuffle the products array for additional randomness
        const shuffledProducts = [...processedProducts];
        for (let i = shuffledProducts.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledProducts[i], shuffledProducts[j]] = [shuffledProducts[j], shuffledProducts[i]];
        }

        // Log sample processed products for debugging
        console.log('Featured products sample:', shuffledProducts.slice(0, 2));

        // Getting products for the carousel (take first 12 after shuffling)
        setProducts(shuffledProducts.slice(0, 12));
        setError(null);
      } catch (err) {
        console.error('Error fetching products:', err);
        setError(err instanceof Error ? err.message : 'Error loading products');
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchProducts();

    // Set up interval to refresh products every 2 minutes for more frequent rotation
    const intervalId = setInterval(fetchProducts, 2 * 60 * 1000);

    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  if (loading) return <ProductCardSkeleton count={4} />;
  if (error) return <p>Error loading products: {error}</p>;
  if (!products || products.length === 0) {
    return <p>No products found.</p>;
  }

  return (
    <div className="mx-auto w-full px-4 py-12 sm:px-6 sm:py-16 lg:max-w-7xl lg:px-8 font-sans">
      <h2 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900 font-sans mb-6 md:mb-8 px-2">
        Featured Products
      </h2>

      <div className="relative featured-products-carousel">
        {/* Custom CSS for navigation arrows */}
        <style jsx>{`
          .featured-products-carousel :global(.swiper-button-next),
          .featured-products-carousel :global(.swiper-button-prev) {
            color: #000;
            transform: scale(1.2);
          }

          .featured-products-carousel :global(.swiper-button-next):after,
          .featured-products-carousel :global(.swiper-button-prev):after {
            font-size: 2rem;
            font-weight: bold;
          }

          @media (max-width: 640px) {
            .featured-products-carousel :global(.swiper-button-next),
            .featured-products-carousel :global(.swiper-button-prev) {
              transform: scale(0.5);
            }
          }
        `}</style>

        <Swiper
          modules={[Navigation, Autoplay]}
          spaceBetween={20}
          slidesPerView={2}
          navigation
          autoplay={{
            delay: 5000,
            disableOnInteraction: false,
          }}
          breakpoints={{
            320: {
              slidesPerView: 2,
              spaceBetween: 10,
            },
            640: {
              slidesPerView: 2,
              spaceBetween: 15,
            },
            768: {
              slidesPerView: 3,
              spaceBetween: 20,
            },
            1024: {
              slidesPerView: 4,
              spaceBetween: 20,
            },
          }}
          className="mySwiper"
        >
          {products.map((product: Product, index: number) => (
            <SwiperSlide key={product.id} className="py-2">
              <div className="transform scale-90 md:scale-100">
                <ProductCardTypesense product={product} index={index} />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  );
};

export default FeaturedProducts;
