#!/usr/bin/env node

/**
 * This script updates a variation's stock in both WooCommerce and Typesense.
 * It then verifies that both systems have the same stock information.
 * 
 * Usage: node scripts/sync-variation-stock.mjs <variation_id> <stock_quantity>
 */

import dotenv from 'dotenv';
import { Client as TypesenseClient } from 'typesense';

// Load environment variables
dotenv.config();

// Get command line arguments
const variationId = process.argv[2];
const stockQuantity = parseInt(process.argv[3]);

if (!variationId || isNaN(stockQuantity)) {
  console.error('❌ Please provide a variation ID and stock quantity');
  console.log('Usage: node scripts/sync-variation-stock.mjs <variation_id> <stock_quantity>');
  process.exit(1);
}

// WooCommerce API credentials
const wcApiUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://wp.exoticshoes.co.za';
const wcConsumerKey = process.env.WC_CONSUMER_KEY || '';
const wcConsumerSecret = process.env.WC_CONSUMER_SECRET || '';

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

// Create authentication header for WooCommerce API
const getAuthHeader = () => {
  const auth = Buffer.from(`${wcConsumerKey}:${wcConsumerSecret}`).toString('base64');
  return `Basic ${auth}`;
};

// Find the parent product for a variation in WooCommerce
async function findParentProduct(variationId) {
  try {
    console.log(`Finding parent product for variation ${variationId}...`);
    
    // First, we need to find which product this variation belongs to
    const response = await fetch(`${wcApiUrl}/wp-json/wc/v3/products?per_page=100`, {
      headers: {
        'Authorization': getAuthHeader()
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.statusText}`);
    }
    
    const products = await response.json();
    
    // Find the parent product
    for (const product of products) {
      if (product.type === 'variable') {
        // Fetch variations for this product
        const variationsResponse = await fetch(`${wcApiUrl}/wp-json/wc/v3/products/${product.id}/variations?per_page=100`, {
          headers: {
            'Authorization': getAuthHeader()
          }
        });
        
        if (variationsResponse.ok) {
          const variations = await variationsResponse.json();
          
          // Check if this variation belongs to this product
          const foundVariation = variations.find(v => v.id.toString() === variationId);
          
          if (foundVariation) {
            console.log(`Found parent product: ${product.name} (ID: ${product.id})`);
            return { parentProduct: product, variation: foundVariation };
          }
        }
      }
    }
    
    throw new Error(`Parent product for variation ${variationId} not found`);
  } catch (error) {
    console.error('Error finding parent product:', error.message);
    throw error;
  }
}

// Update variation stock in WooCommerce
async function updateWooCommerceStock(parentProductId, variationId, stockQuantity) {
  try {
    console.log(`Updating variation ${variationId} stock in WooCommerce to ${stockQuantity}...`);
    
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
    console.error(`Error updating variation in WooCommerce:`, error.message);
    throw error;
  }
}

// Update variation stock in Typesense
async function updateTypesenseStock(parentProductId, variationId, stockQuantity) {
  try {
    console.log(`Updating variation ${variationId} stock in Typesense to ${stockQuantity}...`);
    
    // Fetch the product from Typesense
    const product = await typesenseClient
      .collections('products')
      .documents(parentProductId.toString())
      .retrieve();
    
    console.log(`Found product in Typesense: ${product.name}`);
    
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
    const variationIndex = variations.findIndex(v => v.id === variationId);
    
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
    console.error(`Error updating variation in Typesense:`, error.message);
    throw error;
  }
}

// Verify that both systems have the same stock information
async function verifyStockSync(parentProductId, variationId) {
  try {
    console.log(`\nVerifying stock synchronization for variation ${variationId}...`);
    
    // Fetch from WooCommerce
    const wooResponse = await fetch(`${wcApiUrl}/wp-json/wc/v3/products/${parentProductId}/variations/${variationId}`, {
      headers: {
        'Authorization': getAuthHeader()
      }
    });
    
    if (!wooResponse.ok) {
      throw new Error(`Failed to fetch variation from WooCommerce: ${wooResponse.statusText}`);
    }
    
    const wooVariation = await wooResponse.json();
    
    // Fetch from Typesense
    const typesenseProduct = await typesenseClient
      .collections('products')
      .documents(parentProductId.toString())
      .retrieve();
    
    // Find the variation in Typesense
    let typesenseVariation = null;
    
    if (typesenseProduct.variations) {
      typesenseVariation = typesenseProduct.variations.find(v => v.id === variationId);
    } else if (typesenseProduct.variations_json) {
      try {
        const variations = JSON.parse(typesenseProduct.variations_json);
        typesenseVariation = variations.find(v => v.id === variationId);
      } catch (error) {
        console.error('Error parsing variations_json:', error.message);
      }
    }
    
    if (!typesenseVariation) {
      throw new Error(`Variation ${variationId} not found in Typesense`);
    }
    
    // Compare stock information
    console.log('\nStock information comparison:');
    console.log('----------------------------');
    console.log(`WooCommerce stock quantity: ${wooVariation.stock_quantity}`);
    console.log(`Typesense stock quantity: ${typesenseVariation.stock_quantity}`);
    console.log(`WooCommerce stock status: ${wooVariation.stock_status}`);
    console.log(`Typesense stock status: ${typesenseVariation.stock_status}`);
    
    const stockQuantityMatch = wooVariation.stock_quantity === typesenseVariation.stock_quantity;
    const stockStatusMatch = wooVariation.stock_status === typesenseVariation.stock_status;
    
    if (stockQuantityMatch && stockStatusMatch) {
      console.log('\n✅ Stock information is synchronized between WooCommerce and Typesense');
    } else {
      console.log('\n❌ Stock information is NOT synchronized:');
      if (!stockQuantityMatch) {
        console.log(`- Stock quantity mismatch: WooCommerce=${wooVariation.stock_quantity}, Typesense=${typesenseVariation.stock_quantity}`);
      }
      if (!stockStatusMatch) {
        console.log(`- Stock status mismatch: WooCommerce=${wooVariation.stock_status}, Typesense=${typesenseVariation.stock_status}`);
      }
    }
    
    return { wooVariation, typesenseVariation };
  } catch (error) {
    console.error('Error verifying stock synchronization:', error.message);
    return null;
  }
}

// Main function to update and verify stock
async function syncVariationStock() {
  try {
    // Find the parent product
    const { parentProduct, variation } = await findParentProduct(variationId);
    
    // Update stock in WooCommerce
    await updateWooCommerceStock(parentProduct.id, variationId, stockQuantity);
    
    // Update stock in Typesense
    await updateTypesenseStock(parentProduct.id, variationId, stockQuantity);
    
    // Verify that both systems have the same stock information
    await verifyStockSync(parentProduct.id, variationId);
    
    console.log('\n✅ Stock synchronization complete');
  } catch (error) {
    console.error('\n❌ Error synchronizing stock:', error.message);
  }
}

// Run the sync
syncVariationStock();
