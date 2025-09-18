import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Typesense from 'typesense';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env') });

// Create Typesense client
const client = new Typesense.Client({
  nodes: [{
    host: process.env.NEXT_PUBLIC_TYPESENSE_HOST || 'localhost',
    port: Number(process.env.NEXT_PUBLIC_TYPESENSE_PORT) || 8108,
    protocol: process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL || 'http'
  }],
  apiKey: process.env.NEXT_PUBLIC_TYPESENSE_ADMIN_API_KEY || 'xyz123',
  connectionTimeoutSeconds: 5
});

// Test document with categories
const testDocument = {
  id: 'test-1',
  name: 'Test Product',
  description: 'Test description',
  price: 99.99,
  stock_status: 'instock',
  categories: ['Boots', 'Mens'],
  image_url: 'https://example.com/image.jpg',
  slug: 'test-product'
};

async function testSchema() {
  try {
    console.log('Getting collection schema...');
    const collection = await client.collections('products').retrieve();
    console.log('Current schema:', JSON.stringify(collection, null, 2));

    console.log('\nTesting document import...');
    const importResponse = await client
      .collections('products')
      .documents()
      .create(testDocument);
    console.log('Import response:', importResponse);

    console.log('\nTesting category search...');
    const searchResponse = await client
      .collections('products')
      .documents()
      .search({
        q: '*',
        filter_by: 'categories:[Boots]'
      });
    console.log('Search response:', JSON.stringify(searchResponse, null, 2));
  } catch (error) {
    console.error('Error:', error);
    if (error.response) {
      console.error('Response:', await error.response.text());
    }
  }
}

testSchema().catch(console.error);
