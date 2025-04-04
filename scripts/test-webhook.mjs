#!/usr/bin/env node

/**
 * This script tests the WooCommerce webhook by sending a test request.
 * 
 * Usage: node scripts/test-webhook.mjs
 */

// The product ID and variation ID to test with
const PRODUCT_ID = 58264; // Athlefit Sandals
const VARIATION_ID = 58271; // Size 9

// The webhook URL
const WEBHOOK_URL = 'https://exoticshoes.co.za/api/webhooks/woocommerce';

// Create a test payload that simulates a product update webhook
const payload = {
  id: VARIATION_ID,
  parent_id: PRODUCT_ID,
  name: 'Athlefit Sandals - 9',
  type: 'variation',
  status: 'publish',
  stock_status: 'instock',
  stock_quantity: 3,
  attributes: [
    {
      name: 'Size',
      option: '9'
    }
  ]
};

// Send the test webhook
async function sendTestWebhook() {
  try {
    console.log('Sending test webhook to:', WEBHOOK_URL);
    console.log('Payload:', JSON.stringify(payload, null, 2));
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-WC-Webhook-Topic': 'product.updated',
        'X-WC-Webhook-Source': 'test-script'
      },
      body: JSON.stringify(payload)
    });
    
    const responseText = await response.text();
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    console.log('Response body:', responseText);
    
    if (response.ok) {
      console.log('✅ Webhook test successful!');
    } else {
      console.error('❌ Webhook test failed!');
    }
  } catch (error) {
    console.error('Error sending test webhook:', error);
  }
}

// Run the test
sendTestWebhook();
