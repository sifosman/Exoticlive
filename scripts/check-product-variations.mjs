#!/usr/bin/env node

/**
 * This script checks if a product is a variable product and if it has variations.
 * It's useful for debugging issues with product variations.
 * 
 * Usage: node scripts/check-product-variations.mjs <product_id>
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

// Fetch a product from WooCommerce
async function fetchProductFromWooCommerce(productId) {
  try {
    console.log(`Fetching product ${productId} from WooCommerce...`);
    
    const response = await fetch(`${wcApiUrl}/wp-json/wc/v3/products/${productId}`, {
      headers: {
        'Authorization': getAuthHeader()
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch product: ${response.statusText}`);
    }
    
    const product = await response.json();
    console.log(`✅ Successfully fetched product: ${product.name}`);
    return product;
  } catch (error) {
    console.error(`❌ Error fetching product from WooCommerce:`, error.message);
    throw error;
  }
}

// Fetch variations for a product from WooCommerce
async function fetchVariationsFromWooCommerce(productId) {
  try {
    console.log(`Fetching variations for product ${productId}...`);
    
    const response = await fetch(`${wcApiUrl}/wp-json/wc/v3/products/${productId}/variations?per_page=100`, {
      headers: {
        'Authorization': getAuthHeader()
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch variations: ${response.statusText}`);
    }
    
    const variations = await response.json();
    console.log(`✅ Successfully fetched ${variations.length} variations`);
    return variations;
  } catch (error) {
    console.error(`❌ Error fetching variations from WooCommerce:`, error.message);
    throw error;
  }
}

// Check if a product is a variable product and if it has variations
async function checkProductVariations(productId) {
  try {
    // Fetch product from WooCommerce
    const product = await fetchProductFromWooCommerce(productId);
    
    // Print product details
    console.log('\nProduct details:');
    console.log(`ID: ${product.id}`);
    console.log(`Name: ${product.name}`);
    console.log(`Type: ${product.type}`);
    console.log(`Status: ${product.status}`);
    console.log(`Stock status: ${product.stock_status}`);
    console.log(`Stock quantity: ${product.stock_quantity}`);
    
    // Check if this is a variable product
    const isVariableProduct = product.type === 'variable';
    console.log(`\nIs variable product: ${isVariableProduct}`);
    
    // Print product attributes
    console.log('\nProduct attributes:');
    if (product.attributes && product.attributes.length > 0) {
      product.attributes.forEach(attr => {
        console.log(`- ${attr.name}: ${attr.options ? attr.options.join(', ') : 'No options'}`);
      });
    } else {
      console.log('No attributes found');
    }
    
    // If this is a variable product, fetch variations
    if (isVariableProduct) {
      const variations = await fetchVariationsFromWooCommerce(productId);
      
      console.log(`\nFound ${variations.length} variations:`);
      
      if (variations.length > 0) {
        variations.forEach(variation => {
          console.log(`\nVariation ID: ${variation.id}`);
          console.log(`Price: ${variation.price}`);
          console.log(`Stock status: ${variation.stock_status}`);
          console.log(`Stock quantity: ${variation.stock_quantity}`);
          
          console.log('Attributes:');
          if (variation.attributes && variation.attributes.length > 0) {
            variation.attributes.forEach(attr => {
              console.log(`- ${attr.name}: ${attr.option}`);
            });
          } else {
            console.log('No attributes found');
          }
        });
      }
    } else {
      console.log('\nThis is not a variable product, so it does not have variations');
    }
  } catch (error) {
    console.error(`\n❌ Error checking product variations:`, error.message);
  }
}

// Get product ID from command line arguments
const productId = process.argv[2];

if (!productId) {
  console.error('❌ Please provide a product ID as a command line argument');
  console.log('Usage: node scripts/check-product-variations.mjs <product_id>');
  process.exit(1);
}

// Run the check
checkProductVariations(productId);
