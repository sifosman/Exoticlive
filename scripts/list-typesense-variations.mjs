#!/usr/bin/env node

/**
 * This script lists all variations in Typesense.
 * 
 * Usage: node scripts/list-typesense-variations.mjs
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

// List all variations in Typesense
async function listAllVariations() {
  try {
    console.log('Fetching all products from Typesense...');
    
    // Fetch all products
    const searchResponse = await typesenseClient
      .collections('products')
      .documents()
      .search({
        q: '*',
        per_page: 100
      });
    
    console.log(`Found ${searchResponse.found} products in Typesense`);
    
    // Extract products with variations
    const productsWithVariations = searchResponse.hits
      .map(hit => hit.document)
      .filter(product => {
        // Check if product has variations
        if (product.variations && Array.isArray(product.variations) && product.variations.length > 0) {
          return true;
        }
        
        // Check if product has variations_json
        if (product.variations_json) {
          try {
            const variations = JSON.parse(product.variations_json);
            return Array.isArray(variations) && variations.length > 0;
          } catch (error) {
            return false;
          }
        }
        
        return false;
      });
    
    console.log(`Found ${productsWithVariations.length} products with variations`);
    
    // Extract all variations
    let allVariations = [];
    
    for (const product of productsWithVariations) {
      console.log(`\nProduct: ${product.name} (ID: ${product.id})`);
      
      // Get variations from either variations array or variations_json
      let variations = [];
      
      if (product.variations && Array.isArray(product.variations)) {
        variations = product.variations;
        console.log('Using variations array');
      } else if (product.variations_json) {
        try {
          variations = JSON.parse(product.variations_json);
          console.log('Using parsed variations_json');
        } catch (error) {
          console.error('Error parsing variations_json:', error.message);
          continue;
        }
      }
      
      console.log(`Found ${variations.length} variations`);
      
      // Add product name and ID to each variation for easier identification
      const productVariations = variations.map(variation => ({
        ...variation,
        product_name: product.name,
        product_id: product.id
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
    }
    
    console.log(`\nTotal variations found: ${allVariations.length}`);
    
    // Search for variations with ID 58271
    console.log('\nSearching for variation with ID 58271:');
    const targetVariation = allVariations.find(variation => variation.id === '58271');
    
    if (targetVariation) {
      console.log('Found variation with ID 58271:');
      console.log(`Product: ${targetVariation.product_name} (ID: ${targetVariation.product_id})`);
      console.log(`Stock Status: ${targetVariation.stock_status}`);
      console.log(`Stock Quantity: ${targetVariation.stock_quantity}`);
      
      // Print attributes
      if (targetVariation.attributes && targetVariation.attributes.length > 0) {
        console.log('Attributes:');
        targetVariation.attributes.forEach(attr => {
          console.log(`  ${attr.name}: ${attr.option}`);
        });
      }
    } else {
      console.log('No variation found with ID 58271');
      
      // Search for variations with IDs close to 58271
      console.log('\nSearching for variations with IDs close to 58271:');
      const closeVariations = allVariations.filter(variation => {
        const variationId = parseInt(variation.id);
        return !isNaN(variationId) && Math.abs(variationId - 58271) <= 100;
      });
      
      if (closeVariations.length > 0) {
        console.log(`Found ${closeVariations.length} variations with IDs close to 58271:`);
        
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
        console.log(`No variations found with IDs close to 58271`);
      }
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
