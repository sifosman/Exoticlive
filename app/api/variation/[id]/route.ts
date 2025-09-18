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

// Fetch a variation from Typesense
async function fetchVariationFromTypesense(variationId: string) {
  try {
    console.log(`Fetching variation ${variationId} from Typesense...`);
    
    // Search for products that contain this variation ID
    const searchResponse = await typesenseClient
      .collections('products')
      .documents()
      .search({
        q: '*',
        filter_by: `variations.id:=${variationId}`,
        per_page: 1
      });
    
    if (searchResponse.found === 0 || searchResponse.hits.length === 0) {
      throw new Error(`No products found containing variation ${variationId}`);
    }
    
    const product = searchResponse.hits[0].document;
    console.log(`Found product: ${product.name} (ID: ${product.id})`);
    
    // Find the specific variation
    let variation = null;
    
    // Try to find in variations array
    if (product.variations && Array.isArray(product.variations)) {
      variation = product.variations.find(v => v.id === variationId);
    }
    
    // If not found and variations_json exists, try parsing that
    if (!variation && product.variations_json) {
      try {
        const parsedVariations = JSON.parse(product.variations_json);
        if (Array.isArray(parsedVariations)) {
          variation = parsedVariations.find(v => v.id === variationId);
        }
      } catch (error) {
        console.error('Error parsing variations_json:', error);
      }
    }
    
    if (!variation) {
      throw new Error(`Variation ${variationId} not found in product ${product.id}`);
    }
    
    return { variation, product };
  } catch (error) {
    console.error(`Error fetching variation from Typesense:`, error);
    throw error;
  }
}

// Handle GET requests to fetch a variation
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const variationId = params.id;
    
    if (!variationId) {
      return NextResponse.json(
        { success: false, message: 'Variation ID is required' },
        { status: 400 }
      );
    }
    
    console.log(`Fetching variation ${variationId} from Typesense...`);
    
    try {
      const { variation, product } = await fetchVariationFromTypesense(variationId);
      
      return NextResponse.json({
        success: true,
        variation: {
          ...variation,
          parent_id: product.id
        },
        sources: {
          wooCommerce: false,
          typesense: true
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error fetching from Typesense:`, errorMessage);
      
      return NextResponse.json(
        { 
          success: false, 
          message: 'Variation not found in Typesense',
          error: errorMessage
        },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error fetching variation:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch variation',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
