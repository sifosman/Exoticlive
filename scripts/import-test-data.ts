import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Typesense from 'typesense';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '..', '.env') });

// Create Typesense client
const client = new Typesense.Client({
  nodes: [{
    host: process.env.TYPESENSE_HOST || 'localhost',
    port: Number(process.env.TYPESENSE_PORT) || 8108,
    protocol: 'http'
  }],
  apiKey: process.env.TYPESENSE_ADMIN_API_KEY || 'xyz123',
  connectionTimeoutSeconds: 5
});

// Test data
const testProducts = [
  {
    id: '1',
    name: 'Test Product 1',
    description: 'This is a test product',
    short_description: 'Test product',
    price: 99.99,
    sale_price: 79.99,
    regular_price: 99.99,
    stock_quantity: 10,
    stock_status: 'instock',
    categories: ['Test Category'],
    brand: 'Test Brand',
    image_url: 'https://via.placeholder.com/300',
    image_alt: 'Test Product 1',
    slug: 'test-product-1'
  },
  {
    id: '2',
    name: 'Test Product 2',
    description: 'This is another test product',
    short_description: 'Another test product',
    price: 149.99,
    regular_price: 149.99,
    stock_quantity: 5,
    stock_status: 'instock',
    categories: ['Test Category'],
    brand: 'Test Brand',
    image_url: 'https://via.placeholder.com/300',
    image_alt: 'Test Product 2',
    slug: 'test-product-2'
  }
];

async function importTestData() {
  try {
    // Check if collection exists
    const exists = await client.collections('products').exists();
    
    if (!exists) {
      console.log('❌ Products collection does not exist. Please run setup-typesense.ts first.');
      process.exit(1);
    }

    console.log('🔄 Importing test products...');
    
    // Import products
    for (const product of testProducts) {
      try {
        await client.collections('products').documents().create(product);
        console.log(`✅ Imported product: ${product.name}`);
      } catch (error) {
        console.error(`❌ Failed to import product ${product.name}:`, error);
      }
    }

    console.log('✅ Test data import completed!');

    // Verify the import
    const searchResults = await client.collections('products').documents().search({
      q: '*',
      query_by: 'name'
    });

    console.log(`🔍 Found ${searchResults.found} products in the collection`);

  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Import failed:', error.message);
      console.error('Stack trace:', error.stack);
    } else {
      console.error('❌ An unknown error occurred:', error);
    }
    process.exit(1);
  }
}

// Run import
importTestData().catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});
