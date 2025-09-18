#!/usr/bin/env node

/**
 * This script manually adds a product from WooCommerce to Typesense.
 *
 * Usage: node scripts/add-product-to-typesense.mjs <product_id>
 */

import dotenv from 'dotenv';
import { Client as TypesenseClient } from 'typesense';

// Load environment variables
dotenv.config();

// Get command line arguments
const productId = process.argv[2];

if (!productId) {
  console.error('Please provide a product ID.');
  console.error('Usage: node scripts/add-product-to-typesense.mjs <product_id>');
  process.exit(1);
}

// WooCommerce API credentials
const wcApiUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL || '';
const wcConsumerKey = process.env.WC_CONSUMER_KEY || '';
const wcConsumerSecret = process.env.WC_CONSUMER_SECRET || '';

// Create authentication header for WooCommerce API
const getWooCommerceAuthHeader = () => {
  const auth = Buffer.from(`${wcConsumerKey}:${wcConsumerSecret}`).toString('base64');
  return `Basic ${auth}`;
};

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

// Fetch product from WooCommerce
async function fetchProductFromWooCommerce(productId) {
  try {
    console.log(`Fetching product ${productId} from WooCommerce...`);

    if (!wcApiUrl || !wcConsumerKey || !wcConsumerSecret) {
      throw new Error('WooCommerce API credentials not configured');
    }

    const response = await fetch(`${wcApiUrl}/wp-json/wc/v3/products/${productId}`, {
      headers: {
        'Authorization': getWooCommerceAuthHeader()
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch product: ${response.statusText}`);
    }

    const product = await response.json();
    console.log(`Found product in WooCommerce: ${product.name} (ID: ${product.id})`);

    return product;
  } catch (error) {
    console.error(`Error fetching product ${productId} from WooCommerce:`, error);
    throw error;
  }
}

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

// Add product to Typesense
async function addProductToTypesense(product, variations) {
  try {
    console.log(`Adding product ${product.id} to Typesense...`);

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

    // Create a new product document for Typesense
    const newProduct = {
      id: product.id.toString(),
      name: product.name || '',
      description: product.description ? product.description.replace(/<[^>]*>?/gm, '') : '',
      price: parseFloat(product.price || '0'),
      sale_price: product.sale_price ? parseFloat(product.sale_price) : null,
      regular_price: product.regular_price ? parseFloat(product.regular_price) : null,
      categories: product.categories?.map(cat => cat.name) || [],
      tags: product.tags?.map(tag => tag.name) || [],
      attributes: product.attributes?.map(attr => attr.name) || [],
      colors: product.attributes?.find(attr => attr.name === 'Color')?.options || [],
      sizes: product.attributes?.find(attr => attr.name === 'Size')?.options || [],
      image_url: product.images && product.images.length > 0 ? product.images[0].src : '',
      gallery_images: product.images?.map(img => img.src) || [],
      slug: product.slug || '',
      stock_status: product.stock_status || 'outofstock',
      stock_quantity: product.stock_quantity || 0,
      variations_count: processedVariations.length,
      in_stock_variations_count: processedVariations.filter(v => v.stock_status === 'instock').length,
      variations: processedVariations,
      variations_json: JSON.stringify(processedVariations),
      featured: product.featured !== undefined ? product.featured : false,
      is_featured: product.featured !== undefined ? !!product.featured : false,
      is_on_sale: product.on_sale !== undefined ? product.on_sale : false,
      on_sale: product.on_sale !== undefined ? product.on_sale : false,
      average_rating: parseFloat(product.average_rating || '0'),
      date_created: product.date_created || new Date().toISOString(),
      catalog_visibility: product.catalog_visibility || 'visible',
      short_description: product.short_description ? product.short_description.replace(/<[^>]*>?/gm, '') : '',
      sku: product.sku || '',
      status: product.status || 'publish',
      weight: product.weight || '',
      dimensions: product.dimensions || { length: '', width: '', height: '' },
      shipping_class: product.shipping_class || '',
      shipping_class_id: product.shipping_class_id || 0,
      type: product.type || 'simple',
      virtual: product.virtual !== undefined ? product.virtual : false,
      downloadable: product.downloadable !== undefined ? product.downloadable : false,
      tax_status: product.tax_status || 'taxable',
      tax_class: product.tax_class || ''
    };

    // Check if the product already exists in Typesense
    try {
      await typesenseClient
        .collections('products')
        .documents(product.id.toString())
        .retrieve();

      console.log(`Product ${product.id} already exists in Typesense, updating it...`);

      // Update the product
      const updateResult = await typesenseClient
        .collections('products')
        .documents(product.id.toString())
        .update(newProduct);

      console.log(`Product ${product.id} updated in Typesense`);
      return updateResult;
    } catch (error) {
      // Product doesn't exist, create it
      console.log(`Product ${product.id} doesn't exist in Typesense, creating it...`);

      const createResult = await typesenseClient
        .collections('products')
        .documents()
        .create(newProduct);

      console.log(`Product ${product.id} created in Typesense`);
      return createResult;
    }
  } catch (error) {
    console.error(`Error adding product ${product.id} to Typesense:`, error);
    throw error;
  }
}

// Main function
async function main() {
  try {
    // Fetch product from WooCommerce
    const product = await fetchProductFromWooCommerce(productId);

    // Fetch variations if it's a variable product
    let variations = [];
    if (product.type === 'variable') {
      variations = await fetchVariationsFromWooCommerce(productId);
    }

    // Add product to Typesense
    await addProductToTypesense(product, variations);

    console.log(`✅ Successfully added product ${productId} to Typesense`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the main function
main();
