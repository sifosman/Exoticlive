#!/usr/bin/env node

/**
 * This script directly updates Typesense using the fetch API to send a PATCH request.
 * 
 * Usage: node scripts/direct-update-typesense.mjs <product_id> <variation_id> <stock_quantity>
 */

import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

// Get command line arguments
const productId = process.argv[2] || '58264'; // Default to Athlefit Sandals
const variationId = process.argv[3] || '58271'; // Default to Size 9
const stockQuantity = parseInt(process.argv[4] || '4'); // Default to 4

// Typesense configuration
const typesenseHost = process.env.TYPESENSE_HOST || process.env.NEXT_PUBLIC_TYPESENSE_HOST || 'localhost';
const typesensePort = process.env.TYPESENSE_PORT || process.env.NEXT_PUBLIC_TYPESENSE_PORT || '443';
const typesenseProtocol = process.env.TYPESENSE_PROTOCOL || process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL || 'https';
const typesenseApiKey = process.env.TYPESENSE_API_KEY || process.env.NEXT_PUBLIC_TYPESENSE_ADMIN_API_KEY || '';
const typesenseCollection = 'products';

// Direct update function
async function directUpdateTypesense() {
  try {
    console.log(`Direct updating stock for product ${productId}, variation ${variationId} to ${stockQuantity} in Typesense...`);
    
    // First, get the current document to find the variation
    const getUrl = `${typesenseProtocol}://${typesenseHost}:${typesensePort}/collections/${typesenseCollection}/documents/${productId}`;
    console.log(`Fetching product from: ${getUrl}`);
    
    const getResponse = await fetch(getUrl, {
      method: 'GET',
      headers: {
        'X-TYPESENSE-API-KEY': typesenseApiKey,
        'Content-Type': 'application/json'
      }
    });
    
    if (!getResponse.ok) {
      const errorText = await getResponse.text();
      throw new Error(`Failed to fetch product: ${getResponse.status} ${getResponse.statusText} - ${errorText}`);
    }
    
    const product = await getResponse.json();
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
    
    // Create the update data
    const updateData = {
      variations: variations,
      variations_json: JSON.stringify(variations),
      variations_count: variations.length,
      in_stock_variations_count: variations.filter(v => v.stock_status === 'instock').length
    };
    
    console.log('Update data:', JSON.stringify(updateData, null, 2));
    
    // Send PATCH request to update the document
    const patchUrl = `${typesenseProtocol}://${typesenseHost}:${typesensePort}/collections/${typesenseCollection}/documents/${productId}`;
    console.log(`Sending PATCH request to: ${patchUrl}`);
    
    const patchResponse = await fetch(patchUrl, {
      method: 'PATCH',
      headers: {
        'X-TYPESENSE-API-KEY': typesenseApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });
    
    if (!patchResponse.ok) {
      const errorText = await patchResponse.text();
      throw new Error(`Failed to update product: ${patchResponse.status} ${patchResponse.statusText} - ${errorText}`);
    }
    
    const updateResult = await patchResponse.json();
    console.log('Typesense update result:', JSON.stringify(updateResult, null, 2));
    
    console.log(`✅ Successfully updated variation in Typesense`);
    console.log(`New stock status: ${variations[variationIndex].stock_status}`);
    console.log(`New stock quantity: ${variations[variationIndex].stock_quantity}`);
    
    return updateResult;
  } catch (error) {
    console.error('Error updating Typesense:', error);
  }
}

// Run the update
directUpdateTypesense();
