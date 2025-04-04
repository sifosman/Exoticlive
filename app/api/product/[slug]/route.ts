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

// Create authentication header for WooCommerce API
const getWooCommerceAuthHeader = () => {
  const wcKey = process.env.WC_CONSUMER_KEY || '';
  const wcSecret = process.env.WC_CONSUMER_SECRET || '';
  const auth = Buffer.from(`${wcKey}:${wcSecret}`).toString('base64');
  return `Basic ${auth}`;
};

// Fetch a product from WooCommerce by slug
async function fetchProductFromWooCommerce(slug: string) {
  try {
    console.log(`Fetching product with slug "${slug}" from WooCommerce...`);
    
    const wcApiUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://wp.exoticshoes.co.za';
    
    // First, search for the product by slug
    const response = await fetch(`${wcApiUrl}/wp-json/wc/v3/products?slug=${slug}`, {
      headers: {
        'Authorization': getWooCommerceAuthHeader()
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch product: ${response.statusText}`);
    }
    
    const products = await response.json();
    
    if (products.length === 0) {
      throw new Error(`Product with slug "${slug}" not found`);
    }
    
    const product = products[0];
    console.log(`Found product: ${product.name} (ID: ${product.id})`);
    
    // If it's a variable product, fetch variations
    if (product.type === 'variable') {
      const variationsResponse = await fetch(`${wcApiUrl}/wp-json/wc/v3/products/${product.id}/variations?per_page=100`, {
        headers: {
          'Authorization': getWooCommerceAuthHeader()
        }
      });
      
      if (!variationsResponse.ok) {
        throw new Error(`Failed to fetch variations: ${variationsResponse.statusText}`);
      }
      
      const variations = await variationsResponse.json();
      console.log(`Fetched ${variations.length} variations for product ${product.id}`);
      
      // Add variations to the product
      product.variations_data = variations;
    }
    
    return product;
  } catch (error) {
    console.error(`Error fetching product from WooCommerce:`, error);
    throw error;
  }
}

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
    
    console.log(`Fetching product with slug "${slug}"...`);
    
    // Try to fetch from both WooCommerce and Typesense
    let wooCommerceProduct = null;
    let typesenseProduct = null;
    let wooCommerceError = null;
    let typesenseError = null;
    
    try {
      wooCommerceProduct = await fetchProductFromWooCommerce(slug);
    } catch (error) {
      wooCommerceError = error instanceof Error ? error.message : String(error);
      console.error(`Error fetching from WooCommerce:`, wooCommerceError);
    }
    
    try {
      typesenseProduct = await fetchProductFromTypesense(slug);
    } catch (error) {
      typesenseError = error instanceof Error ? error.message : String(error);
      console.error(`Error fetching from Typesense:`, typesenseError);
    }
    
    // If we couldn't fetch from either source, return an error
    if (!wooCommerceProduct && !typesenseProduct) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Product not found in either WooCommerce or Typesense',
          wooCommerceError,
          typesenseError
        },
        { status: 404 }
      );
    }
    
    // Merge the data, preferring WooCommerce for stock information
    let mergedProduct = typesenseProduct || {};
    
    if (wooCommerceProduct) {
      // If we have WooCommerce data, use it for stock information
      mergedProduct = {
        ...mergedProduct,
        stock_status: wooCommerceProduct.stock_status,
        stock_quantity: wooCommerceProduct.stock_quantity
      };
      
      // If we have variation data from WooCommerce, use it
      if (wooCommerceProduct.variations_data) {
        // Process variations
        const processedVariations = wooCommerceProduct.variations_data.map((variation: any) => {
          return {
            id: variation.id.toString(),
            price: parseFloat(variation.price || '0'),
            regular_price: parseFloat(variation.regular_price || '0'),
            sale_price: variation.sale_price ? parseFloat(variation.sale_price) : null,
            stock_status: variation.stock_status || 'outofstock',
            stock_quantity: variation.stock_quantity || 0,
            attributes: variation.attributes.map((attr: any) => ({
              name: attr.name,
              option: attr.option
            }))
          };
        });
        
        // Update the product with the latest variation data
        mergedProduct.variations = processedVariations;
        mergedProduct.variations_json = JSON.stringify(processedVariations);
        mergedProduct.variations_count = processedVariations.length;
        mergedProduct.in_stock_variations_count = processedVariations.filter((v: any) => v.stock_status === 'instock').length;
        
        // Also update Typesense with the latest data
        if (typesenseProduct) {
          try {
            await typesenseClient
              .collections('products')
              .documents(typesenseProduct.id.toString())
              .update({
                variations: processedVariations,
                variations_json: JSON.stringify(processedVariations),
                variations_count: processedVariations.length,
                in_stock_variations_count: processedVariations.filter((v: any) => v.stock_status === 'instock').length
              });
            
            console.log(`Updated product ${typesenseProduct.id} in Typesense with latest variation data`);
          } catch (error) {
            console.error(`Error updating product in Typesense:`, error);
          }
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      product: mergedProduct,
      sources: {
        wooCommerce: !!wooCommerceProduct,
        typesense: !!typesenseProduct
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
