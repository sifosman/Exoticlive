#!/usr/bin/env node

/**
 * This script updates the stock level of a variation in Typesense directly.
 * 
 * Usage: node scripts/update-typesense-stock.mjs <product_id> <variation_id> <stock_quantity>
 */

import dotenv from 'dotenv';
import { Client as TypesenseClient } from 'typesense';

// Load environment variables
dotenv.config();

// Get command line arguments
const productId = process.argv[2] || '58264'; // Default to Athlefit Sandals
const variationId = process.argv[3] || '58271'; // Default to Size 9
const stockQuantity = parseInt(process.argv[4] || '3'); // Default to 3

// Initialize Typesense client
const typesenseClient = new TypesenseClient({
  nodes: [
    {
      host: process.env.TYPESENSE_HOST || process.env.NEXT_PUBLIC_TYPESENSE_HOST || 'localhost',
      port: parseInt(process.env.TYPESENSE_PORT || process.env.NEXT_PUBLIC_TYPESENSE_PORT || '443'),
      protocol: process.env.TYPESENSE_PROTOCOL || process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL || 'https'
    }
  ],
  apiKey: process.env.TYPESENSE_API_KEY || process.env.NEXT_PUBLIC_TYPESENSE_ADMIN_API_KEY || '',
  connectionTimeoutSeconds: 10
});

// Update the stock level in Typesense
async function updateTypesenseStock() {
  try {
    console.log(`Updating stock for product ${productId}, variation ${variationId} to ${stockQuantity} in Typesense...`);
    
    // Fetch the product from Typesense
    const product = await typesenseClient
      .collections('products')
      .documents(productId)
      .retrieve();
    
    console.log(`Found product: ${product.name} (ID: ${product.id})`);
    
    // Get variations from either the array or the JSON string
    let variations = [];
    
    if (product.variations && Array.isArray(product.variations)) {
      variations = [...product.variations];
      console.log('Using variations array');
    } else if (product.variations_json) {
      try {
        variations = JSON.parse(product.variations_json);
        console.log('Using parsed variations_json');
      } catch (error) {
        console.error('Error parsing variations_json:', error);
        variations = [];
      }
    }
    
    if (!Array.isArray(variations)) {
      throw new Error('Variations is not an array');
    }
    
    console.log(`Found ${variations.length} variations`);
    
    // Find the variation to update
    const variationIndex = variations.findIndex(v => v.id === variationId);
    
    if (variationIndex === -1) {
      throw new Error(`Variation ${variationId} not found in product ${productId}`);
    }
    
    console.log(`Found variation at index ${variationIndex}`);
    console.log(`Current stock status: ${variations[variationIndex].stock_status}`);
    console.log(`Current stock quantity: ${variations[variationIndex].stock_quantity}`);
    
    // Update the variation
    variations[variationIndex].stock_quantity = stockQuantity;
    variations[variationIndex].stock_status = stockQuantity > 0 ? 'instock' : 'outofstock';
    
    // Update the product in Typesense
    const updateResult = await typesenseClient
      .collections('products')
      .documents(productId)
      .update({
        variations: variations,
        variations_json: JSON.stringify(variations)
      });
    
    console.log(`✅ Successfully updated variation in Typesense`);
    console.log(`New stock status: ${variations[variationIndex].stock_status}`);
    console.log(`New stock quantity: ${variations[variationIndex].stock_quantity}`);
    
    return updateResult;
  } catch (error) {
    console.error('Error updating Typesense stock:', error);
  }
}

// Run the update
updateTypesenseStock();
