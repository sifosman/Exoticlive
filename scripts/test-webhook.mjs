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
const WEBHOOK_URL = 'https://exoticshoes.co.za/api/webhooks/test';

// Create a test payload that simulates a product update webhook
const payload = {
  id: VARIATION_ID,
  parent_id: PRODUCT_ID,
  name: 'Athlefit Sandals - 9',
  type: 'variation',
  status: 'publish',
  featured: false,
  description: '',
  short_description: '',
  sku: '',
  price: '280',
  regular_price: '280',
  sale_price: '',
  date_on_sale_from: null,
  date_on_sale_to: null,
  on_sale: false,
  purchasable: true,
  total_sales: 0,
  virtual: false,
  downloadable: false,
  downloads: [],
  download_limit: -1,
  download_expiry: -1,
  tax_status: 'taxable',
  tax_class: '',
  manage_stock: true,
  stock_quantity: 3,
  stock_status: 'instock',
  backorders: 'no',
  backorders_allowed: false,
  backordered: false,
  weight: '',
  dimensions: {
    length: '',
    width: '',
    height: ''
  },
  shipping_class: '',
  shipping_class_id: 0,
  image: {
    id: 0,
    src: '',
    alt: ''
  },
  attributes: [
    {
      id: 0,
      name: 'Size',
      option: '9'
    }
  ],
  menu_order: 0,
  meta_data: [],
  permalink: 'https://wp.exoticshoes.co.za/product/athlefit-sandals/?attribute_pa_size=9'
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
