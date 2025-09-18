// Script to fix product variations data in Typesense
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import Typesense from 'typesense';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Constants
const BATCH_SIZE = 50;
const LOG_FILE = './logs/fix-variations-log.txt';

// Ensure log directory exists
if (!fs.existsSync('./logs')) {
  fs.mkdirSync('./logs', { recursive: true });
}

// Initialize logger
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  
  console.log(logMessage);
  fs.appendFileSync(LOG_FILE, logMessage + '\n');
}

// Clear log file
fs.writeFileSync(LOG_FILE, '');
log('Starting Variations Data Fix...');

// Initialize Typesense client
const typesenseClient = new Typesense.Client({
  nodes: [
    {
      host: process.env.NEXT_PUBLIC_TYPESENSE_HOST,
      port: process.env.NEXT_PUBLIC_TYPESENSE_PORT,
      protocol: process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL,
    },
  ],
  apiKey: process.env.NEXT_PUBLIC_TYPESENSE_ADMIN_API_KEY,
  connectionTimeoutSeconds: 10,
});

// WooCommerce REST API
const WC_API_URL = `${process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://wp.exoticshoes.co.za'}/wp-json/wc/v3`;
const WC_CONSUMER_KEY = process.env.WC_CONSUMER_KEY || 'ck_f5c50ee5a52dd7ca50e72eb0f5a65bb84f87be61'; 
const WC_CONSUMER_SECRET = process.env.WC_CONSUMER_SECRET || 'cs_db3fe06c6278cfe84ce4b6a63e6a7b1baedf5a98';

// Basic authentication for WooCommerce REST API
const AUTH_STRING = Buffer.from(`${WC_CONSUMER_KEY}:${WC_CONSUMER_SECRET}`).toString('base64');

// Function to fetch variable products from Typesense
async function fetchVariableProducts() {
  try {
    let variableProducts = [];
    let page = 1;
    let hasMoreProducts = true;
    
    while (hasMoreProducts) {
      log(`Fetching variable products from Typesense, page ${page}...`);
      
      const searchResults = await typesenseClient
        .collections('products')
        .documents()
        .search({
          q: '*',
          filter_by: 'type:VARIABLE',
          per_page: 250,
          page,
        });
      
      if (!searchResults.hits || searchResults.hits.length === 0) {
        hasMoreProducts = false;
        break;
      }
      
      const products = searchResults.hits.map(hit => hit.document);
      variableProducts = [...variableProducts, ...products];
      
      log(`Retrieved ${products.length} variable products, total: ${variableProducts.length}`);
      
      page++;
    }
    
    return variableProducts;
  } catch (error) {
    log(`Error fetching variable products: ${error.message}`);
    return [];
  }
}

// Function to fetch variations for a product from WooCommerce
async function fetchProductVariations(productId) {
  try {
    const response = await fetch(`${WC_API_URL}/products/${productId}/variations?per_page=100`, {
      headers: {
        'Authorization': `Basic ${AUTH_STRING}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} - ${await response.text()}`);
    }

    const variations = await response.json();
    return variations;
  } catch (error) {
    log(`Error fetching variations for product ${productId}: ${error.message}`);
    return [];
  }
}

// Function to update a product in Typesense with variations data
async function updateProductWithVariations(product, variations) {
  try {
    // Process variations to ensure correct format
    const processedVariations = variations.map(variation => {
      return {
        id: variation.id,
        sku: variation.sku || '',
        price: parseFloat(variation.price || '0'),
        regular_price: parseFloat(variation.regular_price || '0'),
        sale_price: variation.sale_price ? parseFloat(variation.sale_price) : null,
        on_sale: !!variation.on_sale,
        purchasable: !!variation.purchasable,
        stock_status: (variation.stock_status || 'outofstock').toLowerCase(),
        stock_quantity: variation.stock_quantity || 0,
        image: variation.image ? {
          src: variation.image.src || '',
          alt: variation.image.alt || ''
        } : null,
        attributes: (variation.attributes || []).map(attr => ({
          name: attr.name || '',
          option: attr.option || ''
        }))
      };
    });
    
    // Update the product in Typesense
    await typesenseClient
      .collections('products')
      .documents(product.id)
      .update({
        variations_json: JSON.stringify(processedVariations)
      });
    
    return true;
  } catch (error) {
    log(`Error updating product ${product.id}: ${error.message}`);
    return false;
  }
}

// Main function to process all variable products
async function fixVariationsData() {
  try {
    // 1. Fetch all variable products from Typesense
    const variableProducts = await fetchVariableProducts();
    
    if (variableProducts.length === 0) {
      log('No variable products found in Typesense.');
      return;
    }
    
    log(`Found ${variableProducts.length} variable products to fix.`);
    
    // 2. Process products in batches
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < variableProducts.length; i += BATCH_SIZE) {
      const batch = variableProducts.slice(i, i + BATCH_SIZE);
      log(`Processing batch ${i/BATCH_SIZE + 1} of ${Math.ceil(variableProducts.length/BATCH_SIZE)}...`);
      
      // Process each product in the batch
      const batchPromises = batch.map(async (product) => {
        try {
          // Skip if already has variations
          if (product.variations_json && product.variations_json !== '[]') {
            log(`Product ${product.id} already has variations data, skipping.`);
            return { success: true, id: product.id };
          }
          
          // Fetch variations from WooCommerce
          const variations = await fetchProductVariations(product.id);
          
          if (variations.length === 0) {
            log(`No variations found for product ${product.id}.`);
            return { success: true, id: product.id, noVariations: true };
          }
          
          log(`Found ${variations.length} variations for product ${product.id}.`);
          
          // Update product with variations
          const updated = await updateProductWithVariations(product, variations);
          
          return { success: updated, id: product.id };
        } catch (error) {
          log(`Error processing product ${product.id}: ${error.message}`);
          return { success: false, id: product.id, error: error.message };
        }
      });
      
      // Wait for all batch operations to complete
      const results = await Promise.all(batchPromises);
      
      // Count successes and failures
      results.forEach(result => {
        if (result.success) {
          successCount++;
          if (result.noVariations) {
            log(`✓ Product ${result.id} processed (no variations found).`);
          } else {
            log(`✓ Product ${result.id} updated successfully.`);
          }
        } else {
          failCount++;
          log(`✗ Failed to update product ${result.id}: ${result.error}`);
        }
      });
      
      log(`Batch complete. Progress: ${i + batch.length}/${variableProducts.length} products processed.`);
    }
    
    log('===== FIX SUMMARY =====');
    log(`Total variable products: ${variableProducts.length}`);
    log(`Successfully processed: ${successCount}`);
    log(`Failed to process: ${failCount}`);
    log('=======================');
    
  } catch (error) {
    log(`Fatal error: ${error.message}`);
    process.exit(1);
  }
}

// Run the fix
fixVariationsData()
  .then(() => {
    log('Variations data fix completed.');
  })
  .catch((error) => {
    log(`Unhandled error: ${error.message}`);
    process.exit(1);
  });
