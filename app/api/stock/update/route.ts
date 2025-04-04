// app/api/stock/update/route.ts
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

// Update stock in WooCommerce
async function updateWooCommerceStock(parentProductId: number, variationId: number, stockQuantity: number) {
  try {
    console.log(`Updating variation ${variationId} stock in WooCommerce...`);

    // WooCommerce API credentials
    const wcKey = process.env.WC_CONSUMER_KEY || '';
    const wcSecret = process.env.WC_CONSUMER_SECRET || '';
    const wpUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL || '';

    console.log('WooCommerce API credentials:');
    console.log(`WC_CONSUMER_KEY: ${wcKey ? '✅ Set' : '❌ Not set'}`);
    console.log(`WC_CONSUMER_SECRET: ${wcSecret ? '✅ Set' : '❌ Not set'}`);
    console.log(`NEXT_PUBLIC_WORDPRESS_URL: ${wpUrl}`);

    if (!wcKey || !wcSecret || !wpUrl) {
      throw new Error('WooCommerce API credentials not configured');
    }

    // Create authentication header
    const authString = Buffer.from(`${wcKey}:${wcSecret}`).toString('base64');
    console.log('Auth header created (base64 encoded)');

    // Prepare request URL and body
    const url = `${wpUrl}/wp-json/wc/v3/products/${parentProductId}/variations/${variationId}`;
    const body = JSON.stringify({
      stock_quantity: stockQuantity,
      stock_status: stockQuantity > 0 ? 'instock' : 'outofstock'
    });

    console.log(`Making request to: ${url}`);
    console.log(`Request body: ${body}`);

    // Update variation in WooCommerce
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json'
      },
      body: body
    });

    console.log(`Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error response body: ${errorText}`);
      throw new Error(`Failed to update variation in WooCommerce: ${response.statusText}`);
    }

    const updatedVariation = await response.json();
    console.log(`✅ Successfully updated variation in WooCommerce`);
    console.log(`Stock quantity: ${updatedVariation.stock_quantity}`);
    console.log(`Stock status: ${updatedVariation.stock_status}`);

    return updatedVariation;
  } catch (error) {
    console.error(`❌ Error updating variation in WooCommerce:`, error);
    throw error;
  }
}

// Fetch a product from Typesense
async function fetchProductFromTypesense(productId: number) {
  try {
    console.log(`Fetching product ${productId} from Typesense...`);

    const product = await typesenseClient
      .collections('products')
      .documents(productId.toString())
      .retrieve();

    console.log(`✅ Successfully fetched product from Typesense`);
    return product;
  } catch (error) {
    console.error(`❌ Error fetching product from Typesense:`, error);
    throw error;
  }
}

// Update stock in Typesense
async function updateTypesenseStock(parentProductId: number, variationId: number, stockQuantity: number) {
  try {
    console.log(`Updating variation ${variationId} stock in Typesense...`);

    // Fetch the product from Typesense
    const product = await fetchProductFromTypesense(parentProductId);

    // Check if the product has variations
    if (!product.variations && !product.variations_json) {
      throw new Error('Product does not have variations in Typesense');
    }

    // Parse variations if they're stored as JSON
    let variations = product.variations;
    if (!variations && product.variations_json) {
      try {
        variations = JSON.parse(product.variations_json);
      } catch (error) {
        console.error('Error parsing variations_json:', error);
        variations = [];
      }
    }

    if (!Array.isArray(variations)) {
      throw new Error('Variations is not an array');
    }

    console.log(`Found ${variations.length} variations in Typesense`);

    // Find the variation to update
    const variationIndex = variations.findIndex(v => v.id === variationId.toString());

    if (variationIndex === -1) {
      throw new Error(`Variation ${variationId} not found in product ${parentProductId}`);
    }

    console.log(`Found variation at index ${variationIndex}`);
    console.log(`Current stock status: ${variations[variationIndex].stock_status}`);
    console.log(`Current stock quantity: ${variations[variationIndex].stock_quantity}`);

    // Update the variation
    variations[variationIndex].stock_quantity = stockQuantity;
    variations[variationIndex].stock_status = stockQuantity > 0 ? 'instock' : 'outofstock';

    // Update the product in Typesense
    const updateResult = await typesenseClient
      .collections('products')
      .documents(parentProductId.toString())
      .update({
        variations: variations,
        variations_json: JSON.stringify(variations)
      });

    console.log(`✅ Successfully updated variation in Typesense`);
    return updateResult;
  } catch (error) {
    console.error(`❌ Error updating variation in Typesense:`, error);
    throw error;
  }
}

// Handle POST requests to update stock
export async function POST(request: NextRequest) {
  try {
    console.log('Received stock update request');

    // Parse the request body
    const body = await request.json();
    console.log('Request body:', body);

    const { parentProductId, variationId, stockQuantity } = body;

    // Validate required parameters
    if (!parentProductId || !variationId || stockQuantity === undefined) {
      console.error('Missing required parameters:', { parentProductId, variationId, stockQuantity });
      return NextResponse.json(
        { success: false, message: 'Missing required parameters' },
        { status: 400 }
      );
    }

    console.log(`Updating stock for variation ${variationId} of product ${parentProductId} to ${stockQuantity}...`);

    // Update stock in WooCommerce
    await updateWooCommerceStock(parentProductId, variationId, stockQuantity);

    // Update stock in Typesense
    await updateTypesenseStock(parentProductId, variationId, stockQuantity);

    // Get the product slug for cache revalidation
    let productSlug = '';
    try {
      const product = await typesenseClient
        .collections('products')
        .documents(parentProductId.toString())
        .retrieve();

      productSlug = product.slug;
      console.log(`Found product slug for revalidation: ${productSlug}`);
    } catch (error) {
      console.error('Error getting product slug for revalidation:', error);
    }

    // Return success response
    const response = {
      success: true,
      message: `Stock updated successfully for variation ${variationId} of product ${parentProductId}`,
      stockQuantity,
      stockStatus: stockQuantity > 0 ? 'instock' : 'outofstock',
      productSlug
    };

    console.log('Sending success response:', response);
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating stock:', error);
    const errorResponse = {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
    console.log('Sending error response:', errorResponse);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// Handle OPTIONS requests (for CORS preflight)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
