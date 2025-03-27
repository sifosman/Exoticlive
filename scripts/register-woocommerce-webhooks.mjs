// scripts/register-woocommerce-webhooks.mjs
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import WooCommerceAPI from '@woocommerce/woocommerce-rest-api';
import crypto from 'crypto';

// Get dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.join(__dirname, '..', '.env') });

// Validate required environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_WORDPRESS_URL',
  'WC_CONSUMER_KEY',
  'WC_CONSUMER_SECRET',
  'NEXT_PUBLIC_SITE_URL',
  'WEBHOOK_SECRET'
];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  process.exit(1);
}

// Initialize WooCommerce API
const WooCommerce = new WooCommerceAPI.default({
  url: process.env.NEXT_PUBLIC_WORDPRESS_URL,
  consumerKey: process.env.WC_CONSUMER_KEY,
  consumerSecret: process.env.WC_CONSUMER_SECRET,
  version: 'wc/v3'
});

// Generate a random webhook secret if one is not provided
if (!process.env.WEBHOOK_SECRET) {
  const secret = crypto.randomBytes(32).toString('hex');
  console.log('⚠️ WEBHOOK_SECRET not found in .env, generated a random one:');
  console.log(secret);
  console.log('Please add this to your .env file as WEBHOOK_SECRET=your_secret');
  process.exit(1);
}

// Define the webhooks to register
const webhooks = [
  {
    name: 'Product created',
    topic: 'product.created',
    delivery_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/woocommerce`
  },
  {
    name: 'Product updated',
    topic: 'product.updated',
    delivery_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/woocommerce`
  },
  {
    name: 'Product deleted',
    topic: 'product.deleted',
    delivery_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/woocommerce`
  },
  {
    name: 'Product stock updated',
    topic: 'product.stock_status_changed',
    delivery_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/woocommerce`
  }
];

async function getExistingWebhooks() {
  try {
    const response = await WooCommerce.get('webhooks');
    return response.data;
  } catch (error) {
    console.error('Error fetching existing webhooks:', error.message);
    return [];
  }
}

async function deleteWebhook(id) {
  try {
    await WooCommerce.delete(`webhooks/${id}`, {
      force: true
    });
    console.log(`✅ Deleted webhook with ID ${id}`);
  } catch (error) {
    console.error(`❌ Error deleting webhook ${id}:`, error.message);
  }
}

async function registerWebhook(webhook) {
  try {
    const response = await WooCommerce.post('webhooks', {
      ...webhook,
      secret: process.env.WEBHOOK_SECRET
    });
    
    console.log(`✅ Registered webhook: ${webhook.name} (ID: ${response.data.id})`);
    return response.data;
  } catch (error) {
    console.error(`❌ Error registering webhook ${webhook.name}:`, error.message);
    return null;
  }
}

async function registerWebhooks() {
  try {
    // Get existing webhooks
    const existingWebhooks = await getExistingWebhooks();
    
    // Delete existing webhooks with the same delivery URL
    const webhookUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/woocommerce`;
    const webhooksToDelete = existingWebhooks.filter(webhook => 
      webhook.delivery_url === webhookUrl
    );
    
    console.log(`🔄 Found ${webhooksToDelete.length} existing webhooks to update...`);
    
    for (const webhook of webhooksToDelete) {
      await deleteWebhook(webhook.id);
    }
    
    // Register the new webhooks
    console.log('🔄 Registering webhooks...');
    const results = [];
    
    for (const webhook of webhooks) {
      const result = await registerWebhook(webhook);
      if (result) results.push(result);
    }
    
    console.log(`🎉 Successfully registered ${results.length} webhooks`);
    
    // Test connection to the webhooks
    console.log('🧪 Testing webhook delivery...');
    if (results.length > 0) {
      await WooCommerce.get(`webhooks/${results[0].id}/deliveries`);
      console.log('✅ Webhook connection test successful');
    }
    
    return results;
  } catch (error) {
    console.error('❌ Error registering webhooks:', error.message);
    return [];
  }
}

// Run the webhook registration
registerWebhooks().then(webhooks => {
  console.log(`✅ Registered ${webhooks.length} webhooks successfully`);
  console.log('📋 Required environment variables for your deployed site:');
  console.log('TYPESENSE_CLOUD_HOST=your_typesense_cloud_host');
  console.log('TYPESENSE_CLOUD_API_KEY=your_typesense_admin_api_key');
  console.log(`WEBHOOK_SECRET=${process.env.WEBHOOK_SECRET}`);
  
  // Check if NEXT_PUBLIC vars are properly set
  console.log('\n⚠️ Make sure these are also set in your public environment variables:');
  console.log('NEXT_PUBLIC_TYPESENSE_HOST=your_typesense_cloud_host');
  console.log('NEXT_PUBLIC_TYPESENSE_SEARCH_API_KEY=your_typesense_search_api_key');
  console.log('NEXT_PUBLIC_TYPESENSE_PROTOCOL=https');
  console.log('NEXT_PUBLIC_TYPESENSE_PORT=443');
}).catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});
