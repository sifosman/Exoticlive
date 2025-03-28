// scripts/sync-products-to-typesense-cloud.mjs
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Typesense from 'typesense';
import WooCommerceAPI from '@woocommerce/woocommerce-rest-api';

// Get dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.join(__dirname, '..', '.env') });

// Validate required environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_WORDPRESS_URL', 
  'WC_CONSUMER_KEY', 
  'WC_CONSUMER_SECRET',
  'TYPESENSE_CLOUD_HOST',
  'TYPESENSE_CLOUD_API_KEY'
];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  process.exit(1);
}

// Initialize WooCommerce API
const WooCommerce = new WooCommerceAPI.default({
  url: process.env.NEXT_PUBLIC_WORDPRESS_URL,
  consumerKey: process.env.WC_CONSUMER_KEY,
  consumerSecret: process.env.WC_CONSUMER_SECRET,
  version: 'wc/v3'
});

// Helper functions for safe parsing
const safeParseFloat = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
};

const safeParseInt = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  const num = parseInt(value, 10);
  return isNaN(num) ? 0 : num;
};

const safeBool = (value) => {
  if (value === true || value === 'true' || value === 1) return true;
  return false;
};

// Safe array mapping
const safeMap = (arr, mapFn) => {
  if (!arr || !Array.isArray(arr)) return [];
  return arr.map(mapFn);
};

async function fetchAllProducts() {
  let page = 1;
  const perPage = 100;
  let allProducts = [];
  
  while (true) {
    try {
      console.log(`📦 Fetching products page ${page}...`);
      const response = await WooCommerce.get('products', {
        per_page: perPage,
        page: page,
        status: 'publish'
      });
      
      const products = response.data;
      if (products.length === 0) break;
      
      allProducts = allProducts.concat(products);
      console.log(`✅ Fetched ${products.length} products`);
      
      if (products.length < perPage) break;
      page++;
    } catch (error) {
      console.error('❌ Error fetching products:', error.message);
      break;
    }
  }
  
  console.log(`🔢 Total products fetched: ${allProducts.length}`);
  return allProducts;
}

// Fetch variations for a specific product
async function fetchProductVariations(productId) {
  try {
    console.log(`📦 Fetching variations for product ${productId}...`);
    const response = await WooCommerce.get(`products/${productId}/variations`, {
      per_page: 100
    });
    
    const variations = response.data;
    console.log(`✅ Fetched ${variations.length} variations for product ${productId}`);
    return variations;
  } catch (error) {
    console.error(`❌ Error fetching variations for product ${productId}:`, error.message);
    return [];
  }
}

// Transform a product variation from WooCommerce format to Typesense format
function transformVariation(variation, parentProduct) {
  // Extract variation attributes
  const attributes = {};
  if (variation.attributes && Array.isArray(variation.attributes)) {
    variation.attributes.forEach(attr => {
      if (attr.name && attr.option) {
        // Store both raw and normalized attribute names
        const normalizedName = attr.name.replace(/^pa_/i, '').toLowerCase();
        attributes[attr.name] = attr.option;
        attributes[normalizedName] = attr.option;
      }
    });
  }

  // Get stock status directly from WooCommerce, preserve exact format
  const stockStatus = variation.stock_status || 'outofstock';
  
  // Get exact stock quantity from WooCommerce
  // Important: Don't convert empty/null to 0 if manage_stock is false
  const manageStock = safeBool(variation.manage_stock);
  let stockQuantity = null;
  
  if (manageStock) {
    // Only use the exact number from WooCommerce when manage_stock is true
    stockQuantity = variation.stock_quantity !== undefined && variation.stock_quantity !== null 
      ? parseInt(variation.stock_quantity, 10) 
      : 0;  // Default to 0 only when manage_stock is true but no quantity is provided
  }

  // Debug logging for stock data
  console.log(`  - Variation ${variation.id} stock data:`, {
    status: stockStatus,
    quantity: stockQuantity,
    manage_stock: manageStock
  });

  return {
    id: variation.id.toString(),
    parent_id: parentProduct.id.toString(),
    variation_id: variation.id.toString(),
    name: variation.name || parentProduct.name,
    sku: variation.sku || '',
    price: safeParseFloat(variation.price || 0),
    regular_price: safeParseFloat(variation.regular_price || variation.price || 0),
    sale_price: variation.sale_price ? safeParseFloat(variation.sale_price) : null,
    stock_status: stockStatus,
    stock_quantity: stockQuantity,
    manage_stock: manageStock,
    attributes: attributes,
    // Store raw stock data for debugging
    _raw_stock_data: {
      status: variation.stock_status,
      quantity: variation.stock_quantity,
      manage_stock: variation.manage_stock
    }
  };
}

