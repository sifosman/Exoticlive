#!/usr/bin/env node

/**
 * This script tests the product deletion functionality by:
 * 1. Checking if a product exists in Typesense
 * 2. Deleting it from Typesense
 * 3. Verifying it was deleted
 * 
 * Usage: node scripts/test-product-deletion.mjs <product_id>
 */

import dotenv from 'dotenv';
import { Client as TypesenseClient } from 'typesense';

// Load environment variables
dotenv.config();

// Get command line arguments
const productId = process.argv[2];

if (!productId) {
  console.error('Please provide a product ID.');
  console.error('Usage: node scripts/test-product-deletion.mjs <product_id>');
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

// Check if product exists in Typesense
async function checkProductExists(productId) {
  try {
    const product = await typesenseClient
      .collections('products')
      .documents(productId)
      .retrieve();
    
    console.log(`✅ Product ${productId} exists in Typesense:`);
    console.log(`Name: ${product.name}`);
    console.log(`Stock Status: ${product.stock_status}`);
    console.log(`Variations Count: ${product.variations_count}`);
    
    return true;
  } catch (error) {
    console.log(`❌ Product ${productId} does not exist in Typesense.`);
    return false;
  }
}

// Delete product from Typesense
async function deleteProduct(productId) {
  try {
    await typesenseClient
      .collections('products')
      .documents(productId)
      .delete();
    
    console.log(`✅ Product ${productId} deleted from Typesense.`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to delete product ${productId} from Typesense:`, error);
    return false;
  }
}

// Main function
async function main() {
  try {
    console.log(`Testing deletion of product ${productId}...`);
    
    // Step 1: Check if product exists
    const exists = await checkProductExists(productId);
    
    if (!exists) {
      console.log('Product does not exist, nothing to delete.');
      return;
    }
    
    // Step 2: Delete the product
    console.log('\nDeleting product...');
    const deleted = await deleteProduct(productId);
    
    if (!deleted) {
      console.log('Failed to delete product.');
      return;
    }
    
    // Step 3: Verify it was deleted
    console.log('\nVerifying deletion...');
    const stillExists = await checkProductExists(productId);
    
    if (stillExists) {
      console.log('❌ Product still exists after deletion!');
    } else {
      console.log('✅ Product successfully deleted from Typesense.');
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the main function
main();
