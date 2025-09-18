#!/usr/bin/env node

/**
 * This script syncs stock data from WooCommerce to Typesense.
 * It can be run as a cron job to keep Typesense in sync with WooCommerce.
 * 
 * Usage: node scripts/sync-woocommerce-stock.mjs [--product-id=123]
 */

import dotenv from 'dotenv';
import { Client as TypesenseClient } from 'typesense';
import minimist from 'minimist';

// Parse command line arguments
const argv = minimist(process.argv.slice(2));
const specificProductId = argv['product-id'];

// Load environment variables
dotenv.config();

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

// Fetch products from WooCommerce
async function fetchWooCommerceProducts(page = 1, perPage = 50) {
  try {
    console.log(`Fetching WooCommerce products (page ${page}, per_page ${perPage})...`);
    
    let url = `${wcApiUrl}/wp-json/wc/v3/products?page=${page}&per_page=${perPage}`;
    
    // If a specific product ID was provided, only fetch that product
    if (specificProductId) {
      url = `${wcApiUrl}/wp-json/wc/v3/products/${specificProductId}`;
    }
    
    const response = await fetch(url, {
      headers: {
        'Authorization': getAuthHeader()
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.statusText}`);
    }
    
    // If fetching a specific product, wrap it in an array
    if (specificProductId) {
      const product = await response.json();
      return [product];
    }
    
    const products = await response.json();
    
    // Check if there are more pages
    const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1');
    
    if (page < totalPages) {
      // Fetch the next page
      const nextPageProducts = await fetchWooCommerceProducts(page + 1, perPage);
      return [...products, ...nextPageProducts];
    }
    
    return products;
  } catch (error) {
    console.error(`Error fetching WooCommerce products:`, error);
    return [];
  }
}

// Fetch variations for a product
async function fetchProductVariations(productId) {
  try {
    console.log(`Fetching variations for product ${productId}...`);
    
    const response = await fetch(`${wcApiUrl}/wp-json/wc/v3/products/${productId}/variations?per_page=100`, {
      headers: {
        'Authorization': getAuthHeader()
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch variations: ${response.statusText}`);
    }
    
    const variations = await response.json();
    return variations;
  } catch (error) {
    console.error(`Error fetching variations for product ${productId}:`, error);
    return [];
  }
}

// Update a product in Typesense
async function updateProductInTypesense(product, variations) {
  try {
    console.log(`Updating product ${product.id} in Typesense...`);
    
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
    
    // Check if the product exists in Typesense
    let existingProduct;
    try {
      existingProduct = await typesenseClient
        .collections('products')
        .documents(product.id.toString())
        .retrieve();
      
      console.log(`Product ${product.id} exists in Typesense`);
    } catch (error) {
      console.log(`Product ${product.id} does not exist in Typesense, will create it`);
      existingProduct = null;
    }
    
    if (existingProduct) {
      // Update only the stock-related fields
      await typesenseClient
        .collections('products')
        .documents(product.id.toString())
        .update({
          stock_status: product.stock_status,
          stock_quantity: product.stock_quantity || 0,
          variations: processedVariations,
          variations_json: JSON.stringify(processedVariations),
          variations_count: processedVariations.length,
          in_stock_variations_count: processedVariations.filter(v => v.stock_status === 'instock').length
        });
      
      console.log(`Updated product ${product.id} in Typesense`);
    } else {
      console.log(`Product ${product.id} not found in Typesense, skipping`);
    }
    
    return true;
  } catch (error) {
    console.error(`Error updating product ${product.id} in Typesense:`, error);
    return false;
  }
}

// Main function to sync stock data
async function syncStockData() {
  try {
    console.log('Starting stock data sync...');
    
    // Fetch products from WooCommerce
    const products = await fetchWooCommerceProducts();
    console.log(`Fetched ${products.length} products from WooCommerce`);
    
    // Filter for variable products
    const variableProducts = products.filter(product => product.type === 'variable');
    console.log(`Found ${variableProducts.length} variable products`);
    
    // Process each variable product
    let successCount = 0;
    let failureCount = 0;
    
    for (const product of variableProducts) {
      try {
        // Fetch variations for this product
        const variations = await fetchProductVariations(product.id);
        console.log(`Fetched ${variations.length} variations for product ${product.id}`);
        
        // Update the product in Typesense
        const success = await updateProductInTypesense(product, variations);
        
        if (success) {
          successCount++;
        } else {
          failureCount++;
        }
      } catch (error) {
        console.error(`Error processing product ${product.id}:`, error);
        failureCount++;
      }
    }
    
    console.log(`\nSync completed:`);
    console.log(`- Successfully updated ${successCount} products`);
    console.log(`- Failed to update ${failureCount} products`);
    
    return { successCount, failureCount };
  } catch (error) {
    console.error('Error syncing stock data:', error);
    return { successCount: 0, failureCount: 0 };
  }
}

// Run the sync
syncStockData()
  .then(() => {
    console.log('Stock sync completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error running stock sync:', error);
    process.exit(1);
  });
