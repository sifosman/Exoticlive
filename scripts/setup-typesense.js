// scripts/setup-typesense.js
const dotenv = require('dotenv');
const path = require('path');
const Typesense = require('typesense');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Validate required environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_TYPESENSE_HOST',
  'NEXT_PUBLIC_TYPESENSE_PORT',
  'NEXT_PUBLIC_TYPESENSE_ADMIN_API_KEY',
  'NEXT_PUBLIC_TYPESENSE_PROTOCOL'
];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  process.exit(1);
}

// Create Typesense client
const client = new Typesense.Client({
  nodes: [{
    host: process.env.NEXT_PUBLIC_TYPESENSE_HOST,
    port: Number(process.env.NEXT_PUBLIC_TYPESENSE_PORT),
    protocol: process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL || 'http'
  }],
  apiKey: process.env.NEXT_PUBLIC_TYPESENSE_ADMIN_API_KEY,
  connectionTimeoutSeconds: 5
});

// Define product schema
const productSchema = {
  name: 'products',
  fields: [
    { name: 'id', type: 'string' },
    { name: 'name', type: 'string' },
    { name: 'description', type: 'string', optional: true },
    { name: 'short_description', type: 'string', optional: true },
    { name: 'price', type: 'float' },
    { name: 'sale_price', type: 'float', optional: true },
    { name: 'regular_price', type: 'float' },
    { name: 'stock_quantity', type: 'int32', optional: true },
    { name: 'stock_status', type: 'string', facet: true },
    { name: 'categories', type: 'string[]', facet: true },
    { name: 'brand', type: 'string', facet: true, optional: true },
    { name: 'image_url', type: 'string', optional: true },
    { name: 'image_alt', type: 'string', optional: true },
    { name: 'slug', type: 'string' },
    { name: 'gallery_images', type: 'string[]', optional: true },
    { name: 'attributes', type: 'string[]', optional: true }
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
      console.log('✅ Existing collection deleted successfully!');
    }

    console.log('📦 Creating products collection with updated schema...');
    const collection = await client.collections().create(productSchema);
    console.log('✅ Products collection created successfully!');
    console.log('Collection schema:', JSON.stringify(collection, null, 2));
    
  } catch (error) {
    console.error('❌ Collection setup failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response);
    }
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run setup
setupCollections().catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});
