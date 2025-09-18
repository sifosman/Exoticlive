// scripts/test-typesense-add-product.mjs
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Typesense from 'typesense';

// Get dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.join(__dirname, '..', '.env') });

// Validate required environment variables
if (!process.env.TYPESENSE_CLOUD_HOST || !process.env.TYPESENSE_CLOUD_API_KEY) {
  console.error('❌ Missing required environment variables: TYPESENSE_CLOUD_HOST or TYPESENSE_CLOUD_API_KEY');
  process.exit(1);
}

console.log('🔑 Using Typesense host:', process.env.TYPESENSE_CLOUD_HOST);

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

// Simple test product matching the schema we created
const testProduct = {
  id: 'test123',
  name: 'Test Product',
  description: 'This is a test product to verify Typesense indexing',
  price: 99.99,
  sale_price: 79.99,
  regular_price: 99.99,
  categories: ['Test', 'Sample'],
  tags: ['test', 'sample'],
  colors: ['Red', 'Blue'],
  sizes: ['S', 'M', 'L'],
  brand: 'Test Brand',
  image_url: 'https://example.com/test.jpg',
  gallery_images: ['https://example.com/test1.jpg', 'https://example.com/test2.jpg'],
  slug: 'test-product',
  stock_status: 'instock',
  stock_quantity: 10,
  is_featured: true,
  is_on_sale: true,
  average_rating: 4.5
};

async function testAddProduct() {
  try {
    console.log('🔍 Checking if collection exists...');
    const collectionExists = await client.collections('products').retrieve()
      .then(() => true)
      .catch(() => false);
    
    if (!collectionExists) {
      console.error('❌ Collection "products" does not exist. Please run setup-typesense-cloud.mjs first.');
      process.exit(1);
    }
    
    console.log('✅ Collection exists, trying to add test product...');
    
    // First try to delete the test document if it exists
    try {
      await client.collections('products').documents('test123').delete();
      console.log('🗑️ Removed existing test product');
    } catch (error) {
      // It's okay if the document doesn't exist yet
      console.log('ℹ️ No existing test product to remove');
    }
    
    // Add the test product
    const result = await client.collections('products').documents().create(testProduct);
    console.log('✅ Successfully added test product:', result);
    
    // Verify we can search for it
    const searchResult = await client.collections('products').documents().search({
      q: 'Test Product',
      query_by: 'name',
      per_page: 1
    });
    
    console.log(`🔎 Search result found ${searchResult.found} document(s):`);
    console.log(JSON.stringify(searchResult.hits[0]?.document || {}, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error);
    if (error.importResults) {
      console.log('Import results:', error.importResults);
    }
  }
}

// Run the test
testAddProduct().catch(console.error);
