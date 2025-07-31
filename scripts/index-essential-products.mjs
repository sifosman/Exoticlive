// Script to quickly index essential product data to Typesense
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import Typesense from 'typesense';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Constants
const BATCH_SIZE = 100; // Large batch size for faster processing
const LOG_FILE = './logs/product-indexing-log.txt';

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
log('Starting Essential Product Indexing...');

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

// Function to fetch WooCommerce products in batches
async function fetchProducts(page = 1) {
  try {
    const response = await fetch(`${WC_API_URL}/products?per_page=${BATCH_SIZE}&page=${page}&status=publish`, {
      headers: {
        'Authorization': `Basic ${AUTH_STRING}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} - ${await response.text()}`);
    }

    return await response.json();
  } catch (error) {
    log(`Error fetching products: ${error.message}`);
    return [];
  }
}

// Simplified function to extract essential product data
function extractEssentialData(product) {
  // Basic product info
  const essentialProduct = {
    id: product.id.toString(),
    name: product.name || '',
    slug: product.slug || '',
    description: product.description || '',
    short_description: product.short_description || '',
    price: parseFloat(product.price || '0'),
    regular_price: parseFloat(product.regular_price || '0'),
    sale_price: product.sale_price ? parseFloat(product.sale_price) : null,
    on_sale: !!product.on_sale,
    is_on_sale: !!product.on_sale,
    status: product.status || 'publish',
    featured: !!product.featured,
    catalog_visibility: product.catalog_visibility || 'visible',
    stock_status: (product.stock_status || 'outofstock').toLowerCase(),
    stock_quantity: product.stock_quantity || 0,
    categories: product.categories?.map(cat => cat.name) || [],
    tags: product.tags?.map(tag => tag.name) || [],
    brand: product.categories?.[0]?.name || '',
    image_url: product.images?.[0]?.src || '',
    image_alt: product.images?.[0]?.alt || product.name || '',
    type: product.type.toUpperCase(),
  };
  
  // Extract colors and sizes from attributes
  const colors = [];
  const sizes = [];
  
  if (product.attributes && Array.isArray(product.attributes)) {
    product.attributes.forEach(attr => {
      if (!attr) return;
      
      const name = (attr.name || '').toLowerCase();
      const options = attr.options || [];
      
      if (name.includes('color')) {
        options.forEach(opt => colors.push(opt));
      }
      
      if (name.includes('size')) {
        options.forEach(opt => sizes.push(opt));
      }
    });
  }
  
  essentialProduct.colors = colors;
  essentialProduct.sizes = sizes;
  
  // Convert attributes to JSON string
  essentialProduct.attributes_json = JSON.stringify(product.attributes || []);
  
  // For variable products, add empty variations array
  if (product.type === 'variable') {
    essentialProduct.variations_json = '[]';
  }
  
  return essentialProduct;
}

// Function to index products in batches
async function indexProducts() {
  try {
    let page = 1;
    let totalProducts = 0;
    let hasMoreProducts = true;
    
    while (hasMoreProducts) {
      log(`Fetching products batch ${page}...`);
      const products = await fetchProducts(page);
      
      if (!products || products.length === 0) {
        log('No more products found.');
        hasMoreProducts = false;
        break;
      }
      
      log(`Processing ${products.length} products...`);
      
      // Extract essential data
      const essentialProducts = products.map(extractEssentialData);
      
      // Index products in Typesense
      await typesenseClient.collections('products').documents().import(essentialProducts);
      
      totalProducts += products.length;
      log(`Indexed ${totalProducts} products so far.`);
      
      // Check if we should fetch more
      if (products.length < BATCH_SIZE) {
        hasMoreProducts = false;
      } else {
        page++;
      }
    }
    
    log(`Successfully indexed ${totalProducts} products with essential data.`);
    
    // Check if the Zig Zag product was indexed
    try {
      const zigZag = await typesenseClient.collections('products').documents().search({
        q: 'zig zag',
        query_by: 'name,slug'
      });
      
      if (zigZag.hits && zigZag.hits.length > 0) {
        log('Zig Zag product was successfully indexed.');
      } else {
        log('Zig Zag product was not found in the index.');
      }
    } catch (error) {
      log(`Error checking Zig Zag product: ${error.message}`);
    }
    
  } catch (error) {
    log(`Error during indexing: ${error.message}`);
    throw error;
  }
}

// Run the indexing process
indexProducts()
  .then(() => {
    log('Indexing completed successfully.');
  })
  .catch((error) => {
    log(`Indexing failed: ${error.message}`);
  });
