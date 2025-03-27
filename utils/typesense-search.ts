import Typesense from 'typesense';

// Define product type
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  sale_price: number | null;
  regular_price: number;
  stock_status: string;
  stock_quantity: number;
  categories: string[];
  tags: string[];
  colors: string[];
  sizes: string[];
  image_url: string;
  slug: string;
  gallery_images: string[];
  is_featured: boolean;
  is_on_sale: boolean;
  average_rating: number;
}

// Create Typesense client
const typesenseClient = new Typesense.Client({
  nodes: [{
    host: process.env.NEXT_PUBLIC_TYPESENSE_HOST || 'localhost',
    port: Number(process.env.NEXT_PUBLIC_TYPESENSE_PORT) || 443,
    protocol: 'https'
  }],
  apiKey: process.env.NEXT_PUBLIC_TYPESENSE_SEARCH_API_KEY || '',
  connectionTimeoutSeconds: 2
});

// Function to check if Typesense is healthy
export async function checkTypesenseHealth() {
  try {
    const health = await typesenseClient.health.retrieve();
    console.log('Typesense Health:', health);
    return health;
  } catch (error) {
    console.error('Health Check Failed:', error);
    return { ok: false };
  }
}

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
  include_fields?: string;
}

// Search function
export async function searchProducts(params: SearchParams) {
  const searchParameters = {
    q: params.q || '*',
    query_by: params.query_by || 'name,description',
    filter_by: params.filter_by || '',
    sort_by: params.sort_by || '_text_match:desc,price:asc',
    page: params.page || 1,
    per_page: params.per_page || 12,
    facet_by: params.facet_by || 'categories,colors,sizes',
    max_facet_values: params.max_facet_values || 10,
    include_fields: params.include_fields || 'id,name,description,price,sale_price,regular_price,stock_status,image_url,slug,categories,colors,sizes'
  };
  
  console.log('Search parameters:', searchParameters);

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
    console.error('Search error:', error);
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
    console.error(`Error fetching product ${id}:`, error);
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
