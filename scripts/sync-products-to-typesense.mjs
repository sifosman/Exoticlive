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
  apiKey: process.env.NEXT_PUBLIC_TYPESENSE_ADMIN_API_KEY,
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

// Function to fetch variations for a variable product
async function fetchProductVariations(productId) {
  try {
    console.log(`🔄 Fetching variations for product ID ${productId}...`);
    const response = await WooCommerce.get(`products/${productId}/variations`, {
      per_page: 100
    });
    
    return response.data;
  } catch (error) {
    console.error(`❌ Error fetching variations for product ${productId}:`, error.message);
    return [];
  }
}

function transformProduct(product, variations = []) {
  // Extract categories
  const categories = product.categories?.map(cat => cat.name) || [];
  
  // Process attributes properly (keeping the full structure, not just names)
  const attributes = product.attributes?.map(attr => ({
    id: attr.id,
    name: attr.name,
    position: attr.position,
    visible: attr.visible,
    variation: attr.variation,
    options: attr.options || []
  })) || [];
  
  // Process variations properly
  const processedVariations = variations.map(variation => {
    // Map variation attributes
    const variationAttributes = variation.attributes.map(attr => ({
      name: attr.name,
      option: attr.option
    }));
    
    return {
      id: variation.id.toString(),
      price: parseFloat(variation.price || '0'),
      regular_price: parseFloat(variation.regular_price || '0'),
      sale_price: variation.sale_price ? parseFloat(variation.sale_price) : null,
      stock_status: variation.stock_status || 'outofstock',
      stock_quantity: variation.stock_quantity || 0,
      attributes: variationAttributes
    };
  });
  
  // Create the Typesense document
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
    categories: categories,
    image_url: product.images[0]?.src || '',
    image_alt: product.images[0]?.alt || '',
    slug: product.slug,
    gallery_images: product.images.map(img => img.src),
    // Add complete attribute and variation data
    attributes: attributes,
    attributes_json: JSON.stringify(attributes),
    variations: processedVariations,
    variations_json: JSON.stringify(processedVariations),
    product_type: product.type
  };
}

async function syncProducts() {
  try {
    console.log('🔄 Starting product sync...');
    
    // Fetch all products from WooCommerce
    const products = await fetchAllProducts();
    console.log(`✅ Fetched ${products.length} products from WooCommerce`);
    
    // Process products with variations
    const typesenseDocuments = [];
    let processedCount = 0;
    
    for (const product of products) {
      processedCount++;
      console.log(`Processing product ${processedCount}/${products.length}: ${product.name}`);
      
      let variations = [];
      
      // Fetch variations for variable products
      if (product.type === 'variable') {
        console.log(`- Variable product detected, fetching variations...`);
        variations = await fetchProductVariations(product.id);
        console.log(`- Found ${variations.length} variations`);
      }
      
      // Transform product with variations data
      const typesenseDoc = transformProduct(product, variations);
      typesenseDocuments.push(typesenseDoc);
    }
    
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
