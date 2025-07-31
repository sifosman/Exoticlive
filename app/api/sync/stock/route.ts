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
    // Increased per_page to 50 to process more products per run
    let url = `${wcApiUrl}/wp-json/wc/v3/products?per_page=50&orderby=modified&order=desc`;

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

    // Fetch the original product from WooCommerce to get the latest price and image data
    const productResponse = await fetch(`${wcApiUrl}/wp-json/wc/v3/products/${productId}`, {
      headers: {
        'Authorization': getWooCommerceAuthHeader()
      }
    });

    if (!productResponse.ok) {
      throw new Error(`Failed to fetch product details: ${productResponse.statusText}`);
    }

    const productData = await productResponse.json();
    console.log(`Fetched latest product data for ${productId} (${productData.name})`);

    // Check if price or images have changed
    const newPrice = parseFloat(productData.price || '0');
    const newRegularPrice = parseFloat(productData.regular_price || '0');
    const newSalePrice = productData.sale_price ? parseFloat(productData.sale_price) : null;

    // Check if the product is on sale in WooCommerce
    const isOnSale = productData.on_sale || false;

    // Check if any price fields have changed
    const priceChanged =
      typesenseProduct.price !== newPrice ||
      typesenseProduct.regular_price !== newRegularPrice ||
      // Handle the case where one value is null and the other isn't
      (typesenseProduct.sale_price !== newSalePrice) ||
      // Also check if the on_sale status has changed
      typesenseProduct.on_sale !== isOnSale;

    // Get the image URL from the product data
    const imageUrl = productData.images && productData.images.length > 0 ? productData.images[0].src : null;

    // Normalize URLs for comparison (remove protocol, query params, etc.)
    const normalizeUrl = (url: string | null): string => {
      if (!url) return '';
      try {
        // Remove protocol (http/https)
        let normalized = url.replace(/^https?:\/\//i, '');
        // Remove query parameters
        normalized = normalized.split('?')[0];
        // Remove trailing slashes
        normalized = normalized.replace(/\/$/, '');
        return normalized.toLowerCase();
      } catch (e) {
        return url || '';
      }
    };

    const normalizedOldUrl = normalizeUrl(typesenseProduct.image_url);
    const normalizedNewUrl = normalizeUrl(imageUrl);
    const imageChanged = normalizedOldUrl !== normalizedNewUrl;

    if (priceChanged) {
      console.log(`Price changed for product ${productId}:`);
      console.log(`- Old price: ${typesenseProduct.price}, New price: ${newPrice}`);
      console.log(`- Old regular price: ${typesenseProduct.regular_price}, New regular price: ${newRegularPrice}`);
      console.log(`- Old sale price: ${typesenseProduct.sale_price === null ? 'None' : typesenseProduct.sale_price}, New sale price: ${newSalePrice === null ? 'None' : newSalePrice}`);
      console.log(`- Old on_sale status: ${typesenseProduct.on_sale ? 'Yes' : 'No'}, New on_sale status: ${isOnSale ? 'Yes' : 'No'}`);
    }

    if (imageChanged) {
      console.log(`🖼️ IMAGE CHANGED for product ${productId} (${productData.name}):`);
      console.log(`- Old image: ${typesenseProduct.image_url}`);
      console.log(`- New image: ${imageUrl}`);
      console.log(`- Normalized old URL: ${normalizedOldUrl}`);
      console.log(`- Normalized new URL: ${normalizedNewUrl}`);

      // Log additional information about the image
      if (!imageUrl) {
        console.warn(`⚠️ New image URL is empty or null for product ${productId}`);
      } else if (imageUrl.includes('placeholder')) {
        console.warn(`⚠️ New image URL contains 'placeholder' for product ${productId}: ${imageUrl}`);
      }

      // Check if the product has multiple images
      if (productData.images && productData.images.length > 1) {
        console.log(`Product ${productId} has ${productData.images.length} images:`);
        productData.images.forEach((img, index) => {
          console.log(`  ${index + 1}. ${img.src}`);
        });
      }
    } else {
      // Check if the image URLs are different but normalized versions are the same
      if (typesenseProduct.image_url !== imageUrl && normalizedOldUrl === normalizedNewUrl) {
        console.log(`ℹ️ Image URLs differ but are equivalent after normalization for product ${productId}:`);
        console.log(`- Old image: ${typesenseProduct.image_url}`);
        console.log(`- New image: ${imageUrl}`);
        console.log(`- Normalized: ${normalizedOldUrl}`);
      }
    }

    // Check if we should force an image update even if normalized URLs are the same
    // This handles cases where the image URL has changed in format but points to the same image
    const forceImageUpdate = typesenseProduct.image_url !== imageUrl && normalizedOldUrl === normalizedNewUrl;

    if (forceImageUpdate) {
      console.log(`🔄 FORCING IMAGE UPDATE for product ${productId} despite normalized URLs being the same`);
    }

    // Update stock, price, and image data
    const updateData = {
      // Stock-related fields
      variations: processedVariations,
      variations_json: JSON.stringify(processedVariations),
      variations_count: processedVariations.length,
      in_stock_variations_count: processedVariations.filter(v => v.stock_status === 'instock').length,
      stock_status: processedVariations.some(v => v.stock_status === 'instock') ? 'instock' : 'outofstock',

      // Price fields
      price: newPrice,
      regular_price: newRegularPrice,
      sale_price: newSalePrice,
      on_sale: isOnSale,

      // Image field - always update the image URL even if only the format changed
      image_url: imageUrl,

      // Add a timestamp to force Typesense to recognize the update
      image_updated_at: new Date().toISOString()
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

    // Check if this is a featured product
    const isFeatured = productData.featured || false;

    // Log additional information for featured products
    if (isFeatured) {
      console.log(`⭐ FEATURED PRODUCT ${productId} (${productData.name}) updated:`);
      console.log(`- Image URL: ${imageUrl}`);
      console.log(`- Image changed: ${imageChanged ? 'Yes' : 'No'}`);
      console.log(`- Price changed: ${priceChanged ? 'Yes' : 'No'}`);
      console.log(`- Stock status: ${processedVariations.some(v => v.stock_status === 'instock') ? 'In Stock' : 'Out of Stock'}`);
    }

    // Return result with additional information about what was updated
    return {
      ...updateResult,
      price_updated: priceChanged,
      image_updated: imageChanged || forceImageUpdate, // Consider forced updates as image updates
      force_image_updated: forceImageUpdate,
      variations_updated: true,
      is_featured: isFeatured
    };
  } catch (error) {
    console.error(`Error updating product ${productId} in Typesense:`, error);
    throw error;
  }
}

