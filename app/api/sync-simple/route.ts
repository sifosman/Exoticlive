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

// Fetch recently deleted products from WooCommerce
async function fetchRecentlyDeletedProducts() {
  try {
    console.log('Fetching recently deleted products from WooCommerce...');

    if (!wcApiUrl || !wcConsumerKey || !wcConsumerSecret) {
      throw new Error('WooCommerce API credentials not configured');
    }

    // Get products deleted in the last 5 minutes
    // Note: WooCommerce doesn't have a direct API for deleted products
    // We'll use a custom endpoint or webhook for this in a production environment
    // For now, we'll check for products with 'trash' status
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    // Build the URL with query parameters for recently trashed products
    const deletedUrl = `${wcApiUrl}/wp-json/wc/v3/products?status=trash&orderby=modified&order=desc&modified_after=${fiveMinutesAgo}&per_page=20`;

    console.log(`Fetching deleted products from: ${deletedUrl}`);

    const deletedResponse = await fetch(deletedUrl, {
      headers: {
        'Authorization': getWooCommerceAuthHeader()
      }
    });

    if (!deletedResponse.ok) {
      throw new Error(`Failed to fetch deleted products: ${deletedResponse.statusText}`);
    }

    const deletedProducts = await deletedResponse.json();
    console.log(`Found ${deletedProducts.length} recently deleted products in WooCommerce`);

    return deletedProducts;
  } catch (error) {
    console.error('Error fetching deleted products from WooCommerce:', error);
    return []; // Return empty array on error to continue with other operations
  }
}

// Delete product from Typesense
async function deleteProductFromTypesense(productId: string) {
  try {
    console.log(`Deleting product ${productId} from Typesense...`);

    // Check if the product exists in Typesense
    try {
      await typesenseClient
        .collections('products')
        .documents(productId)
        .retrieve();

      // Product exists, delete it
      await typesenseClient
        .collections('products')
        .documents(productId)
        .delete();

      console.log(`Product ${productId} deleted from Typesense`);
      return true;
    } catch (error) {
      // Product doesn't exist in Typesense
      console.log(`Product ${productId} not found in Typesense, skipping deletion`);
      return false;
    }
  } catch (error) {
    console.error(`Error deleting product ${productId} from Typesense:`, error);
    throw error;
  }
}

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
async function fetchVariationsFromWooCommerce(productId: number, productType?: string) {
  try {
    // If product type is provided and it's not a variable product, return empty array
    if (productType && productType !== 'variable') {
      console.log(`Product ${productId} is not a variable product (type: ${productType}), skipping variations fetch`);
      return [];
    }

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

// Update product in Typesense
async function updateProductInTypesense(productId: string, variations: any[]) {
  try {
    console.log(`Updating product ${productId} in Typesense...`);

    // Process variations
    const processedVariations = variations && variations.length > 0 ? variations.map(variation => {
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

    // Check if the product exists in Typesense
    try {
      const product = await typesenseClient
        .collections('products')
        .documents(productId)
        .retrieve();

      console.log(`Found product in Typesense: ${product.name}`);

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
        console.log(`⭐ FEATURED PRODUCT ${productId} (${productData.name}) updated:`);
        console.log(`- Image URL: ${imageUrl}`);
        console.log(`- Price: ${newPrice}`);
        console.log(`- Regular price: ${newRegularPrice}`);
        console.log(`- Sale price: ${newSalePrice}`);
        console.log(`- On sale: ${isOnSale ? 'Yes' : 'No'}`);
      }

      // Update the product in Typesense with all data
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
        is_featured: isFeatured
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

    // Fetch recently deleted products from WooCommerce
    const deletedProducts = await fetchRecentlyDeletedProducts();

    // Process deleted products
    const deletionResults = [];
    if (deletedProducts.length > 0) {
      console.log(`Processing ${deletedProducts.length} deleted products...`);

      for (const product of deletedProducts) {
        try {
          const deleted = await deleteProductFromTypesense(product.id.toString());

          deletionResults.push({
            id: product.id,
            name: product.name,
            success: deleted
          });
        } catch (error) {
          console.error(`Error deleting product ${product.id} from Typesense:`, error);

          deletionResults.push({
            id: product.id,
            name: product.name,
            error: error instanceof Error ? error.message : String(error),
            success: false
          });
        }
      }

      console.log(`Deleted ${deletionResults.filter(r => r.success).length} of ${deletedProducts.length} products from Typesense`);
    } else {
      console.log('No deleted products to process');
    }

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
        console.log(`Processing product ${product.id} (${product.name}) of type ${product.type}`);
        const variations = await fetchVariationsFromWooCommerce(product.id, product.type);

        // Update the product in Typesense
        await updateProductInTypesense(product.id.toString(), variations);

        // Get the product data from WooCommerce to check if it's featured
        const productResponse = await fetch(`${wcApiUrl}/wp-json/wc/v3/products/${product.id}`, {
          headers: {
            'Authorization': getWooCommerceAuthHeader()
          }
        });

        const productData = await productResponse.json();
        const isFeatured = productData.featured || false;

        results.push({
          id: product.id,
          name: product.name,
          variations_count: variations.length,
          is_featured: isFeatured,
          image_updated: true, // We're always updating the image now
          price_updated: true, // We're always updating the price now
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
    console.log('Image updates:', results.filter(r => r.image_updated).length);
    console.log('Price updates:', results.filter(r => r.price_updated).length);
    console.log('Featured products updated:', results.filter(r => r.is_featured).length);

    // Log detailed information about featured products
    const featuredProducts = results.filter(r => r.is_featured && r.success);
    if (featuredProducts.length > 0) {
      console.log(`⭐ ${featuredProducts.length} FEATURED PRODUCTS UPDATED:`);
      featuredProducts.forEach(product => {
        console.log(`- ${product.name} (ID: ${product.id})`);
      });
    }

    // Prepare the response message
    let message = '';
    if (deletionResults.length > 0) {
      message += `Deleted ${deletionResults.filter(r => r.success).length} of ${deletedProducts.length} products. `;
    }
    message += `Synced ${results.filter(r => r.success).length} of ${results.length} products in ${syncDuration}ms`;

    return NextResponse.json({
      success: true,
      message,
      results,
      deletionResults,
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
