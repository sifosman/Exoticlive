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
  const [isFallbackMode, setIsFallbackMode] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const results = await searchProducts({
          q: '*',
          query_by: 'name,description,brand',
          sort_by: 'price:asc', // Sort by price as it's definitely available for sorting
          per_page: 200, // Increase to get more potential products
          filter_by: 'stock_status:=instock && categories:=[FastSellingProducts, fastsellingproducts, "Fast Selling Products", "fast selling products"]', // Try multiple variations of the category name
          include_fields: 'id,name,description,price,sale_price,regular_price,stock_status,image_url,slug,categories,colors,sizes'
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
        console.log('Fast Selling products sample:', processedProducts.slice(0, 2));
        console.log('Fast Selling products categories:', processedProducts.slice(0, 5).map(p => ({ id: p.id, categories: p.categories })));

        // Log all unique categories found in the results for debugging
        const allCategories = new Set();
        processedProducts.forEach(p => {
          if (p.categories && Array.isArray(p.categories)) {
            p.categories.forEach(cat => allCategories.add(cat));
          }
        });
        console.log('All unique categories found:', [...allCategories]);
        console.log('Total products found:', processedProducts.length);

        // Check if we found any products in the FastSellingProducts category
        if (processedProducts.length === 0) {
          console.log('No products found in FastSellingProducts category. Fetching recent products instead...');

          // Fallback: Fetch recent products instead
          try {
            const recentResults = await searchProducts({
              q: '*',
              query_by: 'name,description,brand',
              sort_by: 'id:desc', // Sort by ID descending as a proxy for recency
              per_page: 12,
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
            setProducts(recentProcessedProducts.slice(0, 12));
            setIsFallbackMode(true);
          } catch (err) {
            console.error('Error fetching recent products:', err);
            setError('No products found in FastSellingProducts category');
          }
        } else {
          // Use the products from the FastSellingProducts category
          setProducts(processedProducts.slice(0, 12));
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

  if (loading) return <ProductCardSkeleton count={4} />;
  if (error) return <p>Error loading products: {error}</p>;
  if (!products || products.length === 0) {
    return (
      <div className="mx-auto w-full px-4 py-12 sm:px-6 sm:py-16 lg:max-w-7xl lg:px-8 font-sans">
        <h2 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900 font-sans mb-6 md:mb-8 px-2">
          Fast Selling Products
        </h2>
        <div className="text-gray-500 text-center py-8">
          <p className="mb-4">
            No products found in the FastSellingProducts category.
          </p>
          <p className="mb-4">
            To display products here, please add products to the "FastSellingProducts" category in WooCommerce.
          </p>
          <p>
            After adding products to the category, run the sync script: <code>node scripts/complete-woocommerce-sync.mjs</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full px-4 py-12 sm:px-6 sm:py-16 lg:max-w-7xl lg:px-8 font-sans">
      <h2 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900 font-sans mb-6 md:mb-8 px-2">
        {isFallbackMode ? 'Newest Arrivals' : 'Fast Selling Products'}
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
