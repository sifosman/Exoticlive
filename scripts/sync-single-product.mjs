#!/usr/bin/env node

/**
 * This script syncs a single product's stock information from WooCommerce to Typesense.
 * 
 * Usage: node scripts/sync-single-product.mjs <product_id>
 */

import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

// Get the product ID from command line arguments
const productId = process.argv[2] || '58264'; // Default to Athlefit Sandals

// WooCommerce API credentials
const wcApiUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL || '';
const wcConsumerKey = process.env.WC_CONSUMER_KEY || '';
const wcConsumerSecret = process.env.WC_CONSUMER_SECRET || '';

// Typesense configuration
const typesenseHost = process.env.TYPESENSE_HOST || process.env.NEXT_PUBLIC_TYPESENSE_HOST || '';
const typesensePort = process.env.TYPESENSE_PORT || process.env.NEXT_PUBLIC_TYPESENSE_PORT || '443';
const typesenseProtocol = process.env.TYPESENSE_PROTOCOL || process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL || 'https';
const typesenseApiKey = process.env.TYPESENSE_API_KEY || process.env.NEXT_PUBLIC_TYPESENSE_ADMIN_API_KEY || '';
const typesenseCollection = 'products';

// Create authentication header for WooCommerce API
const getWooCommerceAuthHeader = () => {
  const auth = Buffer.from(`${wcConsumerKey}:${wcConsumerSecret}`).toString('base64');
  return `Basic ${auth}`;
};

// Fetch variations for a product from WooCommerce
async function fetchVariationsFromWooCommerce(productId) {
  try {
    console.log(`Fetching variations for product ${productId} from WooCommerce...`);
    
    if (!wcApiUrl || !wcConsumerKey || !wcConsumerSecret) {
      throw new Error('WooCommerce API credentials not configured');
    }
    
    const response = await fetch(`${wcApiUrl}/wp-json/wc/v3/products/${productId}/variations?per_page=100`, {
      headers: {
        'Authorization': getWooCommerceAuthHeader()
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch variations: ${response.statusText}`);
    }
    
    const variations = await response.json();
    console.log(`Found ${variations.length} variations for product ${productId}`);
    
    return variations;
  } catch (error) {
    console.error(`Error fetching variations for product ${productId}:`, error);
    throw error;
  }
}

// Update product in Typesense
async function updateProductInTypesense(productId, variations) {
  try {
    console.log(`Updating product ${productId} in Typesense...`);
    
    // Process variations
    const processedVariations = variations.map(variation => {
      return {
        id: variation.id.toString(),
        price: parseFloat(variation.price || '0'),
        regular_price: parseFloat(variation.regular_price || '0'),
        sale_price: variation.sale_price ? parseFloat(variation.sale_price) : null,
        stock_status: variation.stock_status || 'outofstock',
        stock_quantity: variation.stock_quantity || 0,
        attributes: variation.attributes.map(attr => ({
          name: attr.name,
          option: attr.option
        }))
      };
    });
    
    // Send PATCH request to update the document
    const patchUrl = `${typesenseProtocol}://${typesenseHost}:${typesensePort}/collections/${typesenseCollection}/documents/${productId}`;
    console.log(`Sending PATCH request to: ${patchUrl}`);
    
    const updateData = {
      variations: processedVariations,
      variations_json: JSON.stringify(processedVariations),
      variations_count: processedVariations.length,
      in_stock_variations_count: processedVariations.filter(v => v.stock_status === 'instock').length
    };
    
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
    console.log(`Product ${productId} updated in Typesense with ${processedVariations.length} variations`);
    
    // Log the variations
    console.log('Variations:');
    processedVariations.forEach(variation => {
      console.log(`- ID: ${variation.id}, Stock: ${variation.stock_quantity}, Status: ${variation.stock_status}`);
    });
    
    return updateResult;
  } catch (error) {
    console.error(`Error updating product ${productId} in Typesense:`, error);
    throw error;
  }
}

// Sync a single product
async function syncSingleProduct(productId) {
  try {
    console.log(`Syncing product ${productId}...`);
    
    // Fetch variations for this product
    const variations = await fetchVariationsFromWooCommerce(productId);
    
    // Update the product in Typesense
    await updateProductInTypesense(productId, variations);
    
    console.log(`Product ${productId} synced successfully`);
  } catch (error) {
    console.error(`Error syncing product ${productId}:`, error);
  }
}

// Run the sync
syncSingleProduct(productId);
