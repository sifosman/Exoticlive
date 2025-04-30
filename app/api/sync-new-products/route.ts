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

// Fetch recently created products from WooCommerce
async function fetchNewProducts() {
  try {
    console.log('Fetching newly created products from WooCommerce...');

    if (!wcApiUrl || !wcConsumerKey || !wcConsumerSecret) {
      throw new Error('WooCommerce API credentials not configured');
    }

    // Get products created in the last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Build the URL with query parameters for recently created products
    // We're using orderby=date to get the most recently created products first
    const url = `${wcApiUrl}/wp-json/wc/v3/products?per_page=50&orderby=date&order=desc&after=${oneDayAgo}&status=publish`;

    console.log(`Fetching newly created products from: ${url}`);

    const response = await fetch(url, {
      headers: {
        'Authorization': getWooCommerceAuthHeader()
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.statusText}`);
    }

    const products = await response.json();
    console.log(`Found ${products.length} newly created products in WooCommerce`);

    return products;
  } catch (error) {
    console.error('Error fetching products from WooCommerce:', error);
    throw error;
  }
}

// Check if a product exists in Typesense
async function checkProductExistsInTypesense(productId: string) {
  try {
    await typesenseClient
      .collections('products')
      .documents(productId)
      .retrieve();

    return true;
  } catch (error) {
    if (error.toString().includes('Not Found') || error.toString().includes('404')) {
      return false;
    }
    throw error;
  }
}

// Fetch variations for a product from WooCommerce
async function fetchVariationsFromWooCommerce(productId: number, productType: string) {
  try {
    // Only fetch variations for variable products
    if (productType !== 'variable') {
      console.log(`Product ${productId} is not a variable product (type: ${productType}), skipping variations fetch`);
      return [];
    }

    console.log(`Fetching variations for variable product ${productId} from WooCommerce...`);

    if (!wcApiUrl || !wcConsumerKey || !wcConsumerSecret) {
      throw new Error('WooCommerce API credentials not configured');
    }

    const response = await fetch(`${wcApiUrl}/wp-json/wc/v3/products/${productId}/variations?per_page=100`, {
      headers: {
        'Authorization': getWooCommerceAuthHeader()
      }
    });

    if (!response.ok) {
      // If we get a 404, it might mean the product doesn't have variations
      if (response.status === 404) {
        console.log(`No variations found for product ${productId}, it might not be a variable product`);
        return [];
      }
      throw new Error(`Failed to fetch variations: ${response.statusText}`);
    }

    const variations = await response.json();
    console.log(`Found ${variations.length} variations for product ${productId}`);

    return variations;
  } catch (error) {
    console.error(`Error fetching variations for product ${productId}:`, error);
    // Return empty array instead of throwing to allow the process to continue
    return [];
  }
}

// Create product in Typesense
async function createProductInTypesense(productId: string, productData: any, variations: any[]) {
  try {
    console.log(`Creating product ${productId} (${productData.name}) in Typesense...`);
    console.log(`Product type: ${productData.type}, Variations: ${variations.length}`);

    // Process variations
    const processedVariations = variations.length > 0 ? variations.map(variation => {
      return {
        id: variation.id.toString(),
        price: parseFloat(variation.price || '0'),
        regular_price: parseFloat(variation.regular_price || '0'),
        sale_price: variation.sale_price ? parseFloat(variation.sale_price) : null,
        stock_status: variation.stock_status || 'outofstock',
        stock_quantity: variation.stock_quantity || 0,
        attributes: variation.attributes && Array.isArray(variation.attributes) ? variation.attributes.map((attr: any) => ({
          name: attr.name,
          option: attr.option
        })) : []
      };
    }) : [];

    // Get price data
    const price = parseFloat(productData.price || '0');
    const regularPrice = parseFloat(productData.regular_price || '0');
    const salePrice = productData.sale_price ? parseFloat(productData.sale_price) : null;
    const isOnSale = productData.on_sale || false;

    // Get image data
    const imageUrl = productData.images && productData.images.length > 0 ? productData.images[0].src : '';

    // Check if the product is featured
    const isFeatured = productData.featured || false;

    // For variable products, calculate stock status based on variations
    let stockStatus = productData.stock_status || 'outofstock';
    if (productData.type === 'variable' && processedVariations.length > 0) {
      stockStatus = processedVariations.some(v => v.stock_status === 'instock') ? 'instock' : 'outofstock';
    }

    // Create a new product document for Typesense
    const newProduct = {
      id: productId,
      name: productData.name || '',
      description: productData.description ? productData.description.replace(/<[^>]*>?/gm, '') : '',
      price: price,
      sale_price: salePrice,
      regular_price: regularPrice,
      categories: productData.categories?.map((cat: any) => cat.name) || [],
      tags: productData.tags?.map((tag: any) => tag.name) || [],
      attributes: productData.attributes?.map((attr: any) => attr.name) || [],
      colors: productData.attributes?.find((attr: any) => attr.name === 'Color')?.options || [],
      sizes: productData.attributes?.find((attr: any) => attr.name === 'Size')?.options || [],
      image_url: imageUrl,
      gallery_images: productData.images?.map((img: any) => img.src) || [],
      slug: productData.slug || '',
      stock_status: stockStatus,
      stock_quantity: productData.stock_quantity || 0,
      variations_count: processedVariations.length,
      in_stock_variations_count: processedVariations.filter(v => v.stock_status === 'instock').length,
      variations: processedVariations,
      variations_json: JSON.stringify(processedVariations),
      featured: isFeatured,
      is_featured: isFeatured,
      is_on_sale: isOnSale,
      on_sale: isOnSale,
      average_rating: parseFloat(productData.average_rating || '0'),
      date_created: productData.date_created || new Date().toISOString(),
      catalog_visibility: productData.catalog_visibility || 'visible',
      short_description: productData.short_description ? productData.short_description.replace(/<[^>]*>?/gm, '') : '',
      sku: productData.sku || '',
      status: productData.status || 'publish',
      weight: productData.weight || '',
      dimensions: productData.dimensions || { length: '', width: '', height: '' },
      shipping_class: productData.shipping_class || '',
      shipping_class_id: productData.shipping_class_id || 0,
      type: productData.type || 'simple',
      virtual: productData.virtual !== undefined ? productData.virtual : false,
      downloadable: productData.downloadable !== undefined ? productData.downloadable : false,
      tax_status: productData.tax_status || 'taxable',
      tax_class: productData.tax_class || '',
      image_updated_at: new Date().toISOString()
    };

    // Create the product in Typesense
    const createResult = await typesenseClient
      .collections('products')
      .documents()
      .create(newProduct);

    console.log(`Created new product in Typesense: ${productId} - ${productData.name}`);
    return createResult;
  } catch (error) {
    console.error(`Error creating product ${productId} in Typesense:`, error);
    throw error;
  }
}

// Handle GET requests to sync new products
export async function GET(request: NextRequest) {
  try {
    const syncStartTime = Date.now();
    console.log(`=== NEW PRODUCTS SYNC STARTED at ${new Date().toISOString()} ===`);

    // Get the API key from the request
    const apiKey = request.nextUrl.searchParams.get('key');

    // Only check API key if it's provided and not called from cron-trigger
    // This allows the cron-trigger endpoint to call this endpoint without an API key
    if (apiKey && apiKey !== process.env.SYNC_API_KEY) {
      return NextResponse.json(
        { success: false, message: 'Invalid API key' },
        { status: 401 }
      );
    }

    // Fetch newly created products from WooCommerce
    const products = await fetchNewProducts();

    // If no products were found, return early
    if (products.length === 0) {
      console.log('No new products found in WooCommerce');

      return NextResponse.json({
        success: true,
        message: 'No new products found',
        timestamp: new Date().toISOString()
      });
    }

    console.log(`Found ${products.length} new products to check...`);

    // Process each product
    const results = [];
    let newProductsCount = 0;
    let simpleProductsCount = 0;
    let variableProductsCount = 0;

    for (const product of products) {
      try {
        // Check if the product already exists in Typesense
        const exists = await checkProductExistsInTypesense(product.id.toString());

        if (exists) {
          console.log(`Product ${product.id} (${product.name}) already exists in Typesense, skipping...`);
          continue;
        }

        // Product doesn't exist in Typesense, create it
        newProductsCount++;

        // Track product type
        if (product.type === 'variable') {
          variableProductsCount++;
        } else {
          simpleProductsCount++;
        }

        console.log(`Product ${product.id} (${product.name}) is new, creating in Typesense...`);
        console.log(`Product type: ${product.type}`);

        // Fetch variations for this product if it's a variable product
        let variations = [];
        try {
          variations = await fetchVariationsFromWooCommerce(product.id, product.type);
          console.log(`Successfully fetched ${variations.length} variations for product ${product.id} (${product.name})`);
        } catch (variationError) {
          console.error(`Error fetching variations for product ${product.id}, continuing with empty variations:`, variationError);
          // Continue with empty variations rather than failing the whole product
        }

        // Create the product in Typesense
        await createProductInTypesense(product.id.toString(), product, variations);

        results.push({
          id: product.id,
          name: product.name,
          type: product.type,
          variations_count: variations.length,
          is_featured: product.featured || false,
          action: 'created',
          success: true
        });
      } catch (error) {
        console.error(`Error processing product ${product.id}:`, error);

        results.push({
          id: product.id,
          name: product.name,
          type: product.type || 'unknown',
          error: error instanceof Error ? error.message : String(error),
          success: false
        });
      }
    }

    const syncEndTime = Date.now();
    const syncDuration = syncEndTime - syncStartTime;

    console.log(`=== NEW PRODUCTS SYNC COMPLETED in ${syncDuration}ms ===`);
    console.log('Products checked:', products.length);
    console.log('New products created:', newProductsCount);
    console.log('Simple products created:', simpleProductsCount);
    console.log('Variable products created:', variableProductsCount);
    console.log('Successful creations:', results.filter(r => r.success).length);
    console.log('Failed creations:', results.filter(r => !r.success).length);

    return NextResponse.json({
      success: true,
      message: `Created ${results.filter(r => r.success).length} new products in ${syncDuration}ms (${simpleProductsCount} simple, ${variableProductsCount} variable)`,
      results,
      timestamp: new Date().toISOString(),
      duration: syncDuration,
      stats: {
        total_checked: products.length,
        new_products: newProductsCount,
        simple_products: simpleProductsCount,
        variable_products: variableProductsCount,
        success: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    });
  } catch (error) {
    console.error('Error syncing new products:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Error syncing new products',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
