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

// Fetch recently updated and created products from WooCommerce
async function fetchRecentlyUpdatedProducts() {
  try {
    console.log('Fetching recently updated and created products from WooCommerce...');

    if (!wcApiUrl || !wcConsumerKey || !wcConsumerSecret) {
      throw new Error('WooCommerce API credentials not configured');
    }

    // Get products updated in the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    // Build the URL with query parameters for updated products
    const updatedUrl = `${wcApiUrl}/wp-json/wc/v3/products?per_page=20&orderby=modified&order=desc&modified_after=${fiveMinutesAgo}`;

    console.log(`Fetching updated products from: ${updatedUrl}`);

    const updatedResponse = await fetch(updatedUrl, {
      headers: {
        'Authorization': getWooCommerceAuthHeader()
      }
    });

    if (!updatedResponse.ok) {
      throw new Error(`Failed to fetch updated products: ${updatedResponse.statusText}`);
    }

    const updatedProducts = await updatedResponse.json();
    console.log(`Found ${updatedProducts.length} recently updated products in WooCommerce`);

    // Build the URL with query parameters for recently created products
    const createdUrl = `${wcApiUrl}/wp-json/wc/v3/products?per_page=20&orderby=date&order=desc&after=${fiveMinutesAgo}`;

    console.log(`Fetching newly created products from: ${createdUrl}`);

    const createdResponse = await fetch(createdUrl, {
      headers: {
        'Authorization': getWooCommerceAuthHeader()
      }
    });

    if (!createdResponse.ok) {
      throw new Error(`Failed to fetch newly created products: ${createdResponse.statusText}`);
    }

    const createdProducts = await createdResponse.json();
    console.log(`Found ${createdProducts.length} newly created products in WooCommerce`);

    // Combine the results, removing duplicates by ID
    const allProducts = [...updatedProducts];

    // Add created products that aren't already in the updated products list
    for (const product of createdProducts) {
      if (!allProducts.some(p => p.id === product.id)) {
        allProducts.push(product);
      }
    }

    console.log(`Total unique products to process: ${allProducts.length}`);

    return allProducts;
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

    // Check if the product exists in Typesense
    try {
      const product = await typesenseClient
        .collections('products')
        .documents(productId)
        .retrieve();

      console.log(`Found product in Typesense: ${product.name}`);

      // Update the product in Typesense
      const updateData = {
        variations: processedVariations,
        variations_json: JSON.stringify(processedVariations),
        variations_count: processedVariations.length,
        in_stock_variations_count: processedVariations.filter(v => v.stock_status === 'instock').length,
        stock_status: processedVariations.some(v => v.stock_status === 'instock') ? 'instock' : 'outofstock'
      };

      const updateResult = await typesenseClient
        .collections('products')
        .documents(productId)
        .update(updateData);

      console.log(`Product ${productId} updated in Typesense with ${processedVariations.length} variations`);

      return updateResult;
    } catch (error) {
      // If the product doesn't exist in Typesense, create it
      if (error.toString().includes('Not Found') || error.toString().includes('404')) {
        console.log(`Product ${productId} not found in Typesense, creating it...`);

        // We need more product data to create a new product
        // Fetch the full product data from WooCommerce
        try {
          const productResponse = await fetch(`${wcApiUrl}/wp-json/wc/v3/products/${productId}`, {
            headers: {
              'Authorization': getWooCommerceAuthHeader()
            }
          });

          if (!productResponse.ok) {
            throw new Error(`Failed to fetch product details: ${productResponse.statusText}`);
          }

          const productData = await productResponse.json();
          console.log(`Fetched product details for ${productId}: ${productData.name}`);

          // Create a new product document for Typesense
          const newProduct = {
            id: productId,
            name: productData.name || '',
            description: productData.description ? productData.description.replace(/<[^>]*>?/gm, '') : '',
            price: parseFloat(productData.price || '0'),
            sale_price: productData.sale_price ? parseFloat(productData.sale_price) : null,
            regular_price: productData.regular_price ? parseFloat(productData.regular_price) : null,
            categories: productData.categories?.map((cat: any) => cat.name) || [],
            tags: productData.tags?.map((tag: any) => tag.name) || [],
            attributes: productData.attributes?.map((attr: any) => attr.name) || [],
            colors: productData.attributes?.find((attr: any) => attr.name === 'Color')?.options || [],
            sizes: productData.attributes?.find((attr: any) => attr.name === 'Size')?.options || [],
            image_url: productData.images && productData.images.length > 0 ? productData.images[0].src : '',
            gallery_images: productData.images?.map((img: any) => img.src) || [],
            slug: productData.slug || '',
            stock_status: productData.stock_status || 'outofstock',
            stock_quantity: productData.stock_quantity || 0,
            variations_count: processedVariations.length,
            in_stock_variations_count: processedVariations.filter(v => v.stock_status === 'instock').length,
            variations: processedVariations,
            variations_json: JSON.stringify(processedVariations),
            featured: productData.featured !== undefined ? productData.featured : false,
            is_featured: productData.featured !== undefined ? !!productData.featured : false,
            is_on_sale: productData.on_sale !== undefined ? productData.on_sale : false,
            on_sale: productData.on_sale !== undefined ? productData.on_sale : false,
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
            tax_class: productData.tax_class || ''
          };

          // Create the product in Typesense
          const createResult = await typesenseClient
            .collections('products')
            .documents()
            .create(newProduct);

          console.log(`Created new product in Typesense: ${productId} - ${productData.name}`);
          return createResult;
        } catch (createError) {
          console.error(`Error creating product ${productId} in Typesense:`, createError);
          return null;
        }
      } else {
        // Some other error occurred
        console.error(`Error retrieving product ${productId} from Typesense:`, error);
        return null;
      }
    }
  } catch (error) {
    console.error(`Error updating product ${productId} in Typesense:`, error);
    throw error;
  }
}

// Handle GET requests to sync stock
export async function GET(request: NextRequest) {
  try {
    const syncStartTime = Date.now();
    console.log(`=== SIMPLE SYNC STARTED at ${new Date().toISOString()} ===`);

    // Fetch recently updated products from WooCommerce
    const products = await fetchRecentlyUpdatedProducts();

    // If no products were updated or created, return early
    if (products.length === 0) {
      console.log('No products updated or created in the last 5 minutes');

      return NextResponse.json({
        success: true,
        message: 'No products updated or created',
        timestamp: new Date().toISOString()
      });
    }

    console.log('Products to process:');
    products.forEach(product => {
      console.log(`- ${product.name} (ID: ${product.id}, Type: ${product.type})`);
    });

    // Process each product
    const results = [];

    for (const product of products) {
      try {
        // Fetch variations for this product
        const variations = await fetchVariationsFromWooCommerce(product.id);

        // Update the product in Typesense
        await updateProductInTypesense(product.id.toString(), variations);

        results.push({
          id: product.id,
          name: product.name,
          variations_count: variations.length,
          success: true
        });
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

    console.log(`=== SIMPLE SYNC COMPLETED in ${syncDuration}ms ===`);
    console.log('Products processed:', results.length);
    console.log('Successful updates:', results.filter(r => r.success).length);
    console.log('Failed updates:', results.filter(r => !r.success).length);

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
