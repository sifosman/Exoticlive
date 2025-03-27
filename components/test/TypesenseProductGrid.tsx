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
  image_alt: string;
  slug: string;
  stock_status: string;
  attributes: any[];
  categories: string[];
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
      image_alt?: string;
      slug: string;
      stock_status: string;
      attributes: any[];
      categories: string[];
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
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(10000);
  const [internalFilters, setFilters] = useState<Filters>({
    categories: [],
    priceRange: [0, 10000],
    stockStatus: [],
    sizes: [],
    colors: []
  });

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
          query_by: 'name,description,attributes',
          filter_by: 'stock_status:=instock',
          page: currentPage,
          per_page: ITEMS_PER_PAGE,
          sort_by: '_text_match:desc',
          include_fields: 'id,name,description,price,sale_price,regular_price,stock_status,image_url,image_alt,slug,attributes,categories',
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
            .map(cat => {
              // Ensure exact match with correct case
              console.log(`Adding category filter for: ${cat}`); 
              return `categories:=${cat}`;
            })
            .join(' || ');
          
          console.log('Category filter query:', categoryFilter);
          filterString += ` && (${categoryFilter})`;
        }

        // Add color filter through search query instead of filter
        if (filters?.colors?.length > 0) {
          // Log color filters for debugging
          console.log('Filtering by colors:', filters.colors);
          
          // Instead of using color:= filter, we'll incorporate color into the search query
          // This works by adding color values to the query string with OR operators
          const colorsQuery = filters.colors.join(' | ');
          
          // Modify the main query to include color search
          if (searchParameters.q !== '*') {
            // If there's already a custom search query, append the color query with OR operator
            searchParameters.q = `${searchParameters.q} | ${colorsQuery}`;
          } else {
            // If no custom search query, use just the color query
            searchParameters.q = colorsQuery;
          }
          
          console.log('Updated search query with colors:', searchParameters.q);
        }

        // Handle size filters through search query instead of filter
        if (filters?.sizes?.length > 0) {
          // Log size filters for debugging
          console.log('Filtering by sizes:', filters.sizes);
          
          // Instead of using _text_match as a filter, we'll incorporate size into the search query
          // This works by adding size values to the query string with OR operators
          const sizesQuery = filters.sizes.join(' | ');
          
          // Modify the main query to include size search
          if (searchQuery) {
            // If there's already a search query, append the size query with OR operator
            searchParameters.q = `${searchQuery} | ${sizesQuery}`;
          } else {
            // If no search query, use just the size query
            searchParameters.q = sizesQuery;
          }
          
          console.log('Updated search query with sizes:', searchParameters.q);
        }

        searchParameters.filter_by = filterString;

        // Log search parameters for debugging
        console.log('Search parameters:', searchParameters);

        // Use Typesense client to search
        const results = await typesenseClient
          .collections('products')
          .documents()
          .search(searchParameters) as TypesenseSearchResult;

        // Map the results to our Product type
        const formattedProducts = results.hits.map(hit => {
          // Parse prices, ensuring they are valid numbers
          const parsePrice = (price: string | number | undefined | null): number => {
            if (typeof price === 'string') {
              const cleanPrice = price.replace(/[^0-9.]/g, '');
              return cleanPrice ? parseFloat(cleanPrice) : 0;
            }
            return typeof price === 'number' ? price : 0;
          };

          const price = parsePrice(hit.document.price);
          const sale_price = parsePrice(hit.document.sale_price);
          const regular_price = parsePrice(hit.document.regular_price);

          return {
            id: hit.document.id,
            name: hit.document.name,
            price: price || regular_price, // Use regular_price as fallback
            sale_price: sale_price || null,
            regular_price: regular_price || price, // Use price as fallback
            image_url: hit.document.image_url,
            image_alt: hit.document.image_alt || '',
            slug: hit.document.slug,
            stock_status: hit.document.stock_status,
            attributes: hit.document.attributes || [],
            categories: hit.document.categories || []
          };
        });

        setProducts(formattedProducts);
        setTotalProducts(results.found);
        setError(null);
      } catch (err) {
        console.error('Search error:', err);
        setError('Failed to load products. Please try again.');
        setProducts([]);
        setTotalProducts(0);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProducts();
  }, [currentPage, filters, searchQuery]);

  useEffect(() => {
    const verifyIndexHealth = async () => {
      try {
        const healthCheck = await typesenseClient.health.retrieve();
        console.log('Typesense Health:', healthCheck);
        
        const collectionInfo = await typesenseClient.collections('products').retrieve();
        console.log('Products Collection Info:', collectionInfo);
      } catch (error) {
        console.error('Health Check Failed:', error);
      }
    };
    verifyIndexHealth();
  }, []);

  return (
    <div className="flex gap-8 bg-white font-lato">
      {/* Products Grid */}
      <div className="flex-grow">
        {error ? (
          <div className="text-center py-8">
            <p className="text-red-500 font-lato">{error}</p>
          </div>
        ) : isLoading ? (
          <div className="text-center py-8">
            <p className="font-lato">Loading products...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              {products.map((product, index) => (
                <TypesenseProductCard
                  key={product.id}
                  price={(product.price / 100).toFixed(2)}
                  regularPrice={(product.regular_price / 100).toFixed(2)}
                  product={product}
                  index={index}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalProducts > 0 && (
              <div className="mt-8">
                <div className="flex justify-between items-center mb-4">
                  <div className="text-sm text-gray-600 font-lato">
                    Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, totalProducts)} of {totalProducts} products
                  </div>
                </div>
                <Pagination>
                  <PaginationContent className="flex flex-wrap gap-2 justify-center">
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="cursor-pointer hover:bg-gray-100 font-lato"
                      />
                    </PaginationItem>
                    
                    {getPageNumbers().map((page, index) => (
                      <PaginationItem key={index}>
                        {page === '...' ? (
                          <span className="px-4 py-2 font-lato">...</span>
                        ) : (
                          <PaginationLink
                            isActive={page === currentPage}
                            onClick={() => handlePageChange(Number(page))}
                            className="min-w-[2rem] justify-center cursor-pointer hover:bg-gray-100 font-lato"
                          >
                            {page}
                          </PaginationLink>
                        )}
                      </PaginationItem>
                    ))}

                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="cursor-pointer hover:bg-gray-100 font-lato"
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TypesenseProductGrid;
