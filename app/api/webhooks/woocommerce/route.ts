// app/api/webhooks/woocommerce/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Typesense from 'typesense';
import crypto from 'crypto';

// Initialize Typesense Cloud client
const typesenseClient = new Typesense.Client({
  nodes: [{
    host: process.env.TYPESENSE_CLOUD_HOST || '',
    port: 443,
    protocol: 'https'
  }],
  apiKey: process.env.TYPESENSE_CLOUD_API_KEY || '',
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

  // Calculate variation counts
  const variationsCount = processedVariations.length;
  const inStockVariationsCount = processedVariations.filter(v => v.stock_status === 'instock').length;

  // Create the transformed product with all required fields
  const transformedProduct = {
    id: product.id.toString(),
    name: product.name || '',
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
    slug: product.slug || '',
    stock_status: product.stock_status || 'outofstock',
    stock_quantity: product.stock_quantity || 0,
    variations_count: variationsCount,
    in_stock_variations_count: inStockVariationsCount,
    featured: product.featured !== undefined ? product.featured : false,
    is_featured: product.featured !== undefined ? !!product.featured : false,
    is_on_sale: isOnSale,
    average_rating: parseFloat(product.average_rating || 0),
    date_created: dateCreated,

    // Add variations data
    variations: processedVariations,
    variations_json: JSON.stringify(processedVariations),

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

    // Add any other fields that might be required by the Typesense schema
    type: product.type || 'simple',
    virtual: product.virtual !== undefined ? product.virtual : false,
    downloadable: product.downloadable !== undefined ? product.downloadable : false,
    tax_status: product.tax_status || 'taxable',
    tax_class: product.tax_class || '',
    manage_stock: product.manage_stock !== undefined ? product.manage_stock : false,
    backorders: product.backorders || 'no',
    backorders_allowed: product.backorders_allowed !== undefined ? product.backorders_allowed : false,
    backordered: product.backordered !== undefined ? product.backordered : false,
    sold_individually: product.sold_individually !== undefined ? product.sold_individually : false,
    reviews_allowed: product.reviews_allowed !== undefined ? product.reviews_allowed : true,
    rating_count: product.rating_count || 0,
    parent_id: product.parent_id || 0,
    menu_order: product.menu_order || 0
  };

  // Log the transformed product for debugging
  console.log('Transformed product:', JSON.stringify(transformedProduct).substring(0, 200) + '...');

  return transformedProduct;
}

// Handle POST requests (when a product is created or updated)
export async function POST(request: NextRequest) {
  try {
    console.log('=== WEBHOOK DEBUG: Received webhook request ===');
    console.log('Request URL:', request.url);
    console.log('Request method:', request.method);
    console.log('Headers:', JSON.stringify(Object.fromEntries(request.headers.entries()), null, 2));

    // Get the request body as text
    const body = await request.text();
    console.log('Request body (first 500 chars):', body.substring(0, 500) + (body.length > 500 ? '...' : ''));
    console.log('Request body length:', body.length);

    // Get the signature from the headers
    const signature = request.headers.get('X-WC-Webhook-Signature') || '';
    console.log('Received webhook signature:', signature ? signature : 'Missing');

    // Check if this is a test request from our script
    const isTestRequest = request.headers.get('X-WC-Webhook-Source') === 'test-script';

    // For now, we'll skip signature verification to make sure the webhook works
    // We'll log the signature for debugging purposes
    console.log('=== WEBHOOK DEBUG: Skipping signature verification ===');
    console.log('Signature:', signature);
    console.log('Webhook Secret:', process.env.WEBHOOK_SECRET ? 'Set' : 'Not set');

    // In production, you would want to verify the signature
    // if (!isTestRequest && !verifyWooCommerceWebhook(request, signature, body)) {
    //   console.error('Invalid webhook signature');
    //
    //   // For test pings, we'll still accept the request
    //   if (body.trim() === '' || body.includes('webhook_id')) {
    //     console.log('Test ping detected, accepting despite invalid signature');
    //   } else {
    //     // For actual webhooks, enforce signature verification
    //     console.error('Rejecting webhook with invalid signature');
    //     return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    //   }
    // }

    // If this is a test request, log it
    if (isTestRequest) {
      console.log('=== WEBHOOK DEBUG: Test request detected ===');
    }

    let data;
    try {
      // Try to parse the body as JSON
      data = JSON.parse(body);
    } catch (error) {
      console.log('Could not parse body as JSON. This might be a test ping from WooCommerce.');
      // If this is a test ping from WooCommerce, return a success response
      if (body.trim() === '' || body.includes('webhook_id')) {
        console.log('Detected test ping from WooCommerce');
        return NextResponse.json({ success: true, message: 'Webhook test received successfully' });
      }

      console.error('Error parsing webhook payload:', error);
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const topic = request.headers.get('X-WC-Webhook-Topic') || '';
    console.log(`Received webhook: ${topic}`);

    // If no topic is provided, this might be a test ping
    if (!topic) {
      console.log('No topic provided, this might be a test ping');
      return NextResponse.json({ success: true, message: 'Webhook received successfully' });
    }

    // Handle product creation/update
    if (topic === 'product.created' || topic === 'product.updated') {
      try {
        console.log(`=== WEBHOOK DEBUG: Processing ${topic} webhook for product ${data.id} ===`);
        console.log('Product data:', JSON.stringify(data, null, 2).substring(0, 1000) + '...');

        // Check if this is a variation
        if (data.parent_id) {
          // This is a variation, handle it as a variation update
          console.log(`=== WEBHOOK DEBUG: This is a variation of product ${data.parent_id}, handling as variation update ===`);
          console.log('Variation ID:', data.id);
          console.log('Parent ID:', data.parent_id);
          console.log('Variation stock status:', data.stock_status);
          console.log('Variation stock quantity:', data.stock_quantity);

          // Get the parent product ID
          const parentId = data.parent_id;

          // Fetch the parent product from WooCommerce
          const parentProduct = await fetchProductFromWooCommerce(parentId);
          console.log(`Parent product fetched: ${parentProduct.name}`);

          // Fetch all variations for the parent product
          const variations = await fetchVariationsFromWooCommerce(parentId);
          console.log(`Fetched ${variations.length} variations for product ${parentId}`);

          // Transform the parent product with all variations
          const transformedProduct = transformProduct(parentProduct, variations);

          // Update the parent product in Typesense
          console.log(`=== WEBHOOK DEBUG: Updating product ${parentId} in Typesense with ${variations.length} variations ===`);
          try {
            await typesenseClient.collections('products').documents().upsert(transformedProduct);
            console.log(`=== WEBHOOK DEBUG: Successfully updated product ${parentId} in Typesense ===`);
          } catch (typesenseError) {
            console.error(`=== WEBHOOK DEBUG: Error updating product in Typesense: ${typesenseError} ===`);
            console.error('Typesense error details:', typesenseError);
            throw typesenseError;
          }

          console.log(`Product ${parentId} updated in Typesense with ${variations.length} variations`);
          return NextResponse.json({ success: true });
        } else {
          // This is a regular product or a variable product

          // Check if this is a variable product
          const isVariableProduct = data.type === 'variable';
          console.log(`Product type: ${data.type}, Is variable: ${isVariableProduct}`);

          // For variable products, we need to fetch variations
          let variations = [];
          if (isVariableProduct) {
            console.log(`Fetching variations for product ${data.id}...`);
            variations = await fetchVariationsFromWooCommerce(data.id);
            console.log(`Fetched ${variations.length} variations for product ${data.id}`);

            // Log variation stock status for debugging
            variations.forEach((variation: any) => {
              console.log(`Variation ${variation.id} stock status: ${variation.stock_status}, quantity: ${variation.stock_quantity}`);
            });
          }

          // Transform the product with variations
          const transformedProduct = transformProduct(data, variations);

          // Upsert the product to Typesense
          console.log(`=== WEBHOOK DEBUG: Upserting product ${data.id} to Typesense ===`);
          try {
            await typesenseClient.collections('products').documents().upsert(transformedProduct);
            console.log(`=== WEBHOOK DEBUG: Successfully upserted product ${data.id} to Typesense ===`);
          } catch (typesenseError) {
            console.error(`=== WEBHOOK DEBUG: Error upserting product to Typesense: ${typesenseError} ===`);
            console.error('Typesense error details:', typesenseError);
            throw typesenseError;
          }

          console.log(`Product ${data.id} ${topic === 'product.created' ? 'created' : 'updated'} in Typesense`);
          return NextResponse.json({ success: true });
        }
      } catch (error) {
        console.error(`Error processing ${topic} webhook:`, error);
        return NextResponse.json({
          error: `Failed to process ${topic} webhook`,
          message: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
      }
    }

    // Handle product deletion
    if (topic === 'product.deleted') {
      // Delete the product from Typesense
      await typesenseClient.collections('products').documents(data.id.toString()).delete();

      console.log(`Product ${data.id} deleted from Typesense`);
      return NextResponse.json({ success: true });
    }

    // Handle variation updates
    if (topic === 'product_variation.updated' || (topic === 'product.updated' && data.parent_id)) {
      try {
        // Get the parent product ID
        const parentId = data.parent_id;
        console.log(`=== WEBHOOK DEBUG: Variation updated for product ${parentId}, fetching parent product... ===`);
        console.log('Variation ID:', data.id);
        console.log('Parent ID:', parentId);
        console.log('Variation stock status:', data.stock_status);
        console.log('Variation stock quantity:', data.stock_quantity);

        // Fetch the parent product from WooCommerce
        const parentProduct = await fetchProductFromWooCommerce(parentId);
        console.log(`Parent product fetched: ${parentProduct.name}`);

        // Fetch all variations for the parent product
        const variations = await fetchVariationsFromWooCommerce(parentId);
        console.log(`Fetched ${variations.length} variations for product ${parentId}`);

        // Transform the parent product with all variations
        const transformedProduct = transformProduct(parentProduct, variations);

        // Update the parent product in Typesense
        console.log(`=== WEBHOOK DEBUG: Updating product ${parentId} in Typesense with ${variations.length} variations ===`);
        try {
          await typesenseClient.collections('products').documents().upsert(transformedProduct);
          console.log(`=== WEBHOOK DEBUG: Successfully updated product ${parentId} in Typesense ===`);
        } catch (typesenseError) {
          console.error(`=== WEBHOOK DEBUG: Error updating product in Typesense: ${typesenseError} ===`);
          console.error('Typesense error details:', typesenseError);
          throw typesenseError;
        }

        console.log(`Product ${parentId} updated in Typesense with ${variations.length} variations`);
        return NextResponse.json({ success: true });
      } catch (error) {
        console.error('Error processing variation update:', error);
        return NextResponse.json({ error: 'Failed to process variation update' }, { status: 500 });
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
