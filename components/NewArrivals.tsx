'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { searchProducts, type Product } from '@/utils/typesense-search';
import { ProductCardSkeleton } from './ui/LoadingSkeleton';

// Import Swiper React components
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Autoplay } from 'swiper/modules';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';

export default function NewArrivals() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);

        // Fetch products using the original query from FastSellingProducts
        const results = await searchProducts({
          q: '*',
          query_by: 'name,description,brand',
          sort_by: 'price:asc', // Sort by price as it's definitely available for sorting
          per_page: 200, // Increase to get more potential products
          filter_by: 'stock_status:=instock && categories:=[FastSellingProducts, fastsellingproducts, "Fast Selling Products", "fast selling products"]', // Try multiple variations of the category name
          include_fields: 'id,name,description,price,sale_price,regular_price,stock_status,image_url,slug,categories,colors,sizes'
        });

        // Filter products with valid images
        const validProducts = results.products.filter((product: Product) =>
          product.image_url &&
          !product.image_url.includes('placeholder') &&
          !product.image_url.includes('woocommerce-placeholder')
        );

        // Process products to ensure consistent price format
        const processedProducts = validProducts.map((product: Product) => {
          const regular_price = typeof product.regular_price === 'string'
            ? parseFloat(product.regular_price)
            : product.regular_price || 0;

          const sale_price = product.sale_price
            ? (typeof product.sale_price === 'string'
                ? parseFloat(product.sale_price)
                : product.sale_price)
            : null;

          const finalRegularPrice = regular_price ||
            (product.price ? (typeof product.price === 'string' ? parseFloat(product.price) : product.price) : 0);

          return {
            ...product,
            regular_price: finalRegularPrice,
            sale_price: sale_price
          };
        });

        // Shuffle products for randomness
        const shuffled = [...processedProducts];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        // Check if we found any products in the FastSellingProducts category
        if (shuffled.length === 0) {
          console.log('No products found in FastSellingProducts category. Fetching recent products instead...');

          // Fallback: Fetch recent products instead
          try {
            const recentResults = await searchProducts({
              q: '*',
              query_by: 'name,description,brand',
              sort_by: 'price:desc', // Sort by price descending
              per_page: 24, // Get more products to ensure we have enough
              filter_by: 'stock_status:=instock',
              include_fields: 'id,name,description,price,sale_price,regular_price,stock_status,image_url,slug,categories,colors,sizes'
            });

            // Process the recent products
            const recentProcessedProducts = recentResults.products.filter((product: Product) =>
              product.image_url &&
              !product.image_url.includes('placeholder') &&
              !product.image_url.includes('woocommerce-placeholder')
            ).map(product => {
              const regular_price = typeof product.regular_price === 'string'
                ? parseFloat(product.regular_price)
                : product.regular_price || 0;

              const sale_price = product.sale_price
                ? (typeof product.sale_price === 'string'
                    ? parseFloat(product.sale_price)
                    : product.sale_price)
                : null;

              const finalRegularPrice = regular_price || (product.price ? (typeof product.price === 'string' ? parseFloat(product.price) : product.price) : 0);

              return {
                ...product,
                regular_price: finalRegularPrice,
                sale_price: sale_price
              };
            });

            console.log('Found recent products instead:', recentProcessedProducts.length);

            // Shuffle the products for more randomness
            const shuffledRecent = [...recentProcessedProducts];
            for (let i = shuffledRecent.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [shuffledRecent[i], shuffledRecent[j]] = [shuffledRecent[j], shuffledRecent[i]];
            }

            setProducts(shuffledRecent.slice(0, 12));
          } catch (err) {
            console.error('Error fetching recent products:', err);
            setError('No products found in FastSellingProducts category');
          }
        } else {
          // Use the products from the FastSellingProducts category
          setProducts(shuffled.slice(0, 12));
          setError(null);
        }
      } catch (err) {
        console.error('Error fetching products:', err);
        setError(err instanceof Error ? err.message : 'Error loading products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Format price with R symbol
  const formatPrice = (price: number) => {
    return `R${price.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold mb-6">New Arrivals</h2>
        <ProductCardSkeleton count={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold mb-6">New Arrivals</h2>
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold mb-6">New Arrivals</h2>
        <p>No products found.</p>
      </div>
    );
  }

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold mb-6">New Arrivals</h2>

        <div className="relative">
          {/* Custom navigation arrow styles */}
          <style jsx global>{`
            .swiper-button-next,
            .swiper-button-prev {
              color: #000 !important;
              transform: scale(1.2) !important;
            }

            .swiper-button-next:after,
            .swiper-button-prev:after {
              font-size: 2rem !important;
              font-weight: bold !important;
            }

            @media (max-width: 640px) {
              .swiper-button-next,
              .swiper-button-prev {
                transform: scale(0.8) !important;
              }
            }
          `}</style>

          <Swiper
            modules={[Navigation, Autoplay]}
            spaceBetween={20}
            slidesPerView={1}
            navigation={true}
            autoplay={{
              delay: 3000,
              disableOnInteraction: false,
            }}
            loop={true}
            speed={800}
            breakpoints={{
              640: {
                slidesPerView: 2,
                spaceBetween: 20,
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
          >
            {products.map((product) => (
              <SwiperSlide key={product.id}>
                <div className="group relative">
                  <Link href={`/product/${product.slug}`}>
                    <div className="aspect-h-1 aspect-w-1 w-full overflow-hidden rounded-md bg-gray-200 lg:aspect-none group-hover:opacity-75 lg:h-80">
                      <div className="relative h-full w-full">
                        <Image
                          src={product.image_url || '/placeholder.png'}
                          alt={product.name}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 25vw"
                          style={{ objectFit: 'cover' }}
                          className="h-full w-full object-cover object-center lg:h-full lg:w-full"
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex justify-between">
                      <div>
                        <h3 className="text-sm text-gray-700">
                          <span aria-hidden="true" className="absolute inset-0" />
                          {product.name}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          {product.colors && product.colors.length > 0 && product.colors[0]}
                        </p>
                      </div>
                      <div>
                        {product.sale_price ? (
                          <div>
                            <p className="text-sm font-medium text-gray-900">{formatPrice(product.sale_price)}</p>
                            <p className="text-sm font-medium text-gray-400 line-through">{formatPrice(product.regular_price)}</p>
                          </div>
                        ) : (
                          <p className="text-sm font-medium text-gray-900">{formatPrice(product.regular_price)}</p>
                        )}
                      </div>
                    </div>
                  </Link>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </div>
  );
}