// Handle GET requests to sync stock
export async function GET(request: NextRequest) {
  try {
    const syncStartTime = Date.now();
    console.log(`=== STOCK SYNC STARTED at ${new Date().toISOString()} ===`);
    console.log('Request URL:', request.url);
    console.log('Request headers:', JSON.stringify(Object.fromEntries(request.headers.entries()), null, 2));

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

      // Logs page has been removed

      return NextResponse.json({
        success: true,
        message: 'No products updated',
        timestamp: new Date().toISOString()
      });
    }

    // Process each product with a timeout
    const results = [];
    const MAX_SYNC_TIME = 25000; // Maximum sync time in milliseconds (25 seconds) - increased to handle more products

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
            price_updated: updateResult.price_updated || false,
            image_updated: updateResult.image_updated || false,
            force_image_updated: updateResult.force_image_updated || false,
            stock_updated: true,
            is_featured: updateResult.is_featured || false,
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

    console.log(`=== STOCK SYNC COMPLETED in ${syncDuration}ms ===`);
    console.log('Products processed:', results.length);
    console.log('Successful updates:', results.filter(r => r.success).length);
    console.log('Failed updates:', results.filter(r => !r.success).length);
    console.log('Price updates:', results.filter(r => r.price_updated).length);
    console.log('Image updates:', results.filter(r => r.image_updated).length);
    console.log('Forced image updates:', results.filter(r => r.force_image_updated).length);
    console.log('Stock updates:', results.filter(r => r.stock_updated).length);
    console.log('Featured products updated:', results.filter(r => r.is_featured).length);

    // Log detailed information about featured products with image updates
    const featuredWithImageUpdates = results.filter(r => r.is_featured && r.image_updated);
    if (featuredWithImageUpdates.length > 0) {
      console.log(`⭐🖼️ ${featuredWithImageUpdates.length} FEATURED PRODUCTS WITH IMAGE UPDATES:`);
      featuredWithImageUpdates.forEach(product => {
        console.log(`- ${product.name} (ID: ${product.id})`);
      });
    }

    // Logs page has been removed

    // Calculate update counts
    const successCount = results.filter(r => r.success).length;
    const priceUpdateCount = results.filter(r => r.price_updated).length;
    const imageUpdateCount = results.filter(r => r.image_updated).length;
    const forceImageUpdateCount = results.filter(r => r.force_image_updated).length;
    const stockUpdateCount = results.filter(r => r.stock_updated).length;
    const featuredUpdateCount = results.filter(r => r.is_featured).length;
    const featuredImageUpdateCount = results.filter(r => r.is_featured && r.image_updated).length;

    return NextResponse.json({
      success: true,
      message: `Synced ${successCount} of ${results.length} products in ${syncDuration}ms (${priceUpdateCount} price updates, ${imageUpdateCount} image updates, ${forceImageUpdateCount} forced image updates, ${stockUpdateCount} stock updates, ${featuredUpdateCount} featured products, ${featuredImageUpdateCount} featured image updates)`,
      results,
      timestamp: new Date().toISOString(),
      duration: syncDuration,
      stats: {
        total: results.length,
        success: successCount,
        failed: results.filter(r => !r.success).length,
        price_updates: priceUpdateCount,
        image_updates: imageUpdateCount,
        force_image_updates: forceImageUpdateCount,
        stock_updates: stockUpdateCount,
        featured_updates: featuredUpdateCount,
        featured_image_updates: featuredImageUpdateCount
      }
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
