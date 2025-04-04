#!/usr/bin/env node

/**
 * This script checks a specific variation in Typesense to see its current stock status.
 * 
 * Usage: node scripts/check-typesense-variation.mjs <variation_id>
 */

import dotenv from 'dotenv';
import { Client as TypesenseClient } from 'typesense';

// Load environment variables
dotenv.config();

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

// Get variation ID from command line arguments
const variationId = process.argv[2];

if (!variationId) {
  console.error('❌ Please provide a variation ID as a command line argument');
  console.log('Usage: node scripts/check-typesense-variation.mjs <variation_id>');
  process.exit(1);
}

// Find the variation in Typesense
async function findVariationInTypesense(variationId) {
  try {
    console.log(`Searching for variation ${variationId} in Typesense...`);
    
    // Search for products that contain this variation ID
    const searchResponse = await typesenseClient
      .collections('products')
      .documents()
      .search({
        q: '*',
        filter_by: `variations.id:=${variationId}`,
        per_page: 1
      });
    
    console.log(`Search response: ${searchResponse.found} results found`);
    
    if (searchResponse.found > 0 && searchResponse.hits.length > 0) {
      const product = searchResponse.hits[0].document;
      console.log(`Found product: ${product.name} (ID: ${product.id})`);
      
      // Find the specific variation
      let variation = null;
      
      // Try to find in variations array
      if (product.variations && Array.isArray(product.variations)) {
        variation = product.variations.find(v => v.id === variationId);
      }
      
      // If not found and variations_json exists, try parsing that
      if (!variation && product.variations_json) {
        try {
          const parsedVariations = JSON.parse(product.variations_json);
          if (Array.isArray(parsedVariations)) {
            variation = parsedVariations.find(v => v.id === variationId);
          }
        } catch (error) {
          console.error('Error parsing variations_json:', error.message);
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
        
        return variation;
      } else {
        console.error(`❌ Variation ${variationId} not found in product ${product.id}`);
        return null;
      }
    } else {
      console.error(`❌ No products found containing variation ${variationId}`);
      return null;
    }
  } catch (error) {
    console.error('Error searching Typesense:', error.message);
    return null;
  }
}

// Run the search
findVariationInTypesense(variationId)
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
  });
