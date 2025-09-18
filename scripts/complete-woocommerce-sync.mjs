// scripts/complete-woocommerce-sync.mjs
import dotenv from 'dotenv';
import Typesense from 'typesense';
import fs from 'fs';
import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';
import path from 'path';

// Load environment variables
dotenv.config();

// Logging setup
const LOG_FILE = './woocommerce-sync.log';
fs.writeFileSync(LOG_FILE, `WooCommerce to Typesense Sync - ${new Date().toISOString()}\n\n`);

const logger = {
  log: (...args) => {
    const message = args.join(' ');
    console.log(message);
    fs.appendFileSync(LOG_FILE, message + '\n');
  },
  error: (...args) => {
    const message = `ERROR: ${args.join(' ')}`;
    console.error(message);
    fs.appendFileSync(LOG_FILE, message + '\n');
  },
  section: (title) => {
    const divider = '='.repeat(80);
    const message = `\n${divider}\n${title}\n${divider}`;
    console.log(message);
    fs.appendFileSync(LOG_FILE, message + '\n');
  },
};

// Configuration
const BATCH_SIZE = 10; // Number of products to process at once
const CLEAR_TYPESENSE = true; // Set to true to clear Typesense collection first

// Initialize WooCommerce API
const WooCommerce = new WooCommerceRestApi.default({
  url: process.env.NEXT_PUBLIC_WORDPRESS_URL,
  consumerKey: process.env.WC_CONSUMER_KEY,
  consumerSecret: process.env.WC_CONSUMER_SECRET,
  version: 'wc/v3',
  queryStringAuth: true,
});

// Initialize Typesense client
const typesenseClient = new Typesense.Client({
  nodes: [
    {
      host: process.env.NEXT_PUBLIC_TYPESENSE_HOST,
      port: parseInt(process.env.NEXT_PUBLIC_TYPESENSE_PORT),
      protocol: process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL,
    },
  ],
  apiKey: process.env.NEXT_PUBLIC_TYPESENSE_ADMIN_API_KEY,
  connectionTimeoutSeconds: 10,
});

// Check if Typesense collection exists
async function checkCollection() {
  try {
    const collection = await typesenseClient.collections('products').retrieve();
    logger.log(`Typesense collection 'products' exists with ${collection.num_documents} documents`);
    return true;
  } catch (error) {
    if (error.httpStatus === 404) {
      logger.log("Typesense collection 'products' does not exist");
      return false;
    }
    throw error;
  }
}

// Create Typesense collection if it doesn't exist
async function createCollection() {
  logger.section("Creating Typesense Collection");
  
  const collectionSchema = {
    name: 'products',
    enable_nested_fields: true,
    fields: [
      { name: 'id', type: 'string', facet: false },
      { name: 'name', type: 'string', facet: false },
      { name: 'slug', type: 'string', facet: false },
      { name: 'type', type: 'string', facet: true },
      { name: 'status', type: 'string', facet: true },
      { name: 'featured', type: 'bool', facet: true },
      { name: 'catalog_visibility', type: 'string', facet: true },
      { name: 'description', type: 'string', facet: false },
      { name: 'short_description', type: 'string', facet: false },
      { name: 'price', type: 'float', facet: true },
      { name: 'regular_price', type: 'float', facet: true },
      { name: 'sale_price', type: 'float', facet: true, optional: true },
      { name: 'on_sale', type: 'bool', facet: true },
      { name: 'stock_status', type: 'string', facet: true },
      { name: 'stock_quantity', type: 'int32', facet: true, optional: true },
      { name: 'categories', type: 'string[]', facet: true, optional: true },
      { name: 'tags', type: 'string[]', facet: true, optional: true },
      { name: 'brand', type: 'string', facet: true, optional: true },
      { name: 'image_url', type: 'string', facet: false, optional: true },
      { name: 'image_alt', type: 'string', facet: false, optional: true },
      { name: 'gallery_images', type: 'string[]', facet: false, optional: true },
      { name: 'attributes_json', type: 'string', facet: false, optional: true },
      { name: 'variations_json', type: 'string', facet: false, optional: true },
      { name: 'colors', type: 'string[]', facet: true, optional: true },
      { name: 'sizes', type: 'string[]', facet: true, optional: true },
      // Using nested objects for direct access
      { name: 'attributes', type: 'object[]', optional: true },
      { name: 'variations', type: 'object[]', optional: true }
    ],
    default_sorting_field: 'price',
  };
  
  try {
    await typesenseClient.collections().create(collectionSchema);
    logger.log("Successfully created 'products' collection in Typesense");
    return true;
  } catch (error) {
    if (error.httpStatus === 409) {
      logger.log("Collection already exists");
      return true;
    }
    logger.error("Failed to create collection:", error);
    return false;
  }
}

