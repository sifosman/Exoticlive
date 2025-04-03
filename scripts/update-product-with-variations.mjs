#!/usr/bin/env node

/**
 * This script updates a product in Typesense with the latest variation data from WooCommerce.
 * It can be used to manually update a product's variations when they're not being updated automatically.
 * 
 * Usage: node scripts/update-product-with-variations.mjs <product_id>
 */

import dotenv from 'dotenv';
import { Client as TypesenseClient } from 'typesense';

// Load environment variables
dotenv.config();

// Initialize WooCommerce API client
const wcApiUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://wp.exoticshoes.co.za';
const wcConsumerKey = process.env.WC_CONSUMER_KEY || '';
const wcConsumerSecret = process.env.WC_CONSUMER_SECRET || '';

// Initialize Typesense client
const typesenseClient = new TypesenseClient({
  nodes: [
    {
      host: process.env.TYPESENSE_HOST || 'localhost',
      port: parseInt(process.env.TYPESENSE_PORT || '8108'),
      protocol: process.env.TYPESENSE_PROTOCOL || 'http'
    }
  ],
  apiKey: process.env.TYPESENSE_API_KEY || '',
  connectionTimeoutSeconds: 10
});

// Create authentication header for WooCommerce API
const getAuthHeader = () => {
  const auth = Buffer.from(`${wcConsumerKey}:${wcConsumerSecret}`).toString('base64');
  return `Basic ${auth}`;
};

// Fetch a product from WooCommerce
async function fetchProductFromWooCommerce(productId) {
  try {
    console.log(`Fetching product ${productId} from WooCommerce...`);
    
    const response = await fetch(`${wcApiUrl}/wp-json/wc/v3/products/${productId}`, {
      headers: {
        'Authorization': getAuthHeader()
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch product: ${response.statusText}`);
    }
    
    const product = await response.json();
    console.log(`✅ Successfully fetched product: ${product.name}`);
    return product;
  } catch (error) {
    console.error(`❌ Error fetching product from WooCommerce:`, error.message);
    throw error;
  }
}

// Fetch variations for a product from WooCommerce
async function fetchVariationsFromWooCommerce(productId) {
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
    console.log(`✅ Successfully fetched ${variations.length} variations`);
    return variations;
  } catch (error) {
    console.error(`❌ Error fetching variations from WooCommerce:`, error.message);
    throw error;
  }
}

// Transform a product from WooCommerce to Typesense format
function transformProduct(product, variations = []) {
  // Extract categories
  const categories = product.categories ? 
    product.categories.map(cat => cat.name) : [];

  // Extract tags
  const tags = product.tags ?
    product.tags.map(tag => tag.name) : [];
    
  // Extract attributes for faceting
  const attributes = product.attributes || [];
  
  // Extract colors and sizes specifically for faceting
  const colors = [];
  const sizes = [];
  
  attributes.forEach(attr => {
    if (attr.name && attr.name.toLowerCase() === 'color') {
      colors.push(...attr.options);
    }
    if (attr.name && attr.name.toLowerCase() === 'size') {
      sizes.push(...attr.options);
    }
  });
  
  // Get the main image URL
  const image_url = product.images && product.images.length > 0 ? 
    product.images[0].src : '';
  
  // Get gallery images
  const galleryImages = product.images ? 
    product.images.map(img => img.src) : [];
  
  // Process variations
  const processedVariations = variations.map(variation => {
    // Map variation attributes
    const variationAttributes = variation.attributes.map(attr => ({
      name: attr.name,
      option: attr.option
    }));
    
    return {
      id: variation.id.toString(),
      price: parseFloat(variation.price || '0'),
      regular_price: parseFloat(variation.regular_price || '0'),
      sale_price: variation.sale_price ? parseFloat(variation.sale_price) : null,
      stock_status: variation.stock_status || 'outofstock',
      stock_quantity: variation.stock_quantity || 0,
      attributes: variationAttributes
    };
  });
  
  // Check if product is on sale
  const isOnSale = product.on_sale || false;
  
  // Get date created
  const dateCreated = product.date_created || '';
  
  // Create the transformed product
  return {
    id: product.id.toString(),
    name: product.name,
    description: product.description ? 
      product.description.replace(/<[^>]*>?/gm, '') : '', // Strip HTML
    short_description: product.short_description ? 
      product.short_description.replace(/<[^>]*>?/gm, '') : '',
    price: parseFloat(product.price || 0),
    sale_price: product.sale_price ? parseFloat(product.sale_price) : null,
    regular_price: product.regular_price ? parseFloat(product.regular_price) : null,
    categories,
    tags,
    colors,
    sizes,
    attributes,
    image_url,
    gallery_images: galleryImages,
    slug: product.slug,
    stock_status: product.stock_status || 'outofstock',
    stock_quantity: product.stock_quantity || 0,
    is_featured: !!product.featured,
    is_on_sale: isOnSale,
    average_rating: parseFloat(product.average_rating || 0),
    date_created: dateCreated,
    catalog_visibility: product.catalog_visibility || 'visible',
    sku: product.sku || '',
    status: product.status || 'publish',
    variations: processedVariations,
    variations_json: JSON.stringify(processedVariations)
  };
}

// Update a product in Typesense
async function updateProductInTypesense(productId, transformedProduct) {
  try {
    console.log(`Updating product ${productId} in Typesense...`);
    
    const result = await typesenseClient
      .collections('products')
      .documents(productId.toString())
      .update(transformedProduct);
    
    console.log(`✅ Successfully updated product in Typesense`);
    return result;
  } catch (error) {
    console.error(`❌ Error updating product in Typesense:`, error.message);
    throw error;
  }
}

// Main function to update a product with variations
async function updateProductWithVariations(productId) {
  try {
    console.log(`Starting update for product ${productId}...`);
    
    // Fetch product from WooCommerce
    const product = await fetchProductFromWooCommerce(productId);
    
    // Fetch variations from WooCommerce
    const variations = await fetchVariationsFromWooCommerce(productId);
    
    // Transform product with variations
    const transformedProduct = transformProduct(product, variations);
    
    // Update product in Typesense
    await updateProductInTypesense(productId, transformedProduct);
    
    console.log(`✅ Product ${productId} successfully updated with ${variations.length} variations`);
  } catch (error) {
    console.error(`❌ Error updating product with variations:`, error.message);
  }
}

// Get product ID from command line arguments
const productId = process.argv[2];

if (!productId) {
  console.error('❌ Please provide a product ID as a command line argument');
  console.log('Usage: node scripts/update-product-with-variations.mjs <product_id>');
  process.exit(1);
}

// Run the update
updateProductWithVariations(productId)
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
