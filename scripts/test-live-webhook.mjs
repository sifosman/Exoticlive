#!/usr/bin/env node

// A script to test the webhook endpoint on the live site
import crypto from 'crypto';

// Configuration
const webhookSecret = 'a415388c0f3f17bffa3618600ffdcc1db6990a067a543bb80a6c4fdaec7348eb'; // The webhook secret we generated
const siteUrl = 'https://exoticshoes.co.za'; // Your live site URL

// Create a test payload similar to what WooCommerce would send
const payload = {
  id: 12345,
  name: 'Test Product',
  status: 'publish',
  stock_status: 'instock',
  stock_quantity: 10,
  type: 'simple',
  price: '100.00',
  regular_price: '120.00',
  sale_price: '100.00',
  categories: [
    {
      id: 9,
      name: 'Test Category',
      slug: 'test-category'
    }
  ],
  images: [
    {
      id: 123,
      src: 'https://exoticshoes.co.za/wp-content/uploads/test-image.jpg'
    }
  ]
};

// Convert payload to string
const payloadString = JSON.stringify(payload);

// Create signature using the webhook secret
const hmac = crypto.createHmac('sha256', webhookSecret);
const signature = hmac.update(payloadString).digest('base64');

console.log('🔄 Testing webhook endpoint on live site...');
console.log(`🔗 URL: ${siteUrl}/api/webhooks/woocommerce`);
console.log(`📦 Payload: ${JSON.stringify(payload, null, 2)}`);
console.log(`🔑 Signature: ${signature}`);

// Make a request to the webhook endpoint
fetch(`${siteUrl}/api/webhooks/woocommerce`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-WC-Webhook-Signature': signature,
    'X-WC-Webhook-Topic': 'product.updated',
    'X-WC-Webhook-Source': 'https://exoticshoes.co.za', // Add source header
    'X-WC-Webhook-Resource': 'product', // Add resource header
    'X-WC-Webhook-Event': 'updated', // Add event header
    'X-WC-Webhook-Delivery-ID': `test-${Date.now()}` // Add delivery ID header
  },
  body: payloadString
})
.then(response => {
  console.log(`🔄 Response status: ${response.status}`);
  return response.text().then(text => {
    console.log(`🔄 Response body: ${text}`);
    
    if (response.ok) {
      console.log('✅ Webhook test successful!');
    } else {
      console.error('❌ Webhook test failed!');
    }
  });
})
.catch(error => {
  console.error('❌ Error testing webhook:', error.message);
});
