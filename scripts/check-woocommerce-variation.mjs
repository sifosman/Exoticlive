#!/usr/bin/env node

/**
 * This script checks a specific variation in WooCommerce to see its current stock status.
 * 
 * Usage: node scripts/check-woocommerce-variation.mjs <variation_id>
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get variation ID from command line arguments
const variationId = process.argv[2];

if (!variationId) {
  console.error('❌ Please provide a variation ID as a command line argument');
  console.log('Usage: node scripts/check-woocommerce-variation.mjs <variation_id>');
  process.exit(1);
}

// WooCommerce API credentials
const wcApiUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://wp.exoticshoes.co.za';
const wcConsumerKey = process.env.WC_CONSUMER_KEY || '';
const wcConsumerSecret = process.env.WC_CONSUMER_SECRET || '';

// Create authentication header for WooCommerce API
const getAuthHeader = () => {
  const auth = Buffer.from(`${wcConsumerKey}:${wcConsumerSecret}`).toString('base64');
  return `Basic ${auth}`;
};

// Find the variation in WooCommerce
async function findVariationInWooCommerce(variationId) {
  try {
    console.log(`Searching for variation ${variationId} in WooCommerce...`);
    
    // First, we need to find which product this variation belongs to
    const response = await fetch(`${wcApiUrl}/wp-json/wc/v3/products?per_page=100`, {
      headers: {
        'Authorization': getAuthHeader()
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.statusText}`);
    }
    
    const products = await response.json();
    console.log(`Found ${products.length} products in WooCommerce`);
    
    // Find the parent product
    let parentProduct = null;
    let variation = null;
    
    for (const product of products) {
      if (product.type === 'variable') {
        // Fetch variations for this product
        const variationsResponse = await fetch(`${wcApiUrl}/wp-json/wc/v3/products/${product.id}/variations?per_page=100`, {
          headers: {
            'Authorization': getAuthHeader()
          }
        });
        
        if (variationsResponse.ok) {
          const variations = await variationsResponse.json();
          
          // Check if this variation belongs to this product
          const foundVariation = variations.find(v => v.id.toString() === variationId);
          
          if (foundVariation) {
            parentProduct = product;
            variation = foundVariation;
            console.log(`Found variation ${variationId} in product ${product.id} (${product.name})`);
            break;
          }
        }
      }
    }
    
    if (variation) {
      console.log('\n✅ Variation found in WooCommerce:');
      console.log('----------------------------');
      console.log(`ID: ${variation.id}`);
      console.log(`Parent Product: ${parentProduct.name} (ID: ${parentProduct.id})`);
      console.log(`Stock Status: ${variation.stock_status}`);
      console.log(`Stock Quantity: ${variation.stock_quantity}`);
      
      // Print attributes if available
      if (variation.attributes && Array.isArray(variation.attributes)) {
        console.log('\nAttributes:');
        variation.attributes.forEach(attr => {
          console.log(`- ${attr.name}: ${attr.option}`);
        });
      }
      
      return { variation, parentProduct };
    } else {
      console.error(`❌ Variation ${variationId} not found in WooCommerce`);
      return null;
    }
  } catch (error) {
    console.error('Error searching WooCommerce:', error.message);
    return null;
  }
}

// Run the search
findVariationInWooCommerce(variationId)
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
  });
