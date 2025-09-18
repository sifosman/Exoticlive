#!/usr/bin/env node

/**
 * This script checks the current stock level of a variation in Typesense.
 * 
 * Usage: node scripts/check-typesense-stock.mjs <product_id> <variation_id>
 */

import dotenv from 'dotenv';
import { Client as TypesenseClient } from 'typesense';

// Load environment variables
dotenv.config();

// Get command line arguments
const productId = process.argv[2] || '58264'; // Default to Athlefit Sandals
const variationId = process.argv[3] || '58271'; // Default to Size 9

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

// Check the stock level in Typesense
async function checkTypesenseStock() {
  try {
    console.log(`Checking stock for product ${productId}, variation ${variationId} in Typesense...`);
    
    // Fetch the product from Typesense
    const product = await typesenseClient
      .collections('products')
      .documents(productId)
      .retrieve();
    
    console.log(`Found product: ${product.name} (ID: ${product.id})`);
    
    // Find the variation
    let variation = null;
    
    // Try to find in variations array
    if (product.variations && Array.isArray(product.variations)) {
      variation = product.variations.find(v => v.id === variationId);
      console.log('Found variation in variations array');
    }
    
    // If not found and variations_json exists, try parsing that
    if (!variation && product.variations_json) {
      try {
        const parsedVariations = JSON.parse(product.variations_json);
        if (Array.isArray(parsedVariations)) {
          variation = parsedVariations.find(v => v.id === variationId);
          console.log('Found variation in variations_json');
        }
      } catch (error) {
        console.error('Error parsing variations_json:', error);
      }
    }
    
    if (variation) {
      console.log('\n✅ Variation found in Typesense:');
      console.log('----------------------------');
      console.log(`ID: ${variation.id}`);
      console.log(`Stock Status: ${variation.stock_status}`);
      console.log(`Stock Quantity: ${variation.stock_quantity}`);
      
      // Print attributes if available
      if (variation.attributes && Array.isArray(variation.attributes)) {
        console.log('\nAttributes:');
        variation.attributes.forEach(attr => {
          console.log(`- ${attr.name}: ${attr.option}`);
        });
      }
    } else {
      console.error(`❌ Variation ${variationId} not found in product ${productId}`);
    }
  } catch (error) {
    console.error('Error checking Typesense stock:', error);
  }
}

// Run the check
checkTypesenseStock();
