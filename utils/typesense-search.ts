import Typesense from 'typesense';

// Define product type
export interface Product {
  id: string;
  name: string;
  description: string;
  short_description: string;
  price: number;
  sale_price: number | null;
  regular_price: number;
  stock_status: string;
  stock_quantity: number;
  categories: string[];
  brand: string;
  image_url: string;
  image_alt: string;
  slug: string;
  gallery_images: Array<{
    url: string;
    alt: string;
  }>;
  attributes: Array<{
    name: string;
    options: string[];
  }>;
  variations?: Array<{
    id: string;
    price: number;
    sale_price: number | null;
    stock_status: string;
    stock_quantity: number;
    attributes: Array<{
      name: string;
      value: string;
    }>;
  }>;
}

// Create Typesense client
const typesenseClient = new Typesense.Client({
  nodes: [{
    host: process.env.NEXT_PUBLIC_TYPESENSE_HOST || 'localhost',
    port: Number(process.env.NEXT_PUBLIC_TYPESENSE_PORT) || 8108,
    protocol: 'http'
  }],
  apiKey: process.env.NEXT_PUBLIC_TYPESENSE_SEARCH_API_KEY || 'xyz123',
  connectionTimeoutSeconds: 2
});

// Search parameters type
export interface SearchParams {
  q?: string;
  query_by?: string;
  filter_by?: string;
  sort_by?: string;
  page?: number;
  per_page?: number;
  facet_by?: string;
  max_facet_values?: number;
}

// Search function
export async function searchProducts(params: SearchParams) {
  const searchParameters = {
    q: params.q || '*',
    query_by: params.query_by || 'name,description,brand',
    filter_by: params.filter_by || '',
    sort_by: params.sort_by || '_text_match:desc,price:asc',
    page: params.page || 1,
    per_page: params.per_page || 12,
    facet_by: params.facet_by || 'categories,brand',
    max_facet_values: params.max_facet_values || 10
  };

  try {
    const searchResults = await typesenseClient
      .collections('products')
      .documents()
      .search(searchParameters);

    return {
      products: searchResults.hits?.map(hit => hit.document as Product) || [],
      found: searchResults.found || 0,
      page: searchResults.page || 1,
      facets: searchResults.facet_counts || [],
    };
  } catch (error) {
    console.error('Typesense search error:', error);
    throw error;
  }
}

// Get product by ID
export async function getProductById(id: string): Promise<Product | null> {
  try {
    const product = await typesenseClient
      .collections('products')
      .documents(id)
      .retrieve();
    return product as Product;
  } catch (error) {
    console.error('Error fetching product:', error);
    return null;
  }
}

// Get multiple products
export async function getProducts(params: { 
  page?: number; 
  per_page?: number;
  sort_by?: string;
  filter_by?: string;
}) {
  return searchProducts({
    q: '*',
    page: params.page,
    per_page: params.per_page,
    sort_by: params.sort_by,
    filter_by: params.filter_by
  });
}

// Get related products
export async function getRelatedProducts(
  productId: string,
  category: string,
  limit: number = 4
): Promise<Product[]> {
  try {
    const searchResults = await typesenseClient
      .collections('products')
      .documents()
      .search({
        q: '*',
        query_by: 'categories',
        filter_by: `categories:=[${category}] && id:!=${productId}`,
        per_page: limit,
        sort_by: '_random'
      });

    return searchResults.hits?.map(hit => hit.document as Product) || [];
  } catch (error) {
    console.error('Error fetching related products:', error);
    return [];
  }
}
