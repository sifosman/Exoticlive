// scripts/setup-typesense-cloud.mjs
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Typesense from 'typesense';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env') });

// Validate required environment variables for Typesense Cloud
const requiredEnvVars = ['TYPESENSE_CLOUD_HOST', 'TYPESENSE_CLOUD_API_KEY'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  console.error('Please add these to your .env file for Typesense Cloud');
  process.exit(1);
}

// Create Typesense client for cloud
const client = new Typesense.Client({
  nodes: [{
    host: process.env.TYPESENSE_CLOUD_HOST,
    port: 443,
    protocol: 'https'
  }],
  apiKey: process.env.TYPESENSE_CLOUD_API_KEY,
  connectionTimeoutSeconds: 5
});

// Product collection schema - simplified to ensure it works with Typesense Cloud
const productSchema = {
  name: 'products',
  enable_nested_fields: true,
  fields: [
    { name: 'id', type: 'string' },
    { name: 'name', type: 'string' },
    { name: 'description', type: 'string', optional: true },
    { name: 'price', type: 'float' },
    { name: 'sale_price', type: 'float', optional: true },
    { name: 'regular_price', type: 'float', optional: true },
    { name: 'categories', type: 'string[]', facet: true, optional: true },
    { name: 'tags', type: 'string[]', facet: true, optional: true },
    { name: 'colors', type: 'string[]', facet: true, optional: true },
    { name: 'sizes', type: 'string[]', facet: true, optional: true },
    { name: 'brand', type: 'string', facet: true, optional: true },
    { name: 'image_url', type: 'string', optional: true },
    { name: 'gallery_images', type: 'string[]', optional: true },
    { name: 'slug', type: 'string' },
    { name: 'stock_status', type: 'string', facet: true },
    { name: 'stock_quantity', type: 'int32', optional: true },
    { name: 'is_featured', type: 'bool', facet: true, optional: true },
    { name: 'is_on_sale', type: 'bool', facet: true, optional: true },
    { name: 'average_rating', type: 'float', optional: true }
  ],
  default_sorting_field: 'price'
};

async function setupCloudCollection() {
  try {
    console.log('🔄 Checking for existing products collection in Typesense Cloud...');
    const exists = await client.collections('products').exists();
    
    if (exists) {
      console.log('🗑️ Deleting existing products collection...');
      await client.collections('products').delete();
      console.log('✅ Existing collection deleted');
    }

    console.log('📦 Creating products collection in Typesense Cloud...');
    await client.collections().create(productSchema);
    console.log('✅ Products collection created successfully in Typesense Cloud');
    
    // Test connection and collection creation
    const collections = await client.collections().retrieve();
    console.log('📋 Available collections:', collections.map(c => c.name).join(', '));
    
    return true;
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Collection setup failed:', error.message);
      console.error('Stack trace:', error.stack);
    } else {
      console.error('❌ An unknown error occurred:', error);
    }
    return false;
  }
}

// Run setup
setupCloudCollection().then(success => {
  if (success) {
    console.log('✅ Typesense Cloud collection setup completed successfully');
    console.log('🔍 Next steps:');
    console.log('1. Run the sync-products-to-typesense-cloud.mjs script to import your products');
    console.log('2. Set up webhooks to keep your products updated');
  } else {
    console.error('❌ Typesense Cloud collection setup failed');
    process.exit(1);
  }
}).catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});