// Transform a product from WooCommerce format to Typesense format
function transformProduct(product, variations = []) {
  // Extract basic product info with safety checks
  const name = product.name || 'Unknown Product';
  const description = product.description || '';
  
  // Safe price calculations
  const regular_price = safeParseFloat(product.regular_price || product.price || 0);
  const sale_price = product.sale_price ? safeParseFloat(product.sale_price) : null;
  const price = sale_price !== null ? sale_price : regular_price;
  
  // Safe category and tag extraction
  const categories = safeMap(product.categories || [], cat => cat.name || '');
  const tags = safeMap(product.tags || [], tag => tag.name || '');
  
  // Extract and normalize product attributes
  const attributes = [];
  const attributeMap = {};
  
  if (product.attributes && Array.isArray(product.attributes)) {
    product.attributes.forEach(attr => {
      if (!attr) return;
      
      // Store normalized attribute name
      const name = attr.name || '';
      const normalizedName = name.replace(/^pa_/i, '').toLowerCase();
      
      // Store options array
      const options = Array.isArray(attr.options) ? attr.options : [];
      
      // Add to attributes array
      attributes.push({
        name: name,
        normalizedName: normalizedName,
        options: options,
        variation: attr.variation || false
      });
      
      // Special handling for color and size
      if (normalizedName === 'color' || normalizedName === 'colour') {
        attributeMap['color'] = options;
      } else if (normalizedName === 'size') {
        attributeMap['size'] = options;
      }
      
      // Store all attribute options in the map for easy access
      attributeMap[normalizedName] = options;
    });
  }
  
  // Format variations data
  const formattedVariations = variations.map(variation => 
    transformVariation(variation, product)
  );
  
  // Safe image extraction
  const image_url = product.images && product.images.length > 0 ? 
    product.images[0].src || '' : '';
  
  const gallery_images = product.images && product.images.length > 1 ?
    product.images.slice(1).map(img => img.src || '') : [];
  
  // Boolean conversions
  const is_featured = safeBool(product.featured);
  const is_on_sale = safeBool(product.on_sale);
  
  // Return a clean object
  return {
    id: product.id.toString(),
    name,
    description,
    price,
    sale_price,
    regular_price,
    categories,
    tags,
    colors: attributeMap['color'] || [],
    sizes: attributeMap['size'] || [],
    image_url,
    gallery_images,
    slug: product.slug || '',
    stock_status: product.stock_status || 'outofstock',
    stock_quantity: safeParseInt(product.stock_quantity),
    manage_stock: safeBool(product.manage_stock),
    is_featured,
    is_on_sale,
    average_rating: safeParseFloat(product.average_rating),
    attributes: attributes,
    variations: formattedVariations,
    product_type: product.type || 'simple'
  };
}

async function syncProducts() {
  try {
    console.log('🔄 Fetching products from WooCommerce...');
    const products = await fetchAllProducts();
    console.log(`📊 Total products fetched: ${products.length}`);
    
    if (products.length === 0) {
      console.log('❌ No products fetched from WooCommerce!');
      return;
    }
    
    // Process products one by one instead of bulk import
    console.log('🔄 Processing products one by one...');
    let successCount = 0;
    let failureCount = 0;
    let variationCount = 0;
    
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      try {
        // Fetch variations if this is a variable product
        let variations = [];
        if (product.type === 'variable') {
          variations = await fetchProductVariations(product.id);
          variationCount += variations.length;
        }
        
        // Transform WooCommerce product to Typesense format
        const typesenseProduct = transformProduct(product, variations);
        
        // Add or update product in Typesense
        await client.collections('products').documents().upsert(typesenseProduct);
        
        successCount++;
        if (successCount % 10 === 0 || i === products.length - 1) {
          console.log(`✅ Processed ${successCount}/${products.length} products successfully`);
        }
      } catch (error) {
        failureCount++;
        console.error(`❌ Error processing product ${product.id} (${product.name}):`, error.message);
        
        // Only log detailed error for first few failures
        if (failureCount <= 3) {
          console.error('Product data:', JSON.stringify(product).substring(0, 300) + '...');
        }
      }
    }
    
    console.log(`🎉 Sync complete:`);
    console.log(`✅ ${successCount} products imported successfully`);
    console.log(`✅ ${variationCount} product variations processed`);
    console.log(`❌ ${failureCount} products failed to import`);
  } catch (error) {
    console.error('❌ Error syncing products:', error.message);
  }
}

// Initialize Typesense Cloud client
const client = new Typesense.Client({
  nodes: [{
    host: process.env.TYPESENSE_CLOUD_HOST,
    port: 443,
    protocol: 'https'
  }],
  apiKey: process.env.TYPESENSE_CLOUD_API_KEY,
  connectionTimeoutSeconds: 10
});

// Create or update Typesense schema
async function setupTypesenseSchema() {
  try {
    // Check if collection exists first
    const collections = await client.collections().retrieve();
    const exists = collections.some(collection => collection.name === 'products');
    
    if (exists) {
      console.log('✅ Products collection already exists in Typesense');
      return;
    }
    
    // Create the collection if it doesn't exist
    const schema = {
      name: 'products',
      fields: [
        { name: 'name', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'slug', type: 'string' },
        { name: 'categories', type: 'string[]' },
        { name: 'tags', type: 'string[]' },
        { name: 'colors', type: 'string[]' },
        { name: 'sizes', type: 'string[]' },
        { name: 'price', type: 'float' },
        { name: 'sale_price', type: 'float', optional: true },
        { name: 'regular_price', type: 'float' },
        { name: 'stock_status', type: 'string' },
        { name: 'stock_quantity', type: 'int32', optional: true },
        { name: 'is_featured', type: 'bool' },
        { name: 'is_on_sale', type: 'bool' },
        { name: 'average_rating', type: 'float' },
        { name: 'product_type', type: 'string', optional: true },
      ],
      default_sorting_field: 'average_rating'
    };
    
    await client.collections().create(schema);
    console.log('✅ Created products collection in Typesense');
  } catch (error) {
    console.error('❌ Error setting up Typesense schema:', error.message);
  }
}

async function main() {
  try {
    await setupTypesenseSchema();
    await syncProducts();
  } catch (error) {
    console.error('❌ Sync error:', error);
  }
}

main();
