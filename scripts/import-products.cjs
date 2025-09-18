const dotenv = require('dotenv');
const WooCommerceRestApi = require('@woocommerce/woocommerce-rest-api').default;
const Typesense = require('typesense');

// Load environment variables
dotenv.config();

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
  connectionTimeoutSeconds: 30
});

// Helper function to delay execution
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchAllProducts() {
  let page = 1;
  const perPage = 20; // Smaller page size
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
      console.log(`✅ Fetched ${products.length} products from page ${page}`);
      
      page++;
      if (products.length < perPage) break;
      
      // Add a delay between requests
      await delay(1000);
      
    } catch (error) {
      console.error('❌ Error fetching products:', error.message);
      // Wait and retry once on error
      console.log('Retrying after 5 seconds...');
      await delay(5000);
      try {
        const retryResponse = await WooCommerce.get('products', {
          per_page: perPage,
          page: page,
          status: 'publish'
        });
        const retryProducts = retryResponse.data;
        if (retryProducts.length === 0) break;
        
        allProducts = allProducts.concat(retryProducts);
        console.log(`✅ Retry successful: Fetched ${retryProducts.length} products from page ${page}`);
        
        page++;
        if (retryProducts.length < perPage) break;
      } catch (retryError) {
        console.error('❌ Retry failed:', retryError.message);
        throw retryError;
      }
    }
  }
  
  return allProducts;
}

function transformProduct(product) {
  // Extract categories
  const categories = product.categories?.map(cat => cat.name) || [];
  
  // Create Typesense document
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
    attributes: product.attributes?.map(attr => attr.name) || []
  };
}

async function importProducts() {
  try {
    console.log('🔄 Starting product import...');
    
    // Fetch products from WooCommerce
    const products = await fetchAllProducts();
    console.log(`\n✅ Fetched ${products.length} total products from WooCommerce`);
    
    // Transform products for Typesense
    console.log('\n🔄 Transforming products for Typesense...');
    const typesenseDocuments = products.map(transformProduct);
    
    // Import to Typesense in smaller batches
    console.log('\n📥 Importing products to Typesense...');
    const batchSize = 20;
    let importedCount = 0;
    let successCount = 0;
    let failureCount = 0;
    
    for (let i = 0; i < typesenseDocuments.length; i += batchSize) {
      const batch = typesenseDocuments.slice(i, i + batchSize);
      try {
        console.log(`Importing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(typesenseDocuments.length / batchSize)}...`);
        const response = await client.collections('products').documents().import(batch);
        
        const batchSuccesses = response.filter(r => r.success).length;
        const batchFailures = response.filter(r => !r.success).length;
        
        successCount += batchSuccesses;
        failureCount += batchFailures;
        importedCount += batch.length;
        
        console.log(`Batch results - Success: ${batchSuccesses}, Failed: ${batchFailures}`);
        
        // Add a delay between batches
        if (i + batchSize < typesenseDocuments.length) {
          await delay(1000);
        }
      } catch (error) {
        console.error(`Batch import failed:`, error.message);
        failureCount += batch.length;
      }
    }
    
    console.log('\n📊 Final Import Results:');
    console.log(`✅ Successfully imported: ${successCount} products`);
    console.log(`❌ Failed to import: ${failureCount} products`);
    console.log(`📦 Total processed: ${importedCount} products`);
    
  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response);
    }
    process.exit(1);
  }
}

// Run import
importProducts().catch(console.error);
