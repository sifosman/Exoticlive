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

// Fetch all products from WooCommerce
async function fetchAllProducts() {
  try {
    console.log('Fetching all products from WooCommerce...');

    if (!wcApiUrl || !wcConsumerKey || !wcConsumerSecret) {
      throw new Error('WooCommerce API credentials not configured');
    }

    // We'll fetch products in batches of 100
    const batchSize = 100;
    let page = 1;
    let allProducts: any[] = [];
    let hasMoreProducts = true;

    while (hasMoreProducts) {
      // Build the URL with query parameters
      const url = `${wcApiUrl}/wp-json/wc/v3/products?per_page=${batchSize}&page=${page}`;
      
      console.log(`Fetching products page ${page} from: ${url}`);

      const response = await fetch(url, {
        headers: {
          'Authorization': getWooCommerceAuthHeader()
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.statusText}`);
      }

      const products = await response.json();
      console.log(`Found ${products.length} products on page ${page}`);

      if (products.length > 0) {
        allProducts = [...allProducts, ...products];
        page++;
      } else {
        hasMoreProducts = false;
      }

      // If we got fewer products than the batch size, we've reached the end
      if (products.length < batchSize) {
        hasMoreProducts = false;
      }
    }

    console.log(`Found a total of ${allProducts.length} products in WooCommerce`);
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

// Update or create product in Typesense
async function updateOrCreateProductInTypesense(productData: any, variations: any[]) {
  try {
    const productId = productData.id.toString();
    console.log(`Updating or creating product ${productId} (${productData.name}) in Typesense...`);

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

    // Get price data
    const newPrice = parseFloat(productData.price || '0');
    const newRegularPrice = parseFloat(productData.regular_price || '0');
    const newSalePrice = productData.sale_price ? parseFloat(productData.sale_price) : null;
    const isOnSale = productData.on_sale || false;

    // Get image data
    const imageUrl = productData.images && productData.images.length > 0 ? productData.images[0].src : null;

    // Check if the product is featured
    const isFeatured = productData.featured || false;

    // Log information about the product
    if (isFeatured) {
      console.log(`⭐ FEATURED PRODUCT ${productId} (${productData.name}):`);
      console.log(`- Image URL: ${imageUrl}`);
      console.log(`- Price: ${newPrice}`);
      console.log(`- Regular price: ${newRegularPrice}`);
      console.log(`- Sale price: ${newSalePrice}`);
      console.log(`- On sale: ${isOnSale ? 'Yes' : 'No'}`);
    }

    // Check if the product exists in Typesense
    try {
      await typesenseClient
        .collections('products')
        .documents(productId)
        .retrieve();

      console.log(`Product ${productId} exists in Typesense, updating it...`);

      // Update the product in Typesense
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
        
        // Image field
        image_url: imageUrl,
        
        // Add a timestamp to force Typesense to recognize the update
        image_updated_at: new Date().toISOString(),
        
        // Featured status
        featured: isFeatured,
        is_featured: isFeatured,
        
        // Update the name and slug to ensure they're current
        name: productData.name || '',
        slug: productData.slug || ''
      };

      const updateResult = await typesenseClient
        .collections('products')
        .documents(productId)
        .update(updateData);

      console.log(`Product ${productId} updated in Typesense`);
      return { ...updateResult, action: 'updated' };
    } catch (error) {
      // If the product doesn't exist in Typesense, create it
      if (error.toString().includes('Not Found') || error.toString().includes('404')) {
        console.log(`Product ${productId} not found in Typesense, creating it...`);

        // Create a new product document for Typesense
        const newProduct = {
          id: productId,
          name: productData.name || '',
          description: productData.description ? productData.description.replace(/<[^>]*>?/gm, '') : '',
          price: newPrice,
          sale_price: newSalePrice,
          regular_price: newRegularPrice,
          categories: productData.categories?.map((cat: any) => cat.name) || [],
          tags: productData.tags?.map((tag: any) => tag.name) || [],
          attributes: productData.attributes?.map((attr: any) => attr.name) || [],
          colors: productData.attributes?.find((attr: any) => attr.name === 'Color')?.options || [],
          sizes: productData.attributes?.find((attr: any) => attr.name === 'Size')?.options || [],
          image_url: imageUrl || '',
          gallery_images: productData.images?.map((img: any) => img.src) || [],
          slug: productData.slug || '',
          stock_status: productData.stock_status || 'outofstock',
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

// Handle GET requests to sync all products
export async function GET(request: NextRequest) {
  try {
    const syncStartTime = Date.now();
    console.log(`=== SYNC ALL PRODUCTS STARTED at ${new Date().toISOString()} ===`);

    // Get the API key from the request
    const apiKey = request.nextUrl.searchParams.get('key');

    // Check if the API key is valid
    if (apiKey !== process.env.SYNC_API_KEY) {
      return NextResponse.json(
        { success: false, message: 'Invalid API key' },
        { status: 401 }
      );
    }

    // Fetch all products from WooCommerce
    const products = await fetchAllProducts();

    // If no products were found, return early
    if (products.length === 0) {
      console.log('No products found in WooCommerce');

      return NextResponse.json({
        success: true,
        message: 'No products found in WooCommerce',
        timestamp: new Date().toISOString()
      });
    }

    console.log(`Processing ${products.length} products...`);

    // Process each product
    const results = [];
    const batchSize = 10; // Process 10 products at a time to avoid timeouts
    
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      console.log(`Processing batch ${i / batchSize + 1} of ${Math.ceil(products.length / batchSize)} (${batch.length} products)...`);
      
      for (const product of batch) {
        try {
          // Skip products with status other than 'publish'
          if (product.status !== 'publish') {
            console.log(`Skipping product ${product.id} (${product.name}) with status ${product.status}`);
            continue;
          }
          
          // Fetch variations for this product
          const variations = await fetchVariationsFromWooCommerce(product.id);

          // Update or create the product in Typesense
          const result = await updateOrCreateProductInTypesense(product, variations);

          results.push({
            id: product.id,
            name: product.name,
            variations_count: variations.length,
            is_featured: product.featured || false,
            image_updated: true,
            price_updated: true,
            action: result.action,
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
    }

    const syncEndTime = Date.now();
    const syncDuration = syncEndTime - syncStartTime;

    console.log(`=== SYNC ALL PRODUCTS COMPLETED in ${syncDuration}ms ===`);
    console.log('Products processed:', results.length);
    console.log('Successful updates:', results.filter(r => r.success).length);
    console.log('Failed updates:', results.filter(r => !r.success).length);
    console.log('Created products:', results.filter(r => r.action === 'created').length);
    console.log('Updated products:', results.filter(r => r.action === 'updated').length);
    console.log('Featured products:', results.filter(r => r.is_featured).length);

    return NextResponse.json({
      success: true,
      message: `Synced ${results.filter(r => r.success).length} of ${results.length} products in ${syncDuration}ms`,
      results,
      timestamp: new Date().toISOString(),
      duration: syncDuration,
      stats: {
        total: results.length,
        success: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        created: results.filter(r => r.action === 'created').length,
        updated: results.filter(r => r.action === 'updated').length,
        featured: results.filter(r => r.is_featured).length
      }
    });
  } catch (error) {
    console.error('Error syncing all products:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Error syncing all products',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
