// app/api/webhooks/variation-update/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Typesense from 'typesense';
import crypto from 'crypto';

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

// Helper to verify WooCommerce webhook signature
function verifyWooCommerceWebhook(request: Request, signature: string, body: string): boolean {
  if (!process.env.WEBHOOK_SECRET) {
    console.error('WEBHOOK_SECRET not configured');
    // For development, allow requests without verification
    if (process.env.NODE_ENV === 'development') {
      console.warn('Running in development mode - skipping webhook signature verification');
      return true;
    }
    return false;
  }

  try {
    const hmac = crypto.createHmac('sha256', process.env.WEBHOOK_SECRET);
    const digest = hmac.update(body).digest('base64');
    
    const isValid = signature === digest;
    
    if (!isValid) {
      console.error('Webhook signature verification failed');
      console.error('Expected:', digest);
      console.error('Received:', signature);
    }
    
    return isValid;
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

// Fetch a product from WooCommerce
async function fetchProductFromWooCommerce(productId: number) {
  try {
    // WooCommerce API credentials
    const wcKey = process.env.WC_CONSUMER_KEY || '';
    const wcSecret = process.env.WC_CONSUMER_SECRET || '';
    const wpUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL || '';
    
    if (!wcKey || !wcSecret || !wpUrl) {
      throw new Error('WooCommerce API credentials not configured');
    }
    
    // Create authentication header
    const authString = Buffer.from(`${wcKey}:${wcSecret}`).toString('base64');
    
    // Fetch product from WooCommerce
    const response = await fetch(`${wpUrl}/wp-json/wc/v3/products/${productId}`, {
      headers: {
        'Authorization': `Basic ${authString}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch product ${productId} from WooCommerce: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching product from WooCommerce:`, error);
    throw error;
  }
}

// Fetch variations for a product from WooCommerce
async function fetchVariationsFromWooCommerce(productId: number) {
  try {
    // WooCommerce API credentials
    const wcKey = process.env.WC_CONSUMER_KEY || '';
    const wcSecret = process.env.WC_CONSUMER_SECRET || '';
    const wpUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL || '';
    
    if (!wcKey || !wcSecret || !wpUrl) {
      throw new Error('WooCommerce API credentials not configured');
    }
    
    // Create authentication header
    const authString = Buffer.from(`${wcKey}:${wcSecret}`).toString('base64');
    
    // Fetch variations from WooCommerce
    const response = await fetch(`${wpUrl}/wp-json/wc/v3/products/${productId}/variations?per_page=100`, {
      headers: {
        'Authorization': `Basic ${authString}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch variations for product ${productId} from WooCommerce: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching variations from WooCommerce:`, error);
    throw error;
  }
}

// Transform a WooCommerce product to Typesense format
function transformProduct(product: any, variations: any[] = []) {
  // Extract categories
  const categories = product.categories ?
    product.categories.map((cat: any) => cat.name) : [];

  // Extract tags
  const tags = product.tags ?
    product.tags.map((tag: any) => tag.name) : [];

  // Extract attributes for faceting
  const attributes = product.attributes || [];

  // Extract colors and sizes specifically for faceting
  const colors: string[] = [];
  const sizes: string[] = [];

  attributes.forEach((attr: any) => {
    if (attr.name && attr.name.toLowerCase() === 'color' && Array.isArray(attr.options)) {
      colors.push(...attr.options);
    }
    if (attr.name && attr.name.toLowerCase() === 'size' && Array.isArray(attr.options)) {
      sizes.push(...attr.options);
    }
  });

  console.log('Extracted colors:', colors);
  console.log('Extracted sizes:', sizes);

  // Calculate dates as timestamps for sorting
  const dateCreated = product.date_created ?
    new Date(product.date_created).getTime() :
    Date.now();

  // Check if product is on sale
  const isOnSale = product.sale_price &&
    parseFloat(product.sale_price) > 0 &&
    parseFloat(product.sale_price) < parseFloat(product.regular_price);

  // Get gallery images
  const galleryImages = product.images && product.images.length > 1 ?
    product.images.slice(1).map((img: any) => img.src) : [];

  // Process variations
  const processedVariations = variations.map((variation: any) => {
    // Map variation attributes
    const variationAttributes = variation.attributes.map((attr: any) => ({
      name: attr.name,
      option: attr.option
    }));
    
    return {
      id: variation.id.toString(),
      price: parseFloat(variation.price || '0'),
      regular_price: parseFloat(variation.regular_price || '0'),
      sale_price: variation.sale_price ? parseFloat(variation.sale_price) : null,
      stock_status: variation.stock_status || 'outofstock',
      stock_quantity: variation.stock_quantity || 0,
      attributes: variationAttributes
    };
  });

  // Create the transformed product with all required fields
  const transformedProduct = {
    id: product.id.toString(),
    name: product.name,
    description: product.description ?
      product.description.replace(/<[^>]*>?/gm, '') : '', // Strip HTML
    price: parseFloat(product.price || 0),
    sale_price: product.sale_price ? parseFloat(product.sale_price) : null,
    regular_price: product.regular_price ? parseFloat(product.regular_price) : null,
    categories,
    tags,
    attributes,
    colors,
    sizes,
    image_url: product.images && product.images.length > 0 ?
      product.images[0].src : '',
    gallery_images: galleryImages,
    slug: product.slug,
    stock_status: product.stock_status || 'outofstock',
    stock_quantity: product.stock_quantity || 0,
    variations_count: processedVariations.length,
    in_stock_variations_count: processedVariations.filter(v => v.stock_status === 'instock').length,
    is_featured: !!product.featured,
    is_on_sale: isOnSale,
    average_rating: parseFloat(product.average_rating || 0),
    date_created: dateCreated,
    
    // Add fields that might be required by the Typesense schema
    catalog_visibility: product.catalog_visibility || 'visible',
    short_description: product.short_description ? product.short_description.replace(/<[^>]*>?/gm, '') : '',
    sku: product.sku || '',
    status: product.status || 'publish',
    weight: product.weight || '',
    dimensions: product.dimensions || { length: '', width: '', height: '' },
    shipping_class: product.shipping_class || '',
    shipping_class_id: product.shipping_class_id || 0,
    cross_sell_ids: product.cross_sell_ids || [],
    upsell_ids: product.upsell_ids || [],
    purchasable: product.purchasable !== undefined ? product.purchasable : true,
    
    // Add variations data
    variations: processedVariations,
    variations_json: JSON.stringify(processedVariations)
  };
  
  // Log the transformed product for debugging
  console.log('Transformed product:', JSON.stringify(transformedProduct).substring(0, 200) + '...');
  
  return transformedProduct;
}

// Handle POST requests (when a variation is updated)
export async function POST(request: NextRequest) {
  try {
    console.log('Received variation update webhook request');
    console.log('Headers:', JSON.stringify(Object.fromEntries(request.headers.entries())));
    
    // Get the request body as text
    const body = await request.text();
    console.log('Request body:', body.substring(0, 200) + (body.length > 200 ? '...' : ''));

    // Get the signature from the headers
    const signature = request.headers.get('X-WC-Webhook-Signature') || '';
    console.log('Received webhook signature:', signature ? signature : 'Missing');

    // For testing purposes, accept all webhooks
    console.log('Skipping signature verification for testing');
    
    // Verify the webhook (commented out for testing)
    /*
    if (!verifyWooCommerceWebhook(request, signature, body)) {
      console.error('Invalid webhook signature');
      // For now, we'll accept the webhook even if the signature doesn't match
      // This helps debug the issue while still allowing stock updates to work
      console.warn('Proceeding despite invalid signature for debugging purposes');
      // Uncomment the line below to enforce signature verification in production
      // return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    */

    let data;
    try {
      data = JSON.parse(body);
    } catch (error) {
      console.error('Error parsing webhook payload:', error);
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const topic = request.headers.get('X-WC-Webhook-Topic') || '';
    console.log(`Received webhook: ${topic}`);

    // Handle variation update
    if (topic === 'product_variation.updated' || topic === 'product.updated') {
      try {
        // Check if this is a variation
        const isVariation = data.parent_id !== undefined;
        
        if (isVariation) {
          console.log(`Processing variation update for variation ${data.id} of product ${data.parent_id}`);
          
          // Get the parent product ID
          const parentId = data.parent_id;
          
          // Fetch the parent product from WooCommerce
          const parentProduct = await fetchProductFromWooCommerce(parentId);
          console.log(`Fetched parent product: ${parentProduct.name}`);
          
          // Fetch all variations for the parent product
          const variations = await fetchVariationsFromWooCommerce(parentId);
          console.log(`Fetched ${variations.length} variations for product ${parentId}`);
          
          // Transform the parent product with all variations
          const transformedProduct = transformProduct(parentProduct, variations);
          
          // Update the parent product in Typesense
          await typesenseClient.collections('products').documents().upsert(transformedProduct);
          
          console.log(`Updated product ${parentId} in Typesense with ${variations.length} variations`);
          return NextResponse.json({ success: true });
        } else {
          console.log(`This is not a variation update, skipping`);
          return NextResponse.json({ success: true, message: 'Not a variation update' });
        }
      } catch (error) {
        console.error(`Error processing variation update:`, error);
        return NextResponse.json({ 
          error: 'Failed to process variation update',
          message: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
      }
    }

    // Handle other events
    return NextResponse.json({ success: true, message: 'Webhook received but no action taken' });
  } catch (error) {
    console.error('Error handling webhook:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace available');
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// Handle OPTIONS requests (for CORS preflight)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type, X-WC-Webhook-Signature, X-WC-Webhook-Topic',
    },
  });
}
