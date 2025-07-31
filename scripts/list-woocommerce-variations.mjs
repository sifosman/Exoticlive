#!/usr/bin/env node

/**
 * This script lists all variations for all variable products in WooCommerce.
 * 
 * Usage: node scripts/list-woocommerce-variations.mjs
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// WooCommerce API credentials
const wcApiUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://wp.exoticshoes.co.za';
const wcConsumerKey = process.env.WC_CONSUMER_KEY || '';
const wcConsumerSecret = process.env.WC_CONSUMER_SECRET || '';

// Create authentication header for WooCommerce API
const getAuthHeader = () => {
  const auth = Buffer.from(`${wcConsumerKey}:${wcConsumerSecret}`).toString('base64');
  return `Basic ${auth}`;
};

// List all variations in WooCommerce
async function listAllVariations() {
  try {
    console.log('Fetching all products from WooCommerce...');
    
    // Fetch all products
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
    
    // Filter variable products
    const variableProducts = products.filter(product => product.type === 'variable');
    console.log(`Found ${variableProducts.length} variable products`);
    
    // Fetch variations for each variable product
    let allVariations = [];
    
    for (const product of variableProducts) {
      console.log(`\nFetching variations for product: ${product.name} (ID: ${product.id})`);
      
      const variationsResponse = await fetch(`${wcApiUrl}/wp-json/wc/v3/products/${product.id}/variations?per_page=100`, {
        headers: {
          'Authorization': getAuthHeader()
        }
      });
      
      if (variationsResponse.ok) {
        const variations = await variationsResponse.json();
        console.log(`Found ${variations.length} variations`);
        
        // Add product name to each variation for easier identification
        const productVariations = variations.map(variation => ({
          ...variation,
          product_name: product.name
        }));
        
        allVariations = [...allVariations, ...productVariations];
        
        // Print variation details
        productVariations.forEach(variation => {
          console.log(`- Variation ID: ${variation.id}`);
          console.log(`  Stock Status: ${variation.stock_status}`);
          console.log(`  Stock Quantity: ${variation.stock_quantity}`);
          
          // Print attributes
          if (variation.attributes && variation.attributes.length > 0) {
            console.log('  Attributes:');
            variation.attributes.forEach(attr => {
              console.log(`    ${attr.name}: ${attr.option}`);
            });
          }
          
          console.log(''); // Empty line for readability
        });
      } else {
        console.error(`Failed to fetch variations for product ${product.id}: ${variationsResponse.statusText}`);
      }
    }
    
    console.log(`\nTotal variations found: ${allVariations.length}`);
    
    // Search for variations with IDs close to 58271
    console.log('\nSearching for variations with IDs close to 58271:');
    const targetId = 58271;
    const range = 100; // Search within +/- 100 of the target ID
    
    const closeVariations = allVariations.filter(variation => 
      Math.abs(variation.id - targetId) <= range
    );
    
    if (closeVariations.length > 0) {
      console.log(`Found ${closeVariations.length} variations with IDs close to ${targetId}:`);
      
      closeVariations.forEach(variation => {
        console.log(`\nVariation ID: ${variation.id}`);
        console.log(`Product: ${variation.product_name} (ID: ${variation.product_id})`);
        console.log(`Stock Status: ${variation.stock_status}`);
        console.log(`Stock Quantity: ${variation.stock_quantity}`);
        
        // Print attributes
        if (variation.attributes && variation.attributes.length > 0) {
          console.log('Attributes:');
          variation.attributes.forEach(attr => {
            console.log(`  ${attr.name}: ${attr.option}`);
          });
        }
      });
    } else {
      console.log(`No variations found with IDs close to ${targetId}`);
    }
    
    // Search for variations with "Athlefit" in the product name
    console.log('\nSearching for variations with "Athlefit" in the product name:');
    const athleticVariations = allVariations.filter(variation => 
      variation.product_name.toLowerCase().includes('athlefit')
    );
    
    if (athleticVariations.length > 0) {
      console.log(`Found ${athleticVariations.length} variations with "Athlefit" in the product name:`);
      
      athleticVariations.forEach(variation => {
        console.log(`\nVariation ID: ${variation.id}`);
        console.log(`Product: ${variation.product_name} (ID: ${variation.product_id})`);
        console.log(`Stock Status: ${variation.stock_status}`);
        console.log(`Stock Quantity: ${variation.stock_quantity}`);
        
        // Print attributes
        if (variation.attributes && variation.attributes.length > 0) {
          console.log('Attributes:');
          variation.attributes.forEach(attr => {
            console.log(`  ${attr.name}: ${attr.option}`);
          });
        }
      });
    } else {
      console.log(`No variations found with "Athlefit" in the product name`);
    }
    
    return allVariations;
  } catch (error) {
    console.error('Error listing variations:', error.message);
    return [];
  }
}

// Run the function
listAllVariations()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
  });
