import { NextRequest, NextResponse } from 'next/server';
import Typesense from 'typesense';

// Initialize Typesense client
const typesenseClient = new Typesense.Client({
  nodes: [{
    host: process.env.TYPESENSE_HOST || process.env.NEXT_PUBLIC_TYPESENSE_HOST || '',
    port: parseInt(process.env.TYPESENSE_PORT || process.env.NEXT_PUBLIC_TYPESENSE_PORT || '443'),
    protocol: process.env.TYPESENSE_PROTOCOL || process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL || 'https'
  }],
  apiKey: process.env.TYPESENSE_API_KEY || process.env.NEXT_PUBLIC_TYPESENSE_ADMIN_API_KEY || '',
  connectionTimeoutSeconds: 10
});

// Fetch a product from Typesense by slug
async function fetchProductFromTypesense(slug: string) {
  try {
    console.log(`Fetching product with slug "${slug}" from Typesense...`);
    
    // Search for the product by slug
    const searchResponse = await typesenseClient
      .collections('products')
      .documents()
      .search({
        q: '*',
        filter_by: `slug:=${slug}`,
        per_page: 1
      });
    
    if (searchResponse.found === 0 || searchResponse.hits.length === 0) {
      throw new Error(`Product with slug "${slug}" not found in Typesense`);
    }
    
    const product = searchResponse.hits[0].document;
    console.log(`Found product in Typesense: ${product.name} (ID: ${product.id})`);
    
    return product;
  } catch (error) {
    console.error(`Error fetching product from Typesense:`, error);
    throw error;
  }
}

// Handle GET requests to fetch a product
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug;
    
    if (!slug) {
      return NextResponse.json(
        { success: false, message: 'Product slug is required' },
        { status: 400 }
      );
    }
    
    console.log(`Fetching product with slug "${slug}" from Typesense...`);
    
    // Only fetch from Typesense
    let typesenseProduct = null;
    
    try {
      typesenseProduct = await fetchProductFromTypesense(slug);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error fetching from Typesense:`, errorMessage);
      
      return NextResponse.json(
        { 
          success: false, 
          message: 'Product not found in Typesense',
          error: errorMessage
        },
        { status: 404 }
      );
    }
    
    // Return the Typesense product data
    return NextResponse.json({
      success: true,
      product: typesenseProduct,
      sources: {
        wooCommerce: false,
        typesense: true
      }
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch product',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
