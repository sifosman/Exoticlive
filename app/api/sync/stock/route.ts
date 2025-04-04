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

// Fetch recently updated products from WooCommerce
async function fetchRecentlyUpdatedProducts(updatedSince?: string) {
  try {
    console.log('Fetching recently updated products from WooCommerce...');

    if (!wcApiUrl || !wcConsumerKey || !wcConsumerSecret) {
      throw new Error('WooCommerce API credentials not configured');
    }

    // Calculate a timestamp for 5 minutes ago if no updatedSince is provided
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const effectiveUpdatedSince = updatedSince || fiveMinutesAgo;

    // Build the URL with query parameters - get all product types, not just variable
    let url = `${wcApiUrl}/wp-json/wc/v3/products?per_page=20&orderby=modified&order=desc`;

    // Add the modified_after parameter
    url += `&modified_after=${effectiveUpdatedSince}`;
    console.log(`Fetching products updated since ${effectiveUpdatedSince}`);

    const response = await fetch(url, {
      headers: {
        'Authorization': getWooCommerceAuthHeader()
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.statusText}`);
    }

    const products = await response.json();
    console.log(`Found ${products.length} recently updated products in WooCommerce`);

    return products;
  } catch (error) {
    console.error('Error fetching products from WooCommerce:', error);
    throw error;
  }
}

// Fetch variations for a product from WooCommerce
async function fetchVariationsFromWooCommerce(productId: number) {
  try {
    console.log(`Fetching variations for product ${productId} from WooCommerce...`);

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
    throw error;
  }
}

// Update product in Typesense
async function updateProductInTypesense(productId: string, variations: any[]) {
  try {
    console.log(`Updating product ${productId} in Typesense...`);

    // First check if the product exists in Typesense
    const typesenseHost = process.env.TYPESENSE_HOST || process.env.NEXT_PUBLIC_TYPESENSE_HOST || '';
    const typesensePort = process.env.TYPESENSE_PORT || process.env.NEXT_PUBLIC_TYPESENSE_PORT || '443';
    const typesenseProtocol = process.env.TYPESENSE_PROTOCOL || process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL || 'https';
    const typesenseApiKey = process.env.TYPESENSE_API_KEY || process.env.NEXT_PUBLIC_TYPESENSE_ADMIN_API_KEY || '';
    const typesenseCollection = 'products';

    // Check if the product exists in Typesense
    const getUrl = `${typesenseProtocol}://${typesenseHost}:${typesensePort}/collections/${typesenseCollection}/documents/${productId}`;

    let typesenseProduct;
    try {
      const getResponse = await fetch(getUrl, {
        headers: {
          'X-TYPESENSE-API-KEY': typesenseApiKey
        }
      });

      if (!getResponse.ok) {
        // If the product doesn't exist in Typesense, skip it
        if (getResponse.status === 404) {
          console.log(`Product ${productId} not found in Typesense, skipping update`);
          return null;
        }

        const errorText = await getResponse.text();
        throw new Error(`Failed to fetch product from Typesense: ${getResponse.status} ${getResponse.statusText} - ${errorText}`);
      }

      typesenseProduct = await getResponse.json();
      console.log(`Found product in Typesense: ${typesenseProduct.name}`);
    } catch (error) {
      console.error(`Error fetching product ${productId} from Typesense:`, error);
      return null;
    }

    // Process variations
    const processedVariations = variations.map(variation => {
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

    // Only update the stock-related fields to minimize the update size
    const updateData = {
      variations: processedVariations,
      variations_json: JSON.stringify(processedVariations),
      variations_count: processedVariations.length,
      in_stock_variations_count: processedVariations.filter(v => v.stock_status === 'instock').length,
      stock_status: processedVariations.some(v => v.stock_status === 'instock') ? 'instock' : 'outofstock'
    };

    // Send PATCH request to update the document
    const patchUrl = `${typesenseProtocol}://${typesenseHost}:${typesensePort}/collections/${typesenseCollection}/documents/${productId}`;
    console.log(`Sending PATCH request to: ${patchUrl}`);

    const startTime = Date.now();

    const patchResponse = await fetch(patchUrl, {
      method: 'PATCH',
      headers: {
        'X-TYPESENSE-API-KEY': typesenseApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    if (!patchResponse.ok) {
      const errorText = await patchResponse.text();
      throw new Error(`Failed to update product: ${patchResponse.status} ${patchResponse.statusText} - ${errorText}`);
    }

    const updateResult = await patchResponse.json();
    console.log(`Product ${productId} updated in Typesense with ${processedVariations.length} variations in ${duration}ms`);

    return updateResult;
  } catch (error) {
    console.error(`Error updating product ${productId} in Typesense:`, error);
    throw error;
  }
}

// Handle GET requests to sync stock
export async function GET(request: NextRequest) {
  try {
    const syncStartTime = Date.now();
    console.log(`Starting stock sync at ${new Date().toISOString()}...`);

    // Get the API key from the request
    const apiKey = request.nextUrl.searchParams.get('key');

    // Check if the API key is valid
    if (apiKey !== process.env.SYNC_API_KEY) {
      return NextResponse.json(
        { success: false, message: 'Invalid API key' },
        { status: 401 }
      );
    }

    // Get the updatedSince parameter from the request
    const updatedSince = request.nextUrl.searchParams.get('since') || '';

    // Fetch recently updated products from WooCommerce
    const products = await fetchRecentlyUpdatedProducts(updatedSince);

    // If no products were updated, return early
    if (products.length === 0) {
      console.log('No products updated since', updatedSince || 'last check');

      // Log this to the logs endpoint
      try {
        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/logs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.SYNC_API_KEY || ''
          },
          body: JSON.stringify({
            message: `No products updated since ${updatedSince || 'last check'}`
          })
        });
      } catch (logError) {
        console.error('Error logging to logs endpoint:', logError);
      }

      return NextResponse.json({
        success: true,
        message: 'No products updated',
        timestamp: new Date().toISOString()
      });
    }

    // Process each product with a timeout
    const results = [];
    const MAX_SYNC_TIME = 5000; // Maximum sync time in milliseconds (5 seconds)

    for (const product of products) {
      // Check if we've exceeded the maximum sync time
      const currentTime = Date.now();
      const elapsedTime = currentTime - syncStartTime;

      if (elapsedTime > MAX_SYNC_TIME) {
        console.log(`Sync time limit of ${MAX_SYNC_TIME}ms exceeded after processing ${results.length} products. Stopping sync.`);
        break;
      }

      try {
        // Fetch variations for this product
        const variations = await fetchVariationsFromWooCommerce(product.id);

        // Update the product in Typesense
        const updateResult = await updateProductInTypesense(product.id.toString(), variations);

        // If the product was updated successfully
        if (updateResult) {
          results.push({
            id: product.id,
            name: product.name,
            variations_count: variations.length,
            success: true
          });
        } else {
          console.log(`Product ${product.id} skipped (not found in Typesense)`);
        }
      } catch (error) {
        console.error(`Error processing product ${product.id}:`, error);

        results.push({
          id: product.id,
          name: product.name,
          error: error instanceof Error ? error.message : String(error),
          success: false
        });
      }
    }

    const syncEndTime = Date.now();
    const syncDuration = syncEndTime - syncStartTime;

    console.log(`Stock sync completed in ${syncDuration}ms`);

    // Log this to the logs endpoint
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.SYNC_API_KEY || ''
        },
        body: JSON.stringify({
          message: `Stock sync completed in ${syncDuration}ms. Processed ${results.length} products. Success: ${results.filter(r => r.success).length}, Errors: ${results.filter(r => !r.success).length}`
        })
      });
    } catch (logError) {
      console.error('Error logging to logs endpoint:', logError);
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${results.filter(r => r.success).length} of ${results.length} products in ${syncDuration}ms`,
      results,
      timestamp: new Date().toISOString(),
      duration: syncDuration
    });
  } catch (error) {
    console.error('Error syncing stock:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Error syncing stock',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