// Clear existing data from Typesense collection
async function clearCollection() {
  if (!CLEAR_TYPESENSE) {
    logger.log("Skipping collection clear (CLEAR_TYPESENSE is false)");
    return;
  }
  
  logger.section("Clearing Typesense Collection");
  
  try {
    await typesenseClient.collections('products').delete();
    logger.log("Successfully deleted 'products' collection");
    
    // Recreate the collection
    await createCollection();
    
  } catch (error) {
    if (error.httpStatus === 404) {
      logger.log("Collection doesn't exist, no need to clear");
      await createCollection();
    } else {
      logger.error("Failed to clear collection:", error);
      throw error;
    }
  }
}

// Fetch all products from WooCommerce
async function fetchAllProducts() {
  logger.section("Fetching Products from WooCommerce");
  
  let page = 1;
  let allProducts = [];
  let hasMoreProducts = true;
  
  while (hasMoreProducts) {
    try {
      logger.log(`Fetching page ${page}...`);
      
      const response = await WooCommerce.get('products', {
        per_page: 100,
        page: page,
        status: 'publish',
      });
      
      const products = response.data;
      
      if (products.length === 0) {
        hasMoreProducts = false;
        break;
      }
      
      allProducts = allProducts.concat(products);
      logger.log(`Fetched ${products.length} products (total so far: ${allProducts.length})`);
      
      page++;
      
      // Check if we've reached the last page
      if (products.length < 100) {
        hasMoreProducts = false;
      }
      
    } catch (error) {
      logger.error(`Failed to fetch products from page ${page}:`, error.message);
      throw error;
    }
  }
  
  logger.log(`Successfully fetched ${allProducts.length} products from WooCommerce`);
  return allProducts;
}

// Fetch variations for a product
async function fetchProductVariations(productId) {
  try {
    const response = await WooCommerce.get(`products/${productId}/variations`, {
      per_page: 100,
    });
    
    return response.data;
  } catch (error) {
    logger.error(`Failed to fetch variations for product ${productId}:`, error.message);
    return [];
  }
}

