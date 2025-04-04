#!/usr/bin/env node

/**
 * This script updates a variation's stock in both WooCommerce and Typesense.
 * 
 * Usage: node scripts/update-stock.mjs <parent_product_id> <variation_id> <stock_quantity>
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get command line arguments
const parentProductId = parseInt(process.argv[2]);
const variationId = parseInt(process.argv[3]);
const stockQuantity = parseInt(process.argv[4]);

// Validate arguments
if (isNaN(parentProductId) || isNaN(variationId) || isNaN(stockQuantity)) {
  console.error('❌ Please provide valid numeric arguments');
  console.log('Usage: node scripts/update-stock.mjs <parent_product_id> <variation_id> <stock_quantity>');
  process.exit(1);
}

// Get the site URL from environment variables
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://exoticshoes.co.za';

// Update stock using the API
async function updateStock() {
  try {
    console.log(`Updating stock for variation ${variationId} of product ${parentProductId} to ${stockQuantity}...`);
    
    // Call the stock update API
    const response = await fetch(`${siteUrl}/api/stock/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        parentProductId,
        variationId,
        stockQuantity
      })
    });
    
    // Parse the response
    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ ${data.message}`);
    } else {
      console.error(`❌ ${data.message}`);
    }
  } catch (error) {
    console.error('❌ Error updating stock:', error.message);
  }
}

// Run the update
updateStock();
