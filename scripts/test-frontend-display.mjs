#!/usr/bin/env node

/**
 * This script simulates how the frontend fetches and displays product data.
 * It uses the same data sources and logic as the frontend to help identify issues.
 * 
 * Usage: node scripts/test-frontend-display.mjs <product_slug> <variation_id>
 */

import dotenv from 'dotenv';
import { Client as TypesenseClient } from 'typesense';

// Load environment variables
dotenv.config();

// Get command line arguments
const productSlug = process.argv[2];
const variationId = process.argv[3];

if (!productSlug) {
  console.error('❌ Please provide a product slug');
  console.log('Usage: node scripts/test-frontend-display.mjs <product_slug> <variation_id>');
  process.exit(1);
}

// Initialize Typesense client
const typesenseClient = new TypesenseClient({
  nodes: [
    {
      host: process.env.TYPESENSE_HOST || process.env.NEXT_PUBLIC_TYPESENSE_HOST || 'localhost',
      port: parseInt(process.env.TYPESENSE_PORT || process.env.NEXT_PUBLIC_TYPESENSE_PORT || '443'),
      protocol: process.env.TYPESENSE_PROTOCOL || process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL || 'https'
    }
  ],
  apiKey: process.env.TYPESENSE_SEARCH_API_KEY || process.env.NEXT_PUBLIC_TYPESENSE_SEARCH_API_KEY || '',
  connectionTimeoutSeconds: 10
});

// Fetch product data from Typesense (simulating frontend behavior)
async function fetchProductData(slug) {
  try {
    console.log(`Fetching product data for slug: ${slug}...`);
    
    // Search for the product by slug
    const searchResponse = await typesenseClient
      .collections('products')
      .documents()
      .search({
        q: '*',
        filter_by: `slug:=${slug}`,
        per_page: 1
      });
    
    if (searchResponse.found === 0 || searchResponse.hits.length === 0) {
      throw new Error(`Product with slug '${slug}' not found`);
    }
    
    const product = searchResponse.hits[0].document;
    console.log(`Found product: ${product.name} (ID: ${product.id})`);
    
    return product;
  } catch (error) {
    console.error('Error fetching product data:', error.message);
    throw error;
  }
}

// Simulate how the frontend would display a variation
async function simulateFrontendDisplay(product, variationId) {
  console.log('\nSimulating frontend display:');
  console.log('----------------------------');
  
  // Parse variations
  let variations = [];
  
  if (product.variations && Array.isArray(product.variations)) {
    variations = product.variations;
    console.log('Using variations array from product data');
  } else if (product.variations_json) {
    try {
      variations = JSON.parse(product.variations_json);
      console.log('Using parsed variations_json from product data');
    } catch (error) {
      console.error('Error parsing variations_json:', error.message);
    }
  }
  
  console.log(`Found ${variations.length} variations`);
  
  // If a specific variation ID was provided, show that variation
  if (variationId) {
    const variation = variations.find(v => v.id === variationId);
    
    if (variation) {
      console.log('\nVariation details:');
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
      
      // Simulate how the frontend would display stock information
      console.log('\nFrontend display:');
      const inStock = variation.stock_status === 'instock';
      console.log(`Stock Status Display: ${inStock ? 'In Stock' : 'Out of Stock'}`);
      console.log(`Add to Cart Button: ${inStock ? 'Enabled' : 'Disabled'}`);
      
      if (variation.stock_quantity !== undefined && variation.stock_quantity !== null) {
        console.log(`Quantity Selector Max: ${variation.stock_quantity}`);
      } else {
        console.log('Quantity Selector Max: Not limited');
      }
    } else {
      console.error(`❌ Variation ${variationId} not found in product data`);
    }
  } else {
    // Show all variations
    console.log('\nAll variations:');
    variations.forEach(variation => {
      console.log(`\nVariation ID: ${variation.id}`);
      console.log(`Stock Status: ${variation.stock_status}`);
      console.log(`Stock Quantity: ${variation.stock_quantity}`);
      
      // Print attributes if available
      if (variation.attributes && Array.isArray(variation.attributes)) {
        console.log('Attributes:');
        variation.attributes.forEach(attr => {
          console.log(`- ${attr.name}: ${attr.option}`);
        });
      }
    });
  }
}

// Main function
async function testFrontendDisplay() {
  try {
    // Fetch product data
    const product = await fetchProductData(productSlug);
    
    // Simulate frontend display
    await simulateFrontendDisplay(product, variationId);
    
    console.log('\n✅ Frontend display simulation complete');
  } catch (error) {
    console.error('\n❌ Error testing frontend display:', error.message);
  }
}

// Run the test
testFrontendDisplay();
