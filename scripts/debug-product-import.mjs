// scripts/debug-product-import.mjs
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

// Function to fetch a single product from WooCommerce
async function fetchProduct(productId) {
  try {
    console.log(`🔄 Fetching product ID ${productId} from WooCommerce...`);
    const response = await WooCommerce.get(`products/${productId}`);
    return response.data;
  } catch (error) {
    console.error(`❌ Error fetching product: ${error.message}`);
    throw error;
  }
}

// Debug transformation function - this is a simplified version 
function transformProduct(product) {
  // Safe parsing functions
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
  
  // Safe extraction of colors and sizes
  let colors = [];
  let sizes = [];
  
  if (product.attributes && Array.isArray(product.attributes)) {
    product.attributes.forEach(attr => {
      if (!attr) return;
      
      const name = (attr.name || '').toLowerCase();
      if (name === 'color' || name === 'colour') {
        colors = Array.isArray(attr.options) ? attr.options : [];
      } else if (name === 'size') {
        sizes = Array.isArray(attr.options) ? attr.options : [];
      }
    });
  }
  
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
    colors,
    sizes,
    image_url,
    gallery_images,
    slug: product.slug || '',
    stock_status: product.stock_status || 'outofstock',
    stock_quantity: safeParseInt(product.stock_quantity),
    is_featured,
    is_on_sale,
    average_rating: safeParseFloat(product.average_rating)
  };
}

async function debugImport(productId) {
  try {
    // 1. Fetch product from WooCommerce
    const product = await fetchProduct(productId);
    console.log('\n📦 Raw WooCommerce product:');
    console.log(JSON.stringify(product, null, 2).substring(0, 500) + '...');
    
    // 2. Transform product
    console.log('\n🔄 Transforming product...');
    const typesenseProduct = transformProduct(product);
    console.log('📋 Transformed product:');
    console.log(JSON.stringify(typesenseProduct, null, 2));
    
    // 3. Try to add to Typesense
    console.log('\n📤 Attempting to add to Typesense...');
    try {
      const result = await client.collections('products').documents().create(typesenseProduct);
      console.log('✅ Success! Product added to Typesense:');
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('❌ Error adding to Typesense:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Debug process failed:', error);
  }
}

// Get product ID from command line or use default
const productId = process.argv[2] || '11222';  // Use first product ID by default
debugImport(productId);
