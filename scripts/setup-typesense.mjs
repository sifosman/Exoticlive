// scripts/setup-typesense.mjs
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Typesense from 'typesense';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env') });

// Validate required environment variables
const requiredEnvVars = ['TYPESENSE_HOST', 'TYPESENSE_PORT', 'TYPESENSE_ADMIN_API_KEY'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  process.exit(1);
}

// Create Typesense client
const client = new Typesense.Client({
  nodes: [{
    host: process.env.TYPESENSE_HOST,
    port: Number(process.env.TYPESENSE_PORT),
    protocol: 'http'
  }],
  apiKey: process.env.TYPESENSE_ADMIN_API_KEY,
  connectionTimeoutSeconds: 5
});

// Define product schema
const productSchema = {
  name: 'products',
  fields: [
    { name: 'name', type: 'string' },
    { name: 'description', type: 'string', optional: true },
    { name: 'price', type: 'float' },
    { name: 'sale_price', type: 'float', optional: true },
    { name: 'categories', type: 'string[]', facet: true, optional: true },
    { name: 'tags', type: 'string[]', facet: true, optional: true },
    { name: 'brand', type: 'string', facet: true, optional: true },
    { name: 'image_url', type: 'string', optional: true },
    { name: 'image_alt', type: 'string', optional: true },
    { name: 'slug', type: 'string' },
    { name: 'original_id', type: 'string', optional: true }
  ],
  default_sorting_field: 'price'
};

async function setupCollections() {
  try {
    console.log('🔄 Checking for existing products collection...');
    const exists = await client.collections('products').exists();
    
    if (exists) {
      console.log('🗑️ Deleting existing products collection...');
      await client.collections('products').delete();
      console.log('✅ Existing collection deleted');
    }

    console.log('📦 Creating products collection...');
    await client.collections().create(productSchema);
    console.log('✅ Products collection created successfully');
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Collection setup failed:', error.message);
      console.error('Stack trace:', error.stack);
    } else {
      console.error('❌ An unknown error occurred:', error);
    }
    process.exit(1);
  }
}

// Run setup
setupCollections().catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});
