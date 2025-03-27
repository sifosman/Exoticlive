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

function transformProduct(product) {
  // Extract categories
  const categories = product.categories ? 
    product.categories.map(cat => cat.name) : [];

  // Extract tags
  const tags = product.tags ?
    product.tags.map(tag => tag.name) : [];
    
  // Extract attributes for faceting
  const attributes = product.attributes || [];
  
  // Extract colors and sizes specifically for faceting
  const colors = [];
  const sizes = [];
  
  attributes.forEach(attr => {
    if (attr.name && attr.name.toLowerCase() === 'color') {
      colors.push(...attr.options);
    }
    if (attr.name && attr.name.toLowerCase() === 'size') {
      sizes.push(...attr.options);
    }
  });
  
  // Calculate dates as timestamps for sorting
  const dateCreated = product.date_created ? 
    new Date(product.date_created).getTime() : 
    Date.now();
  
  // Check if product is on sale
  const isOnSale = product.sale_price && 
    parseFloat(product.sale_price) > 0 && 
    parseFloat(product.sale_price) < parseFloat(product.regular_price);
  
  // Get gallery images
  const galleryImages = product.images && product.images.length > 1 ?
    product.images.slice(1).map(img => img.src) : [];
    
  // Extract variation information
  const variationsCount = product.variations ? product.variations.length : 0;
  const inStockVariationsCount = 0; // Would need additional API calls to determine this
    
  return {
    id: product.id.toString(),
    name: product.name,
    description: product.description ? 
      product.description.replace(/<[^>]*>?/gm, '') : '', // Strip HTML
    price: parseFloat(product.price || 0),
    sale_price: product.sale_price ? parseFloat(product.sale_price) : null,
    regular_price: product.regular_price ? parseFloat(product.regular_price) : null,
    categories,
    tags,
    attributes,
    colors,
    sizes,
    image_url: product.images && product.images.length > 0 ? 
      product.images[0].src : '',
    gallery_images: galleryImages,
    slug: product.slug,
    stock_status: product.stock_status || 'outofstock',
    stock_quantity: product.stock_quantity || 0,
    variations_count: variationsCount,
    in_stock_variations_count: inStockVariationsCount,
    is_featured: !!product.featured,
    is_on_sale: isOnSale,
    average_rating: parseFloat(product.average_rating || 0),
    date_created: dateCreated
  };
}

async function syncProducts() {
  try {
    // Check if the collection exists
    const collectionExists = await client.collections('products').exists();
    if (!collectionExists) {
      console.error('❌ Products collection not found in Typesense Cloud. Please run setup-typesense-cloud.mjs first.');
      return;
    }
    
    // Fetch all products from WooCommerce
    console.log('🔄 Fetching products from WooCommerce...');
    const products = await fetchAllProducts();
    
    if (products.length === 0) {
      console.log('⚠️ No products found to sync');
      return;
    }
    
    // Transform products for Typesense
    console.log('🔄 Transforming products for Typesense...');
    const typesenseProducts = products.map(transformProduct);
    
    // Import products to Typesense in batches
    const batchSize = 100;
    let imported = 0;
    
    for (let i = 0; i < typesenseProducts.length; i += batchSize) {
      const batch = typesenseProducts.slice(i, i + batchSize);
      console.log(`🔄 Importing batch ${i/batchSize + 1}/${Math.ceil(typesenseProducts.length/batchSize)}...`);
      
      await client.collections('products').documents().import(batch, { action: 'upsert' });
      imported += batch.length;
      console.log(`✅ Imported ${imported}/${typesenseProducts.length} products`);
    }
    
    console.log(`🎉 Successfully synced ${imported} products to Typesense Cloud`);
  } catch (error) {
    console.error('❌ Error syncing products:', error.message);
    if (error.stack) console.error(error.stack);
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

// Run sync
syncProducts().then(() => {
  console.log('✅ Product sync completed');
}).catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});
