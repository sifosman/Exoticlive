#!/usr/bin/env node

/**
 * This script finds the parent product of a variation.
 * It's useful for debugging issues with product variations.
 * 
 * Usage: node scripts/find-parent-product.mjs <variation_id>
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get WooCommerce API credentials from environment variables
const wcApiUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://wp.exoticshoes.co.za';
const wcConsumerKey = process.env.WC_CONSUMER_KEY || '';
const wcConsumerSecret = process.env.WC_CONSUMER_SECRET || '';

// Create authentication header for WooCommerce API
const getAuthHeader = () => {
  const auth = Buffer.from(`${wcConsumerKey}:${wcConsumerSecret}`).toString('base64');
  return `Basic ${auth}`;
};

// Fetch a variation from WooCommerce
async function fetchVariationFromWooCommerce(variationId) {
  try {
    console.log(`Fetching variation ${variationId} from WooCommerce...`);
    
    // First, we need to find which product this variation belongs to
    // We'll search all products and check their variations
    const response = await fetch(`${wcApiUrl}/wp-json/wc/v3/products?per_page=100`, {
      headers: {
        'Authorization': getAuthHeader()
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.statusText}`);
    }
    
    const products = await response.json();
    console.log(`✅ Successfully fetched ${products.length} products`);
    
    // Find the parent product
    let parentProduct = null;
    
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
          const variation = variations.find(v => v.id === parseInt(variationId));
          
          if (variation) {
            parentProduct = product;
            console.log(`✅ Found parent product: ${product.name} (ID: ${product.id})`);
            break;
          }
        }
      }
    }
    
    if (!parentProduct) {
      // Try a direct approach - fetch the variation directly
      const directResponse = await fetch(`${wcApiUrl}/wp-json/wc/v3/products/${variationId}`, {
        headers: {
          'Authorization': getAuthHeader()
        }
      });
      
      if (directResponse.ok) {
        const variation = await directResponse.json();
        
        if (variation.parent_id) {
          // Fetch the parent product
          const parentResponse = await fetch(`${wcApiUrl}/wp-json/wc/v3/products/${variation.parent_id}`, {
            headers: {
              'Authorization': getAuthHeader()
            }
          });
          
          if (parentResponse.ok) {
            parentProduct = await parentResponse.json();
            console.log(`✅ Found parent product: ${parentProduct.name} (ID: ${parentProduct.id})`);
          }
        }
      }
    }
    
    return parentProduct;
  } catch (error) {
    console.error(`❌ Error finding parent product:`, error.message);
    throw error;
  }
}

// Main function to find the parent product of a variation
async function findParentProduct(variationId) {
  try {
    console.log(`Looking for the parent product of variation ${variationId}...`);
    
    // Fetch the variation from WooCommerce
    const parentProduct = await fetchVariationFromWooCommerce(variationId);
    
    if (parentProduct) {
      console.log('\nParent product details:');
      console.log(`ID: ${parentProduct.id}`);
      console.log(`Name: ${parentProduct.name}`);
      console.log(`Type: ${parentProduct.type}`);
      console.log(`Status: ${parentProduct.status}`);
      console.log(`Stock status: ${parentProduct.stock_status}`);
      
      console.log('\nTo update this product and all its variations, run:');
      console.log(`node scripts/update-product-with-variations.mjs ${parentProduct.id}`);
    } else {
      console.log('\nCould not find the parent product for this variation');
    }
  } catch (error) {
    console.error(`\n❌ Error finding parent product:`, error.message);
  }
}

// Get variation ID from command line arguments
const variationId = process.argv[2];

if (!variationId) {
  console.error('❌ Please provide a variation ID as a command line argument');
  console.log('Usage: node scripts/find-parent-product.mjs <variation_id>');
  process.exit(1);
}

// Run the check
findParentProduct(variationId);
