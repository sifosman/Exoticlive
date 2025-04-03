#!/usr/bin/env node

// scripts/test-webhook-endpoint.mjs
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1]] = match[2];
  }
});

// Get the webhook secret from environment variables
const webhookSecret = envVars.WEBHOOK_SECRET;
const siteUrl = envVars.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

if (!webhookSecret) {
  console.error('❌ WEBHOOK_SECRET not found in .env file');
  process.exit(1);
}

// Create a test payload
const payload = {
  id: 12345,
  name: 'Test Product',
  stock_status: 'instock',
  stock_quantity: 10
};

// Convert payload to string
const payloadString = JSON.stringify(payload);

// Create signature
const hmac = crypto.createHmac('sha256', webhookSecret);
const signature = hmac.update(payloadString).digest('base64');

// Make a request to the webhook endpoint
async function testWebhook() {
  try {
    console.log('🔄 Testing webhook endpoint...');
    console.log(`🔗 URL: ${siteUrl}/api/webhooks/woocommerce`);
    console.log(`📦 Payload: ${payloadString}`);
    console.log(`🔑 Signature: ${signature}`);
    
    const response = await fetch(`${siteUrl}/api/webhooks/woocommerce`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-WC-Webhook-Signature': signature,
        'X-WC-Webhook-Topic': 'product.updated'
      },
      body: payloadString
    });
    
    const responseText = await response.text();
    
    console.log(`🔄 Response status: ${response.status}`);
    console.log(`🔄 Response body: ${responseText}`);
    
    if (response.ok) {
      console.log('✅ Webhook test successful!');
    } else {
      console.error('❌ Webhook test failed!');
    }
  } catch (error) {
    console.error('❌ Error testing webhook:', error.message);
  }
}

// Run the test
testWebhook();
