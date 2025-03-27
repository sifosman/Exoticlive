// scripts/sync-products-to-typesense.mjs
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Typesense from 'typesense';
import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';

// Get dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.join(__dirname, '..', '.env') });

// Initialize WooCommerce API
const WooCommerce = new WooCommerceRestApi({
  url: process.env.NEXT_PUBLIC_WORDPRESS_URL,
  consumerKey: process.env.WC_CONSUMER_KEY,
  consumerSecret: process.env.WC_CONSUMER_SECRET,
  version: 'wc/v3'
});

// Initialize Typesense client
const client = new Typesense.Client({
  nodes: [{
    host: process.env.NEXT_PUBLIC_TYPESENSE_HOST,
    port: Number(process.env.NEXT_PUBLIC_TYPESENSE_PORT),
    protocol: process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL || 'http'
  }],
  apiKey: process.env.NEXT_PUBLIC_TYPESENSE_SEARCH_API_KEY,
  connectionTimeoutSeconds: 5
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
      page++;
      
      if (products.length < perPage) break;
    } catch (error) {
      console.error('❌ Error fetching products:', error.message);
      throw error;
    }
  }
  
  return allProducts;
}

function transformProduct(product) {
  // Extract categories
  const categories = product.categories?.map(cat => cat.name) || [];
  
  return {
    id: product.id.toString(),
    name: product.name,
    description: product.description,
    short_description: product.short_description,
    price: parseFloat(product.price || '0'),
    sale_price: product.sale_price ? parseFloat(product.sale_price) : null,
    regular_price: parseFloat(product.regular_price || '0'),
    stock_quantity: product.stock_quantity,
    stock_status: product.stock_status,
    categories: categories, // Add categories array
    image_url: product.images[0]?.src || '',
    image_alt: product.images[0]?.alt || '',
    slug: product.slug,
    gallery_images: product.images.map(img => img.src),
    attributes: product.attributes?.map(attr => attr.name) || []
  };
}

async function syncProducts() {
  try {
    console.log('🔄 Starting product sync...');
    
    // Fetch all products from WooCommerce
    const products = await fetchAllProducts();
    console.log(`✅ Fetched ${products.length} products from WooCommerce`);
    
    // Transform products for Typesense
    const typesenseDocuments = products.map(transformProduct);
    
    // Import to Typesense
    console.log('📥 Importing products to Typesense...');
    const importResponse = await client
      .collections('products')
      .documents()
      .import(typesenseDocuments);
    
    console.log('✅ Import complete!');
    console.log('📊 Import results:', {
      success: importResponse.filter(r => r.success).length,
      failed: importResponse.filter(r => !r.success).length
    });
    
    // Log any errors
    const errors = importResponse.filter(r => !r.success);
    if (errors.length > 0) {
      console.log('⚠️ Import errors:', errors);
    }
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

// Run sync
syncProducts().catch(console.error);
