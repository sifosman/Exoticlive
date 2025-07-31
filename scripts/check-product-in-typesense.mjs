#!/usr/bin/env node

/**
 * This script checks if a product exists in Typesense by name or ID.
 * 
 * Usage: node scripts/check-product-in-typesense.mjs "testing new product"
 * Or:    node scripts/check-product-in-typesense.mjs --id 12345
 */

import dotenv from 'dotenv';
import { Client as TypesenseClient } from 'typesense';

// Load environment variables
dotenv.config();

// Get command line arguments
const args = process.argv.slice(2);
let searchById = false;
let searchTerm = '';

if (args[0] === '--id') {
  searchById = true;
  searchTerm = args[1];
} else {
  searchTerm = args[0];
}

if (!searchTerm) {
  console.error('Please provide a product name or ID to search for.');
  console.error('Usage: node scripts/check-product-in-typesense.mjs "product name"');
  console.error('   or: node scripts/check-product-in-typesense.mjs --id 12345');
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
  apiKey: process.env.TYPESENSE_API_KEY || process.env.NEXT_PUBLIC_TYPESENSE_ADMIN_API_KEY || '',
  connectionTimeoutSeconds: 10
});

// Search for the product
async function searchProduct() {
  try {
    if (searchById) {
      console.log(`Searching for product with ID: ${searchTerm}`);
      
      try {
        const product = await typesenseClient
          .collections('products')
          .documents(searchTerm)
          .retrieve();
        
        console.log('✅ Product found in Typesense:');
        console.log(`ID: ${product.id}`);
        console.log(`Name: ${product.name}`);
        console.log(`Stock Status: ${product.stock_status}`);
        console.log(`Variations Count: ${product.variations_count}`);
        
        return product;
      } catch (error) {
        console.error(`❌ Product with ID ${searchTerm} not found in Typesense.`);
        console.error('Error details:', error.message);
        return null;
      }
    } else {
      console.log(`Searching for product with name containing: "${searchTerm}"`);
      
      const searchParams = {
        q: searchTerm,
        query_by: 'name',
        per_page: 10
      };
      
      const searchResults = await typesenseClient
        .collections('products')
        .documents()
        .search(searchParams);
      
      if (searchResults.hits.length > 0) {
        console.log(`✅ Found ${searchResults.hits.length} matching products:`);
        
        searchResults.hits.forEach((hit, index) => {
          const product = hit.document;
          console.log(`\nProduct ${index + 1}:`);
          console.log(`ID: ${product.id}`);
          console.log(`Name: ${product.name}`);
          console.log(`Stock Status: ${product.stock_status}`);
          console.log(`Variations Count: ${product.variations_count || 0}`);
        });
        
        return searchResults.hits;
      } else {
        console.error(`❌ No products found with name containing "${searchTerm}".`);
        return null;
      }
    }
  } catch (error) {
    console.error('Error searching for product:', error);
    return null;
  }
}

// Run the search
searchProduct();
