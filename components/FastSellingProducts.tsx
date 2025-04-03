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

const FastSellingProducts = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const results = await searchProducts({
          q: '*',
          query_by: 'name,description,brand',
          sort_by: 'price:asc', // Sort by price ascending
          per_page: 200, // Increase to get more potential products
          filter_by: 'stock_status:=instock' // Only in-stock products
        });
        
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

        // Log sample processed products for debugging
        console.log('Fast selling products sample:', processedProducts.slice(0, 2));

        // Get more products for the carousel
        setProducts(processedProducts.slice(0, 12));
        setError(null);
      } catch (err) {
        console.error('Error fetching products:', err);
        setError(err instanceof Error ? err.message : 'Error loading products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (loading) return <ProductCardSkeleton count={4} />;
  if (error) return <p>Error loading products: {error}</p>;
  if (!products || products.length === 0) {
    return <p>No products found.</p>;
  }

  return (
    <div className="mx-auto w-full px-4 py-12 sm:px-6 sm:py-16 lg:max-w-7xl lg:px-8 font-sans">
      <h2 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900 font-sans mb-6 md:mb-8 px-2">
        Most Sold Products
      </h2>
      
      <div className="relative fast-selling-carousel">
        {/* Custom CSS for navigation arrows */}
        <style jsx>{`
          .fast-selling-carousel :global(.swiper-button-next),
          .fast-selling-carousel :global(.swiper-button-prev) {
            color: #000;
            transform: scale(0.7);
          }
          
          .fast-selling-carousel :global(.swiper-button-next):after,
          .fast-selling-carousel :global(.swiper-button-prev):after {
            font-size: 1.5rem;
            font-weight: bold;
          }
          
          @media (max-width: 640px) {
            .fast-selling-carousel :global(.swiper-button-next),
            .fast-selling-carousel :global(.swiper-button-prev) {
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

export default FastSellingProducts;
