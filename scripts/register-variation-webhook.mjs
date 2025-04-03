#!/usr/bin/env node

/**
 * This script registers a webhook in WooCommerce specifically for variation updates.
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import crypto from 'crypto';

// Get dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

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

// Generate a random webhook secret if one is not provided
if (!process.env.WEBHOOK_SECRET) {
  const secret = crypto.randomBytes(32).toString('hex');
  console.log('⚠️ WEBHOOK_SECRET not found in .env, generated a random one:');
  console.log(secret);
  console.log('Please add this to your .env file as WEBHOOK_SECRET=your_secret');
  process.exit(1);
}

// Create authentication header for WooCommerce API
const getAuthHeader = () => {
  const auth = Buffer.from(`${process.env.WC_CONSUMER_KEY}:${process.env.WC_CONSUMER_SECRET}`).toString('base64');
  return `Basic ${auth}`;
};

// Fetch existing webhooks from WooCommerce
async function getExistingWebhooks() {
  try {
    console.log('Fetching existing webhooks...');

    const response = await fetch(`${process.env.NEXT_PUBLIC_WORDPRESS_URL}/wp-json/wc/v3/webhooks`, {
      headers: {
        'Authorization': getAuthHeader()
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch webhooks: ${response.statusText}`);
    }

    const webhooks = await response.json();
    console.log(`✅ Found ${webhooks.length} existing webhooks`);
    return webhooks;
  } catch (error) {
    console.error('❌ Error fetching existing webhooks:', error.message);
    return [];
  }
}

// Delete a webhook from WooCommerce
async function deleteWebhook(id) {
  try {
    console.log(`Deleting webhook with ID ${id}...`);

    const response = await fetch(`${process.env.NEXT_PUBLIC_WORDPRESS_URL}/wp-json/wc/v3/webhooks/${id}?force=true`, {
      method: 'DELETE',
      headers: {
        'Authorization': getAuthHeader()
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to delete webhook: ${response.statusText}`);
    }

    console.log(`✅ Deleted webhook with ID ${id}`);
    return true;
  } catch (error) {
    console.error(`❌ Error deleting webhook ${id}:`, error.message);
    return false;
  }
}

// Register a webhook in WooCommerce
async function registerWebhook(webhook) {
  try {
    console.log(`Registering webhook: ${webhook.name}...`);

    const webhookData = {
      name: webhook.name,
      topic: webhook.topic,
      delivery_url: webhook.delivery_url,
      secret: process.env.WEBHOOK_SECRET,
      status: 'active'
    };

    console.log('Webhook data:', JSON.stringify(webhookData, null, 2));

    const response = await fetch(`${process.env.NEXT_PUBLIC_WORDPRESS_URL}/wp-json/wc/v3/webhooks`, {
      method: 'POST',
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Response error:', errorText);
      throw new Error(`Failed to register webhook: ${response.statusText}`);
    }

    const result = await response.json();
    console.log(`✅ Registered webhook: ${result.name} (ID: ${result.id})`);
    return result;
  } catch (error) {
    console.error(`❌ Error registering webhook ${webhook.name}:`, error.message);
    return null;
  }
}

// Main function to register the variation webhook
async function registerVariationWebhook() {
  try {
    // Get existing webhooks
    const existingWebhooks = await getExistingWebhooks();

    // Define the variation webhook
    const variationWebhook = {
      name: 'Product variation updated',
      topic: 'product_variation.updated',
      delivery_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/variation-update`
    };

    // Check if the webhook already exists
    const existingWebhook = existingWebhooks.find(webhook =>
      webhook.topic === variationWebhook.topic &&
      webhook.delivery_url === variationWebhook.delivery_url
    );

    if (existingWebhook) {
      console.log(`Variation webhook already exists with ID ${existingWebhook.id}`);

      // Delete the existing webhook
      await deleteWebhook(existingWebhook.id);
    }

    // Register the variation webhook
    const result = await registerWebhook(variationWebhook);

    if (result) {
      console.log('\n✅ Successfully registered variation webhook');
      console.log('Now, when a variation is updated in WooCommerce, the webhook will trigger and update the variation in Typesense');
    } else {
      console.error('\n❌ Failed to register variation webhook');
    }
  } catch (error) {
    console.error('❌ Error registering variation webhook:', error.message);
  }
}

// Run the script
registerVariationWebhook();
