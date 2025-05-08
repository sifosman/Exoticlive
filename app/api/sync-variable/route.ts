import { NextRequest, NextResponse } from 'next/server';
import { Client as TypesenseClient } from 'typesense';

// Initialize Typesense client
const typesenseClient = new TypesenseClient({
  nodes: [{
    host: process.env.TYPESENSE_HOST || process.env.NEXT_PUBLIC_TYPESENSE_HOST || '',
    port: parseInt(process.env.TYPESENSE_PORT || process.env.NEXT_PUBLIC_TYPESENSE_PORT || '443'),
    protocol: process.env.TYPESENSE_PROTOCOL || process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL || 'https'
  }],
  apiKey: process.env.TYPESENSE_API_KEY || process.env.NEXT_PUBLIC_TYPESENSE_ADMIN_API_KEY || '',
  connectionTimeoutSeconds: 10
});

// WooCommerce API credentials
const wcApiUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL || '';
const wcConsumerKey = process.env.WC_CONSUMER_KEY || '';
const wcConsumerSecret = process.env.WC_CONSUMER_SECRET || '';

// Create authentication header for WooCommerce API
const getWooCommerceAuthHeader = () => {
  const auth = Buffer.from(`${wcConsumerKey}:${wcConsumerSecret}`).toString('base64');
  return `Basic ${auth}`;
};

