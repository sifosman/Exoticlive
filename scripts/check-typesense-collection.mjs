// scripts/check-typesense-collection.mjs
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
const requiredEnvVars = [
  'TYPESENSE_CLOUD_HOST',
  'TYPESENSE_CLOUD_API_KEY'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  process.exit(1);
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

async function checkCollection() {
  try {
    console.log('🔍 Checking Typesense collection...');
    
    // Get collection info
    const collection = await client.collections('products').retrieve();
    console.log(`📊 Collection '${collection.name}' info:`);
    console.log(`  - Number of documents: ${collection.num_documents}`);
    console.log(`  - Fields: ${collection.fields.map(f => f.name).join(', ')}`);
    
    // Try to retrieve some documents from the collection
    const searchResults = await client.collections('products').documents().search({
      q: '*',
      query_by: 'name',
      per_page: 5
    });
    
    console.log(`\n🔎 Search results (showing up to 5 documents):`);
    if (searchResults.hits.length === 0) {
      console.log('❌ No documents found in the collection!');
    } else {
      searchResults.hits.forEach((hit, index) => {
        console.log(`\n📄 Document ${index + 1}:`);
        console.log(`  - ID: ${hit.document.id}`);
        console.log(`  - Name: ${hit.document.name}`);
        console.log(`  - Price: ${hit.document.price}`);
        console.log(`  - Stock Status: ${hit.document.stock_status}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking Typesense collection:', error.message);
  }
}

checkCollection().catch(console.error);
