"use client";

import { useState, useEffect, useCallback } from 'react';
import { ProductCardSkeleton } from '../ui/LoadingSkeleton';
import ProductCardTypesense from '../ProductCardTypesense';
import { searchProducts, type Product } from '../../utils/typesense-search';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const ITEMS_PER_PAGE = 24;

const ProductListTypesense = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  // Calculate total pages
  const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);

  // Generate page numbers array
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;
    const halfMaxPages = Math.floor(maxPagesToShow / 2);

    let startPage = Math.max(1, currentPage - halfMaxPages);
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return pageNumbers;
  };

  // Fetch products from Typesense
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await searchProducts({
        q: '*',
        sort_by: 'price:asc',
        filter_by: 'stock_status:=instock',
        page: currentPage,
        per_page: ITEMS_PER_PAGE,
        query_by: 'name,description,brand'
      });
      
      // Filter out products without valid images
      const validProducts = result.products.filter(product => 
        product.image_url && 
        !product.image_url.includes('placeholder') &&
        !product.image_url.includes('woocommerce-placeholder')
      );

      setProducts(validProducts);
      setTotalProducts(result.found);
      setError(null);
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Error loading products. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage]);

  // Fetch products when page changes
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (error) {
    return <div className="text-center py-8 text-red-600">{error}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-8">
        All Products
      </h2>

      {isLoading ? (
        <ProductCardSkeleton count={ITEMS_PER_PAGE} />
      ) : (
        <>
          {products.length === 0 ? (
            <div className="text-center py-8">No products found.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product, index) => (
                <ProductCardTypesense key={product.id} product={product} index={index} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <Pagination className="mt-8">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage > 1) handlePageChange(currentPage - 1);
                    }}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>

                {getPageNumbers().map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handlePageChange(page);
                      }}
                      isActive={page === currentPage}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage < totalPages) handlePageChange(currentPage + 1);
                    }}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}
    </div>
  );
};

export default ProductListTypesense;
