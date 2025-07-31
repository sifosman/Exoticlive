#!/usr/bin/env node

/**
 * This script lists all products in WooCommerce.
 * 
 * Usage: node scripts/list-woocommerce-products.mjs [search_term]
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get command line arguments
const searchTerm = process.argv[2] || '';

// WooCommerce API credentials
const wcApiUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL || '';
const wcConsumerKey = process.env.WC_CONSUMER_KEY || '';
const wcConsumerSecret = process.env.WC_CONSUMER_SECRET || '';

// Create authentication header for WooCommerce API
const getWooCommerceAuthHeader = () => {
  const auth = Buffer.from(`${wcConsumerKey}:${wcConsumerSecret}`).toString('base64');
  return `Basic ${auth}`;
};

// Fetch products from WooCommerce
async function fetchProducts() {
  try {
    console.log('Fetching products from WooCommerce...');
    
    if (!wcApiUrl || !wcConsumerKey || !wcConsumerSecret) {
      throw new Error('WooCommerce API credentials not configured');
    }
    
    // Build the URL with query parameters
    let url = `${wcApiUrl}/wp-json/wc/v3/products?per_page=100`;
    
    // Add search term if provided
    if (searchTerm) {
      url += `&search=${encodeURIComponent(searchTerm)}`;
      console.log(`Searching for products containing: "${searchTerm}"`);
    }
    
    console.log(`Fetching products from: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': getWooCommerceAuthHeader()
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.statusText}`);
    }
    
    const products = await response.json();
    console.log(`Found ${products.length} products in WooCommerce`);
    
    return products;
  } catch (error) {
    console.error('Error fetching products from WooCommerce:', error);
    throw error;
  }
}

// Main function
async function main() {
  try {
    // Fetch products from WooCommerce
    const products = await fetchProducts();
    
    // Display products
    console.log('\nProducts:');
    console.log('=========');
    
    products.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name}`);
      console.log(`   ID: ${product.id}`);
      console.log(`   Type: ${product.type}`);
      console.log(`   Status: ${product.status}`);
      console.log(`   Created: ${new Date(product.date_created).toLocaleString()}`);
      console.log(`   Modified: ${new Date(product.date_modified).toLocaleString()}`);
      console.log(`   Stock Status: ${product.stock_status}`);
      console.log(`   Stock Quantity: ${product.stock_quantity || 'N/A'}`);
      console.log(`   Price: ${product.price}`);
      console.log('');
    });
    
    console.log(`Total: ${products.length} products`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the main function
main();
