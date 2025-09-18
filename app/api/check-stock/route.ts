import { NextResponse } from 'next/server';
import Typesense from 'typesense';

// Create Typesense client using the same configuration as the app
const typesenseClient = new Typesense.Client({
  nodes: [{
    host: process.env.NEXT_PUBLIC_TYPESENSE_HOST || 'localhost',
    port: Number(process.env.NEXT_PUBLIC_TYPESENSE_PORT) || 443,
    protocol: process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL || 'https'
  }],
  apiKey: process.env.NEXT_PUBLIC_TYPESENSE_SEARCH_API_KEY || '',
  connectionTimeoutSeconds: 5
});

export async function GET() {
  try {
    // Search for the "zig zag" product
    const searchResults = await typesenseClient
      .collections('products')
      .documents()
      .search({
        q: 'zig zag',
        query_by: 'name',
        per_page: 5,
        include_fields: 'name,slug,variations,attributes'
      });

    if (!searchResults.hits || searchResults.hits.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const product = searchResults.hits[0].document;
    
    // Check if variations exist
    if (!product.variations || !Array.isArray(product.variations)) {
      return NextResponse.json({ error: 'No variations found for this product' }, { status: 404 });
    }
    
    // Find the specific variation with color "black" and size "3"
    const targetVariation = product.variations.find(variation => {
      if (!variation.attributes || !Array.isArray(variation.attributes)) return false;
      
      const hasBlackColor = variation.attributes.some(attr => 
        (attr.name.toLowerCase() === 'color' || attr.name.toLowerCase() === 'colour') && 
        attr.option.toLowerCase() === 'black'
      );
      
      const hasSize3 = variation.attributes.some(attr => 
        attr.name.toLowerCase() === 'size' && 
        attr.option === '3'
      );
      
      return hasBlackColor && hasSize3;
    });
    
    if (!targetVariation) {
      return NextResponse.json({ 
        error: 'Could not find variation with color "black" and size "3"',
        productName: product.name,
        variationsCount: product.variations.length,
        // Return data about available variations to debug
        variations: product.variations.map(v => ({
          attributes: v.attributes || []
        }))
      }, { status: 404 });
    }
    
    // Return the stock data for the found variation
    return NextResponse.json({
      productName: product.name,
      variationDetails: {
        id: targetVariation.id,
        stockQuantity: targetVariation.stock_quantity,
        stockStatus: targetVariation.stock_status,
        manageStock: targetVariation.manage_stock,
        price: targetVariation.price,
        attributes: targetVariation.attributes
      }
    });
    
  } catch (error: any) {
    console.error('Error checking stock:', error);
    return NextResponse.json({ 
      error: 'Failed to check stock',
      message: error.message || 'Unknown error'
    }, { status: 500 });
  }
}