// Transform WooCommerce product to Typesense format
function transformProduct(product, variations = []) {
  // Extract categories
  const categories = product.categories?.map(cat => cat.name) || [];
  
  // Extract tags
  const tags = product.tags?.map(tag => tag.name) || [];
  
  // Extract gallery images
  const galleryImages = product.images
    ?.filter((img, index) => index > 0) // Skip first image (it's the featured image)
    .map(img => img.src) || [];
  
  // Get featured image
  const featuredImage = product.images?.length > 0 ? product.images[0] : null;
  
  // Extract colors and sizes
  let colors = [];
  let sizes = [];
  
  // Process attributes for colors and sizes
  if (product.attributes && product.attributes.length > 0) {
    for (const attr of product.attributes) {
      if (attr.name.toLowerCase() === 'color') {
        colors = attr.options || [];
      } else if (attr.name.toLowerCase() === 'size') {
        sizes = attr.options || [];
      }
    }
  }
  
  // Normalize attributes for storage
  const attributesJson = JSON.stringify(product.attributes || []);
  
  // Prepare variations data
  const processedVariations = variations.map(variation => ({
    id: variation.id.toString(),
    attributes: variation.attributes,
    price: parseFloat(variation.price || product.price || 0),
    regular_price: parseFloat(variation.regular_price || product.regular_price || 0),
    sale_price: variation.sale_price ? parseFloat(variation.sale_price) : null,
    stock_status: variation.stock_status || 'outofstock',
    stock_quantity: variation.stock_quantity || 0,
  }));
  
  // Store variations as JSON
  const variationsJson = JSON.stringify(processedVariations);
  
  // Create the transformed product object
  return {
    id: product.id.toString(),
    name: product.name,
    slug: product.slug,
    type: product.type,
    status: product.status,
    featured: product.featured,
    catalog_visibility: product.catalog_visibility,
    description: product.description,
    short_description: product.short_description,
    price: parseFloat(product.price || 0),
    regular_price: parseFloat(product.regular_price || 0),
    sale_price: product.sale_price ? parseFloat(product.sale_price) : null,
    on_sale: product.on_sale,
    stock_status: product.stock_status,
    stock_quantity: product.stock_quantity || 0,
    categories,
    tags,
    brand: '', // Default empty, can be populated if needed
    image_url: featuredImage?.src || '',
    image_alt: featuredImage?.alt || '',
    gallery_images: galleryImages,
    attributes_json: attributesJson,
    variations_json: variationsJson,
    colors,
    sizes,
    // Also include the structured arrays for direct access
    attributes: product.attributes || [],
    variations: processedVariations,
  };
}

// Index products in Typesense
async function indexProducts(products) {
  logger.section("Indexing Products in Typesense");
  
  let successCount = 0;
  let errorCount = 0;
  
  // Process products in batches
  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    
    logger.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(products.length / BATCH_SIZE)}`);
    
    // Process each product in the batch
    for (const product of batch) {
      try {
        // Check if this is a variable product
        const isVariable = product.type === 'variable';
        
        // Fetch variations if this is a variable product
        let variations = [];
        if (isVariable) {
          logger.log(`Fetching variations for variable product ${product.id}: ${product.name}`);
          variations = await fetchProductVariations(product.id);
          logger.log(`Found ${variations.length} variations for product ${product.id}`);
        }
        
        // Transform the product
        const transformedProduct = transformProduct(product, variations);
        
        // Index in Typesense
        await typesenseClient.collections('products').documents().upsert(transformedProduct);
        
        successCount++;
        logger.log(`✅ Indexed product: ${product.id} - ${product.name}`);
        
      } catch (error) {
        errorCount++;
        logger.error(`Failed to index product ${product.id} - ${product.name}:`, error.message);
      }
    }
  }
  
  logger.log(`Indexing complete. Success: ${successCount}, Errors: ${errorCount}`);
  return { successCount, errorCount };
}

// Main function
async function main() {
  logger.section("Starting WooCommerce to Typesense Sync");
  
  try {
    // Check and prepare Typesense collection
    const collectionExists = await checkCollection();
    
    if (!collectionExists) {
      await createCollection();
    } else if (CLEAR_TYPESENSE) {
      await clearCollection();
    }
    
    // Fetch all products from WooCommerce
    const products = await fetchAllProducts();
    
    // Index products in Typesense
    const { successCount, errorCount } = await indexProducts(products);
    
    logger.section("Sync Complete");
    logger.log(`Total products processed: ${products.length}`);
    logger.log(`Successfully indexed: ${successCount}`);
    logger.log(`Failed to index: ${errorCount}`);
    
  } catch (error) {
    logger.error("Sync failed:", error.message);
  }
}

// Script execution
main().catch(error => {
  logger.error("Unhandled error:", error);
  process.exit(1);
});
