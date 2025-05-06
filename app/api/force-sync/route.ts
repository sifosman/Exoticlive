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

// Update or create product in Typesense
async function updateOrCreateProductInTypesense(productData: any, variations: any[]) {
  try {
    const productId = productData.id.toString();
    console.log(`Updating or creating product ${productId} (${productData.name}) in Typesense...`);
    console.log(`Product type: ${productData.type}, Variations: ${variations.length}`);

    // Process variations - SIMPLIFIED to avoid attribute issues
    const processedVariations = variations && variations.length > 0 ? variations.map(variation => {
      if (!variation) return null;

      try {
        // Extract attribute options as simple strings
        const attributeOptions = {};

        if (variation.attributes && Array.isArray(variation.attributes)) {
          variation.attributes.forEach((attr: any) => {
            if (attr && attr.name && attr.option) {
              attributeOptions[attr.name] = attr.option;
            }
          });
        }

        return {
          id: variation.id ? variation.id.toString() : '',
          price: parseFloat(variation.price || '0'),
          regular_price: parseFloat(variation.regular_price || '0'),
          sale_price: variation.sale_price ? parseFloat(variation.sale_price) : null,
          stock_status: variation.stock_status || 'outofstock',
          stock_quantity: variation.stock_quantity || 0,
          // Replace complex attributes with simple key-value object
          attribute_options: attributeOptions
        };
      } catch (err) {
        console.error('Error processing variation:', err, variation);
        return null;
      }
    }).filter(Boolean) : [];

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

    // Extract color and size options from attributes
    let colorOptions = [];
    let sizeOptions = [];

    if (productData.attributes && Array.isArray(productData.attributes)) {
      const colorAttr = productData.attributes.find((attr: any) => attr && attr.name === 'Color');
      const sizeAttr = productData.attributes.find((attr: any) => attr && attr.name === 'Size');

      if (colorAttr && colorAttr.options && Array.isArray(colorAttr.options)) {
        colorOptions = colorAttr.options.filter(Boolean);
      }

      if (sizeAttr && sizeAttr.options && Array.isArray(sizeAttr.options)) {
        sizeOptions = sizeAttr.options.filter(Boolean);
      }
    }

    // Create the product document for Typesense - REMOVING problematic fields
    const productDocument = {
      id: productId,
      name: productData.name || '',
      description: productData.description ? productData.description.replace(/<[^>]*>?/gm, '') : '',
      price: price,
      sale_price: salePrice,
      regular_price: regularPrice,
      // Using string arrays for categories and tags
      categories: productData.categories && Array.isArray(productData.categories)
        ? productData.categories
            .filter(cat => cat && typeof cat === 'object' && cat.name)
            .map((cat: any) => cat.name)
        : [],
      tags: productData.tags && Array.isArray(productData.tags)
        ? productData.tags
            .filter(tag => tag && typeof tag === 'object' && tag.name)
            .map((tag: any) => tag.name)
        : [],
      // REMOVED attributes field completely
      colors: colorOptions,
      sizes: sizeOptions,
      image_url: imageUrl || '',
      gallery_images: productData.images && Array.isArray(productData.images)
        ? productData.images
            .filter(img => img && typeof img === 'object' && img.src)
            .map((img: any) => img.src)
        : [],
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
      // Simplified dimensions
      dimensions: {
        length: productData.dimensions?.length || '',
        width: productData.dimensions?.width || '',
        height: productData.dimensions?.height || ''
      },
      shipping_class: productData.shipping_class || '',
      shipping_class_id: productData.shipping_class_id || 0,
      type: productData.type || 'simple',
      virtual: productData.virtual === true,
      downloadable: productData.downloadable === true,
      tax_status: productData.tax_status || 'taxable',
      tax_class: productData.tax_class || '',
      image_updated_at: new Date().toISOString()
    };

    // Check if the product exists in Typesense
    try {
      await typesenseClient
        .collections('products')
        .documents(productId)
        .retrieve();

      console.log(`Product ${productId} exists in Typesense, updating it...`);

      // Update the product in Typesense
      const updateResult = await typesenseClient
        .collections('products')
        .documents(productId)
        .update(productDocument);

      console.log(`Product ${productId} updated in Typesense`);
      return { ...updateResult, action: 'updated' };
    } catch (error) {
      // If the product doesn't exist in Typesense, create it
      if (error.toString().includes('Not Found') || error.toString().includes('404')) {
        console.log(`Product ${productId} not found in Typesense, creating it...`);

        // Create the product in Typesense
        const createResult = await typesenseClient
          .collections('products')
          .documents()
          .create(productDocument);

        console.log(`Created new product in Typesense: ${productId} - ${productData.name}`);
        return { ...createResult, action: 'created' };
      } else {
        // Some other error occurred
        console.error(`Error retrieving product ${productId} from Typesense:`, error);
        throw error;
      }
    }
  } catch (error) {
    console.error(`Error updating/creating product ${productData.id} in Typesense:`, error);
    throw error;
  }
}

// Handle GET requests to force sync a specific product
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

    console.log(`=== FORCE SYNC STARTED for product ${productId} at ${new Date().toISOString()} ===`);

    // Fetch the product from WooCommerce
    const product = await fetchProductFromWooCommerce(productId);

    // Fetch variations if it's a variable product
    const variations = await fetchVariationsFromWooCommerce(product.id, product.type);

    // Update or create the product in Typesense
    const result = await updateOrCreateProductInTypesense(product, variations);

    const syncEndTime = Date.now();
    const syncDuration = syncEndTime - syncStartTime;

    console.log(`=== FORCE SYNC COMPLETED in ${syncDuration}ms ===`);

    return NextResponse.json({
      success: true,
      message: `Product ${product.name} (ID: ${productId}) ${result.action} in Typesense`,
      product: {
        id: product.id,
        name: product.name,
        type: product.type,
        variations_count: variations.length,
        action: result.action
      },
      timestamp: new Date().toISOString(),
      duration: syncDuration
    });
  } catch (error) {
    console.error('Error forcing sync:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Error forcing sync',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
