"use client";

import { useState, useEffect } from 'react';
import TypesenseProductCard from './TypesenseProductCard';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { client as typesenseClient } from '@/utils/typesense-client';

interface Product {
  id: string;
  name: string;
  price: number;
  sale_price?: number;
  regular_price: number;
  image_url: string;
  slug: string;
  stock_status: string;
  colors: string[];
  sizes: string[];
  categories: string[];
  is_on_sale: boolean;
}

interface Filters {
  categories: string[];
  priceRange: [number, number];
  stockStatus: string[];
  sizes: string[];
  colors: string[];
}

interface Props {
  filters?: {
    sizes: string[];
    priceRange: [number, number];
    colors: string[];
    categories: string[];
  };
  searchQuery?: string;
}

interface TypesenseSearchResult {
  found: number;
  hits: Array<{
    document: {
      id: string;
      name: string;
      price: string | number;
      sale_price?: string | number;
      regular_price: string | number;
      image_url: string;
      slug: string;
      stock_status: string;
      colors: string[];
      sizes: string[];
      categories: string[];
      is_on_sale: boolean;
    };
  }>;
  page: number;
  facet_counts: any[];
}

const ITEMS_PER_PAGE = 24;

const TypesenseProductGrid = ({ filters, searchQuery = '' }: Props) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [facets, setFacets] = useState<any[]>([]);
  const [typesenseHealth, setTypesenseHealth] = useState({ ok: false });
  const [internalFilters, setFilters] = useState<Filters>({
    categories: [],
    priceRange: [0, 10000],
    stockStatus: [],
    sizes: [],
    colors: []
  });

  // Check Typesense health
  useEffect(() => {
    const checkTypesenseHealth = async () => {
      try {
        const health = await typesenseClient.health.retrieve();
        console.log('Typesense Health:', health);
        setTypesenseHealth(health);
      } catch (error) {
        console.error('Health check failed:', error);
        setTypesenseHealth({ ok: false });
      }
    };
    
    checkTypesenseHealth();
  }, []);

  // Update internal filters when props change
  useEffect(() => {
    if (filters) {
      setFilters(prev => ({
        ...prev,
        priceRange: filters.priceRange,
        sizes: filters.sizes || [],
        colors: filters.colors || [],
        categories: filters.categories || []
      }));
    }
  }, [filters]);

  // Calculate total pages
  const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);

  // Handle filter changes
  const handleFilterChange = (newFilters: Filters): void => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Handle page change
  const handlePageChange = (page: number): void => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Generate page numbers array
  const getPageNumbers = (): (number | string)[] => {
    if (totalPages <= 7) {
      // If we have 7 or fewer pages, show all of them
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    // Always show first and last page
    // Show current page and one page before and after
    const pages = new Set([1, totalPages, currentPage]);
    
    // Add one page before and after current page
    if (currentPage > 1) pages.add(currentPage - 1);
    if (currentPage < totalPages) pages.add(currentPage + 1);

    // Add second page if we're showing dots right after it
    if (currentPage > 4) pages.add(2);
    
    // Add second-to-last page if we're showing dots right before it
    if (currentPage < totalPages - 3) pages.add(totalPages - 1);

    const sortedPages = Array.from(pages).sort((a, b) => a - b);
    const result: (number | string)[] = [];

    for (let i = 0; i < sortedPages.length; i++) {
      if (i > 0) {
        // If there's a gap between two pages, add dots
        if (sortedPages[i] - sortedPages[i - 1] > 1) {
          result.push('...');
        }
      }
      result.push(sortedPages[i]);
    }

    return result;
  };

  // Fetch products
  useEffect(() => {
    const fetchProducts = async (): Promise<void> => {
      setIsLoading(true);
      try {
        // Create search parameters
        const searchParameters: any = {
          q: searchQuery || '*',
          query_by: 'name,description',
          filter_by: 'stock_status:=instock',
          page: currentPage,
          per_page: ITEMS_PER_PAGE,
          sort_by: '_text_match:desc',
          include_fields: 'id,name,description,price,sale_price,regular_price,stock_status,image_url,slug,categories,colors,sizes,is_on_sale',
          facet_by: 'categories,colors,sizes',
        };

        // Build filter string
        let filterString = 'stock_status:=instock';

        // Add price filter
        if (filters?.priceRange) {
          const [minPrice, maxPrice] = filters.priceRange;
          if (minPrice > 0 || maxPrice < 10000) {
            filterString += ` && price:>=${minPrice} && price:<=${maxPrice}`;
          }
        }

        // Add category filter
        if (filters?.categories?.length > 0) {
          // Log categories for debugging
          console.log('Filtering by categories:', filters.categories);
          
          const categoryFilter = filters.categories
            .map(cat => `categories:=${cat}`)
            .join(' || ');
          
          console.log('Category filter query:', categoryFilter);
          filterString += ` && (${categoryFilter})`;
        }

        // Add color filter directly through the colors field
        if (filters?.colors?.length > 0) {
          console.log('Filtering by colors:', filters.colors);
          
          const colorsFilter = filters.colors
            .map(color => `colors:=${color}`)
            .join(' || ');
          
          filterString += ` && (${colorsFilter})`;
        }

        // Add size filter directly through the sizes field
        if (filters?.sizes?.length > 0) {
          console.log('Filtering by sizes:', filters.sizes);
          
          const sizesFilter = filters.sizes
            .map(size => `sizes:=${size}`)
            .join(' || ');
          
          filterString += ` && (${sizesFilter})`;
        }

        // Set the final filter string
        searchParameters.filter_by = filterString;

        console.log('Search parameters:', searchParameters);
        
        // Execute search
        const searchResults = await typesenseClient
          .collections('products')
          .documents()
          .search(searchParameters) as TypesenseSearchResult;

        // Process products
        const processedProducts = searchResults.hits.map(hit => {
          const doc = hit.document;
          return {
            id: doc.id,
            name: doc.name,
            price: typeof doc.price === 'string' ? parseFloat(doc.price) : doc.price,
            sale_price: doc.sale_price ? (typeof doc.sale_price === 'string' ? parseFloat(doc.sale_price) : doc.sale_price) : undefined,
            regular_price: typeof doc.regular_price === 'string' ? parseFloat(doc.regular_price) : doc.regular_price,
            image_url: doc.image_url,
            slug: doc.slug,
            stock_status: doc.stock_status,
            categories: Array.isArray(doc.categories) ? doc.categories : [],
            colors: Array.isArray(doc.colors) ? doc.colors : [],
            sizes: Array.isArray(doc.sizes) ? doc.sizes : [],
            is_on_sale: !!doc.is_on_sale
          };
        });

        setProducts(processedProducts);
        setTotalProducts(searchResults.found);
        setFacets(searchResults.facet_counts);

        if (processedProducts.length === 0 && searchQuery) {
          setError(`No products found for "${searchQuery}"`);
        } else if (processedProducts.length === 0) {
          setError(`No products found with the selected filters`);
        } else {
          setError(null);
        }
      } catch (err) {
        console.error('Error fetching products:', err);
        setError('Failed to load products. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [currentPage, internalFilters, searchQuery, filters]);

  if (error) {
    return (
      <div className="w-full md:flex-1">
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full md:flex-1">
      {/* Loading state */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div 
              key={index} 
              className="bg-gray-100 animate-pulse rounded-lg h-96"
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && products.length === 0 && (
        <div className="text-center py-10">
          <h3 className="text-xl font-medium text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-500">
            Try adjusting your search or filter criteria
          </p>
        </div>
      )}

      {/* Product grid */}
      {!isLoading && products.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product, index) => (
              <TypesenseProductCard key={product.id} product={product} index={index} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8">
              <Pagination>
                <PaginationContent>
                  {/* Previous page button */}
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
                  
                  {/* Page numbers */}
                  {getPageNumbers().map((pageNumber, index) => (
                    <PaginationItem key={index}>
                      {pageNumber === '...' ? (
                        <span className="px-4 py-2 text-sm text-gray-500">...</span>
                      ) : (
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            handlePageChange(pageNumber as number);
                          }}
                          isActive={pageNumber === currentPage}
                        >
                          {pageNumber}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}
                  
                  {/* Next page button */}
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
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TypesenseProductGrid;
