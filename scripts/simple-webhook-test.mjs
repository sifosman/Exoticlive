#!/usr/bin/env node

// A simple script to test the webhook endpoint
import crypto from 'crypto';

// Configuration
const webhookSecret = 'a415388c0f3f17bffa3618600ffdcc1db6990a067a543bb80a6c4fdaec7348eb'; // Replace with your actual webhook secret
const siteUrl = 'https://exoticshoes.co.za'; // Replace with your actual site URL

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

console.log('Testing webhook endpoint...');
console.log(`URL: ${siteUrl}/api/webhooks/woocommerce`);
console.log(`Payload: ${payloadString}`);
console.log(`Signature: ${signature}`);

// Make a request to the webhook endpoint
fetch(`${siteUrl}/api/webhooks/woocommerce`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-WC-Webhook-Signature': signature,
    'X-WC-Webhook-Topic': 'product.updated'
  },
  body: payloadString
})
.then(response => response.text())
.then(text => {
  console.log(`Response status: ${response.status}`);
  console.log(`Response body: ${text}`);
  
  if (response.ok) {
    console.log('Webhook test successful!');
  } else {
    console.error('Webhook test failed!');
  }
})
.catch(error => {
  console.error('Error testing webhook:', error.message);
});
