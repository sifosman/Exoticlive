#!/usr/bin/env node

/**
 * This script updates a variation's stock in both WooCommerce and Typesense.
 * 
 * Usage: node scripts/update-variation-stock.mjs <parent_product_id> <variation_id> <stock_quantity>
 */

import dotenv from 'dotenv';
import { Client as TypesenseClient } from 'typesense';

// Load environment variables
dotenv.config();

// Get WooCommerce API credentials from environment variables
const wcApiUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://wp.exoticshoes.co.za';
const wcConsumerKey = process.env.WC_CONSUMER_KEY || '';
const wcConsumerSecret = process.env.WC_CONSUMER_SECRET || '';

// Initialize Typesense client
const typesenseClient = new TypesenseClient({
  nodes: [
    {
      host: process.env.TYPESENSE_HOST || process.env.NEXT_PUBLIC_TYPESENSE_HOST || 'localhost',
      port: parseInt(process.env.TYPESENSE_PORT || process.env.NEXT_PUBLIC_TYPESENSE_PORT || '8108'),
      protocol: process.env.TYPESENSE_PROTOCOL || process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL || 'http'
    }
  ],
  apiKey: process.env.TYPESENSE_API_KEY || process.env.NEXT_PUBLIC_TYPESENSE_ADMIN_API_KEY || '',
  connectionTimeoutSeconds: 10
});

// Create authentication header for WooCommerce API
const getAuthHeader = () => {
  const auth = Buffer.from(`${wcConsumerKey}:${wcConsumerSecret}`).toString('base64');
  return `Basic ${auth}`;
};

// Update a variation's stock in WooCommerce
async function updateVariationStockInWooCommerce(parentProductId, variationId, stockQuantity) {
  try {
    console.log(`Updating variation ${variationId} stock in WooCommerce...`);
    
    const response = await fetch(`${wcApiUrl}/wp-json/wc/v3/products/${parentProductId}/variations/${variationId}`, {
      method: 'PUT',
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        stock_quantity: stockQuantity,
        stock_status: stockQuantity > 0 ? 'instock' : 'outofstock'
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update variation: ${response.statusText}`);
    }
    
    const updatedVariation = await response.json();
    console.log(`✅ Successfully updated variation in WooCommerce`);
    console.log(`Stock quantity: ${updatedVariation.stock_quantity}`);
    console.log(`Stock status: ${updatedVariation.stock_status}`);
    
    return updatedVariation;
  } catch (error) {
    console.error(`❌ Error updating variation in WooCommerce:`, error.message);
    throw error;
  }
}

// Fetch a product from Typesense
async function fetchProductFromTypesense(productId) {
  try {
    console.log(`Fetching product ${productId} from Typesense...`);
    
    const product = await typesenseClient
      .collections('products')
      .documents(productId.toString())
      .retrieve();
    
    console.log(`✅ Successfully fetched product from Typesense`);
    return product;
  } catch (error) {
    console.error(`❌ Error fetching product from Typesense:`, error.message);
    throw error;
  }
}

// Update a variation's stock in Typesense
async function updateVariationStockInTypesense(parentProductId, variationId, stockQuantity) {
  try {
    console.log(`Updating variation ${variationId} stock in Typesense...`);
    
    // Fetch the product from Typesense
    const product = await fetchProductFromTypesense(parentProductId);
    
    // Check if the product has variations
    if (!product.variations && !product.variations_json) {
      throw new Error('Product does not have variations in Typesense');
    }
    
    // Parse variations if they're stored as JSON
    let variations = product.variations;
    if (!variations && product.variations_json) {
      try {
        variations = JSON.parse(product.variations_json);
      } catch (error) {
        console.error('Error parsing variations_json:', error.message);
        variations = [];
      }
    }
    
    if (!Array.isArray(variations)) {
      throw new Error('Variations is not an array');
    }
    
    console.log(`Found ${variations.length} variations in Typesense`);
    
    // Find the variation to update
    const variationIndex = variations.findIndex(v => v.id === variationId.toString());
    
    if (variationIndex === -1) {
      throw new Error(`Variation ${variationId} not found in product ${parentProductId}`);
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
      .documents(parentProductId.toString())
      .update({
        variations: variations,
        variations_json: JSON.stringify(variations)
      });
    
    console.log(`✅ Successfully updated variation in Typesense`);
    return updateResult;
  } catch (error) {
    console.error(`❌ Error updating variation in Typesense:`, error.message);
    throw error;
  }
}

// Main function to update a variation's stock
async function updateVariationStock(parentProductId, variationId, stockQuantity) {
  try {
    console.log(`Updating stock for variation ${variationId} of product ${parentProductId} to ${stockQuantity}...`);
    
    // Update in WooCommerce
    await updateVariationStockInWooCommerce(parentProductId, variationId, stockQuantity);
    
    // Update in Typesense
    await updateVariationStockInTypesense(parentProductId, variationId, stockQuantity);
    
    console.log(`✅ Successfully updated variation stock in both WooCommerce and Typesense`);
  } catch (error) {
    console.error(`❌ Error updating variation stock:`, error.message);
  }
}

// Get command line arguments
const parentProductId = process.argv[2];
const variationId = process.argv[3];
const stockQuantity = parseInt(process.argv[4]);

if (!parentProductId || !variationId || isNaN(stockQuantity)) {
  console.error('❌ Please provide all required arguments');
  console.log('Usage: node scripts/update-variation-stock.mjs <parent_product_id> <variation_id> <stock_quantity>');
  process.exit(1);
}

// Run the update
updateVariationStock(parentProductId, variationId, stockQuantity);