// Fetch a specific product from WooCommerce by ID
async function fetchProductFromWooCommerce(productId: string) {
  try {
    console.log(`Fetching product ${productId} from WooCommerce...`);

    if (!wcApiUrl || !wcConsumerKey || !wcConsumerSecret) {
      throw new Error('WooCommerce API credentials not configured');
    }

    const response = await fetch(`${wcApiUrl}/wp-json/wc/v3/products/${productId}`, {
      headers: {
        'Authorization': getWooCommerceAuthHeader()
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch product: ${response.statusText}`);
    }

    const product = await response.json();
    console.log(`Found product in WooCommerce: ${product.name} (Type: ${product.type})`);

    return product;
  } catch (error) {
    console.error(`Error fetching product from WooCommerce:`, error);
    throw error;
  }
}

// Fetch variations for a variable product
async function fetchVariationsForVariableProduct(productId: number) {
  try {
    console.log(`Fetching variations for variable product ${productId}...`);

    if (!wcApiUrl || !wcConsumerKey || !wcConsumerSecret) {
      throw new Error('WooCommerce API credentials not configured');
    }

    const response = await fetch(`${wcApiUrl}/wp-json/wc/v3/products/${productId}/variations?per_page=100`, {
      headers: {
        'Authorization': getWooCommerceAuthHeader()
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch variations: ${response.statusText}`);
    }

    const variations = await response.json();
    console.log(`Found ${variations.length} variations for product ${productId}`);

    return variations;
  } catch (error) {
    console.error(`Error fetching variations for product ${productId}:`, error);
    return [];
  }
}

// Create a simplified document for Typesense
function createTypesenseDocument(product: any, variations: any[]) {
  // Extract colors and sizes from attributes
  let colors: string[] = [];
  let sizes: string[] = [];
  
  if (product.attributes && Array.isArray(product.attributes)) {
    const colorAttr = product.attributes.find((attr: any) => attr.name === 'Color');
    const sizeAttr = product.attributes.find((attr: any) => attr.name === 'Size');
    
    if (colorAttr && colorAttr.options && Array.isArray(colorAttr.options)) {
      colors = colorAttr.options;
    }
    
    if (sizeAttr && sizeAttr.options && Array.isArray(sizeAttr.options)) {
      sizes = sizeAttr.options;
    }
  }
  
  // Process variations
  const processedVariations = variations.map(variation => {
    // Extract attribute values
    const attrs: Record<string, string> = {};
    if (variation.attributes && Array.isArray(variation.attributes)) {
      variation.attributes.forEach((attr: any) => {
        if (attr.name && attr.option) {
          attrs[attr.name] = attr.option;
        }
      });
    }
    
    return {
      id: variation.id.toString(),
      price: parseFloat(variation.price || '0'),
      regular_price: parseFloat(variation.regular_price || '0'),
      sale_price: variation.sale_price ? parseFloat(variation.sale_price) : null,
      stock_status: variation.stock_status || 'outofstock',
      stock_quantity: variation.stock_quantity || 0,
      attribute_values: attrs
    };
  });
  
  // Calculate if any variations are in stock
  const anyInStock = processedVariations.some(v => v.stock_status === 'instock');
  
  // Create the document
  return {
    id: product.id.toString(),
    name: product.name || '',
    description: product.description ? product.description.replace(/<[^>]*>?/gm, '') : '',
    short_description: product.short_description ? product.short_description.replace(/<[^>]*>?/gm, '') : '',
    price: parseFloat(product.price || '0'),
    regular_price: parseFloat(product.regular_price || '0'),
    sale_price: product.sale_price ? parseFloat(product.sale_price) : null,
    on_sale: product.on_sale || false,
    categories: product.categories ? product.categories.map((cat: any) => cat.name) : [],
    tags: product.tags ? product.tags.map((tag: any) => tag.name) : [],
    colors: colors,
    sizes: sizes,
    image_url: product.images && product.images.length > 0 ? product.images[0].src : '',
    gallery_images: product.images ? product.images.map((img: any) => img.src) : [],
    slug: product.slug || '',
    sku: product.sku || '',
    stock_status: anyInStock ? 'instock' : 'outofstock',
    stock_quantity: product.stock_quantity || 0,
    variations_count: processedVariations.length,
    in_stock_variations_count: processedVariations.filter(v => v.stock_status === 'instock').length,
    variations: processedVariations,
    variations_json: JSON.stringify(processedVariations),
    featured: product.featured || false,
    is_featured: product.featured || false,
    type: product.type || 'simple',
    status: product.status || 'publish',
    date_created: product.date_created || new Date().toISOString(),
    image_updated_at: new Date().toISOString()
  };
}

// Handle GET requests to sync a variable product
export async function GET(request: NextRequest) {
  try {
    const syncStartTime = Date.now();
    
    // Get the product ID from the query parameters
    const productId = request.nextUrl.searchParams.get('id');
    
    if (!productId) {
      return NextResponse.json(
        { success: false, message: 'Product ID is required' },
        { status: 400 }
      );
    }
    
    console.log(`=== VARIABLE PRODUCT SYNC STARTED for product ${productId} at ${new Date().toISOString()} ===`);

    // Fetch the product from WooCommerce
    const product = await fetchProductFromWooCommerce(productId);
    
    // Check if it's a variable product
    if (product.type !== 'variable') {
      return NextResponse.json(
        { success: false, message: `Product ${product.name} (ID: ${productId}) is not a variable product. Type: ${product.type}` },
        { status: 400 }
      );
    }
    
    // Fetch variations
    const variations = await fetchVariationsForVariableProduct(product.id);
    
    if (variations.length === 0) {
      console.warn(`No variations found for variable product ${productId}`);
    }
    
    // Create the Typesense document
    const document = createTypesenseDocument(product, variations);
    
    // Update or create in Typesense
    let result;
    try {
      // Check if the product exists
      await typesenseClient.collections('products').documents(productId).retrieve();
      
      // Update the product
      result = await typesenseClient.collections('products').documents(productId).update(document);
      console.log(`Updated variable product ${productId} in Typesense`);
    } catch (error) {
      // If not found, create it
      if (error.toString().includes('Not Found') || error.toString().includes('404')) {
        result = await typesenseClient.collections('products').documents().create(document);
        console.log(`Created variable product ${productId} in Typesense`);
      } else {
        throw error;
      }
    }
    
    const syncEndTime = Date.now();
    const syncDuration = syncEndTime - syncStartTime;
    
    console.log(`=== VARIABLE PRODUCT SYNC COMPLETED in ${syncDuration}ms ===`);
    
    return NextResponse.json({
      success: true,
      message: `Variable product ${product.name} (ID: ${productId}) synced to Typesense`,
      product: {
        id: product.id,
        name: product.name,
        type: product.type,
        variations_count: variations.length
      },
      timestamp: new Date().toISOString(),
      duration: syncDuration
    });
  } catch (error) {
    console.error('Error syncing variable product:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: 'Error syncing variable product',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
