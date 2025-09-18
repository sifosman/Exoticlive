// Improved script to refresh all WooCommerce product data in Typesense
// Based on the approaches that worked in our product page components

import dotenv from 'dotenv';
import fetch from 'node-fetch';
import Typesense from 'typesense';
import fs from 'fs';
import readline from 'readline';

// Load environment variables
dotenv.config();

// Constants
const BATCH_SIZE = 25;
const LOG_FILE = './logs/typesense-refresh-log.txt';
const DEBUG_MODE = true;

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
log('Starting Typesense data refresh...');

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
const WC_API_URL = `${process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://exoticlive.co.za'}/wp-json/wc/v3`;
let WC_CONSUMER_KEY = process.env.WC_CONSUMER_KEY;
let WC_CONSUMER_SECRET = process.env.WC_CONSUMER_SECRET;

if (!WC_CONSUMER_KEY || !WC_CONSUMER_SECRET) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  if (!WC_CONSUMER_KEY) {
    rl.question('Enter WooCommerce Consumer Key: ', (answer) => {
      WC_CONSUMER_KEY = answer;
      if (!WC_CONSUMER_SECRET) {
        rl.question('Enter WooCommerce Consumer Secret: ', (answer) => {
          WC_CONSUMER_SECRET = answer;
          rl.close();
        });
      } else {
        rl.close();
      }
    });
  } else {
    rl.question('Enter WooCommerce Consumer Secret: ', (answer) => {
      WC_CONSUMER_SECRET = answer;
      rl.close();
    });
  }
}

// Basic authentication for WooCommerce REST API
const AUTH_STRING = Buffer.from(`${WC_CONSUMER_KEY}:${WC_CONSUMER_SECRET}`).toString('base64');

// Show API configuration
log('WooCommerce API Configuration:');
log(`API URL: ${WC_API_URL}`);
log(`Using consumer key: ${WC_CONSUMER_KEY ? 'Yes' : 'No (not found in env)'}`);

// Schema definition for Typesense collection
const productsSchema = {
  name: 'products',
  fields: [
    { name: 'id', type: 'string' },
    { name: 'name', type: 'string' },
    { name: 'slug', type: 'string' },
    { name: 'description', type: 'string', optional: true },
    { name: 'short_description', type: 'string', optional: true },
    { name: 'price', type: 'float' },
    { name: 'regular_price', type: 'float', optional: true },
    { name: 'sale_price', type: 'float', optional: true },
    { name: 'on_sale', type: 'bool', optional: true },
    { name: 'is_on_sale', type: 'bool', optional: true },
    { name: 'status', type: 'string', facet: true },
    { name: 'featured', type: 'bool', facet: true },
    { name: 'catalog_visibility', type: 'string', facet: true },
    { name: 'stock_status', type: 'string', facet: true },
    { name: 'stock_quantity', type: 'int32', optional: true },
    { name: 'categories', type: 'string[]', facet: true, optional: true },
    { name: 'tags', type: 'string[]', facet: true, optional: true },
    { name: 'brand', type: 'string', facet: true, optional: true },
    { name: 'colors', type: 'string[]', facet: true, optional: true },
    { name: 'sizes', type: 'string[]', facet: true, optional: true },
    { name: 'image_url', type: 'string', optional: true },
    { name: 'image_alt', type: 'string', optional: true },
    { name: 'gallery_images', type: 'string[]', optional: true },
    { name: 'type', type: 'string', facet: true },
    { name: 'average_rating', type: 'float', optional: true },
    { name: 'review_count', type: 'int32', optional: true },
    { name: 'attributes_json', type: 'string', optional: true },
    { name: 'variations_json', type: 'string', optional: true },
    { name: 'related_products', type: 'string[]', optional: true },
  ],
  default_sorting_field: 'price',
};

// Function to fetch data from WooCommerce REST API
async function fetchWooCommerceAPI(endpoint, params = {}) {
  try {
    // Convert params to query string
    const queryString = Object.keys(params).length > 0
      ? '?' + new URLSearchParams(params).toString()
      : '';
    
    const response = await fetch(`${WC_API_URL}/${endpoint}${queryString}`, {
      headers: {
        'Authorization': `Basic ${AUTH_STRING}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    log(`Error fetching WooCommerce API: ${error.message}`);
    throw error;
  }
}

// Function to initialize or reset the Typesense collection
async function resetTypesenseCollection() {
  log('Initializing Typesense collection...');
  
  try {
    // Delete collection if it exists
    try {
      await typesenseClient.collections('products').delete();
      log('Existing products collection deleted.');
    } catch (error) {
      log('No existing products collection found or could not delete.');
    }

    // Create collection
    await typesenseClient.collections().create(productsSchema);
    log('Products collection created successfully.');
  } catch (error) {
    log(`Error initializing Typesense collection: ${error.message}`);
    throw error;
  }
}

// Function to format product data for Typesense
function formatProductForTypesense(product, variationsData = []) {
  if (!product) return null;

  try {
    // Handle basic product info
    const productType = product.type.toUpperCase();
    
    // Handle gallery images
    const galleryImages = product.images?.slice(1).map(image => ({
      url: image.src,
      alt: image.alt || product.name
    })) || [];

    // Handle categories
    const categories = product.categories?.map(cat => cat.name) || [];

    // Handle tags
    const tags = product.tags?.map(tag => tag.name) || [];
    
    // Extract brand information
    let brand = '';
    
    // Arrays for colors and sizes
    let colors = [];
    let sizes = [];
    
    // Try to get brand from attributes
    if (product.attributes && Array.isArray(product.attributes)) {
      // Process each attribute
      product.attributes.forEach(attr => {
        const attrName = attr.name.toLowerCase();
        
        // Check for brand attribute
        if (attrName === 'brand' || attrName === 'pa_brand') {
          if (attr.options && attr.options.length > 0) {
            brand = attr.options[0];
          }
        }
        
        // Check for color attribute
        if (attrName === 'color' || attrName === 'pa_color' || attrName.includes('color')) {
          if (attr.options && attr.options.length > 0) {
            colors = attr.options;
          }
        }
        
        // Check for size attribute
        if (attrName === 'size' || attrName === 'pa_size' || attrName.includes('size')) {
          if (attr.options && attr.options.length > 0) {
            sizes = attr.options;
          }
        }
      });
    }
    
    // If it's a variable product, also extract colors and sizes from variations
    if (productType === 'VARIABLE' && variationsData && variationsData.length > 0) {
      variationsData.forEach(variation => {
        if (variation.attributes && Array.isArray(variation.attributes)) {
          variation.attributes.forEach(attr => {
            const attrName = attr.name.toLowerCase();
            const attrValue = attr.option;
            
            if (attrName.includes('color') && attrValue && !colors.includes(attrValue)) {
              colors.push(attrValue);
            }
            
            if (attrName.includes('size') && attrValue && !sizes.includes(attrValue)) {
              sizes.push(attrValue);
            }
          });
        }
      });
    }
    
    // If no brand from attributes, try to get from product tags
    if (!brand && tags.length > 0) {
      // Check if any tag looks like a brand
      const possibleBrandTag = tags.find(tag => 
        !tag.toLowerCase().includes('size') && 
        !tag.toLowerCase().includes('color') && 
        !tag.toLowerCase().includes('price')
      );
      
      if (possibleBrandTag) {
        brand = possibleBrandTag;
      }
    }
    
    // If still no brand, use first category as fallback if available
    if (!brand && categories.length > 0) {
      brand = categories[0];
    }

    // Format attributes with options
    const attributes = (product.attributes || []).map(attr => ({
      name: attr.name,
      label: attr.name,
      options: attr.options || [],
      variation: attr.variation !== false,
      visible: attr.visible !== false
    }));

    // Format variations with attributes
    const variations = variationsData.map(variation => {
      // Format variation attributes
      const variationAttributes = (variation.attributes || []).map(attr => ({
        name: attr.name,
        label: attr.name,
        option: attr.option
      }));

      return {
        id: variation.id,
        name: variation.name || product.name,
        price: parseFloat(variation.price || '0'),
        regular_price: parseFloat(variation.regular_price || '0'),
        sale_price: variation.sale_price ? parseFloat(variation.sale_price) : null,
        on_sale: !!variation.on_sale,
        stock_status: (variation.stock_status || 'outofstock').toLowerCase(),
        stock_quantity: variation.stock_quantity || 0,
        attributes: variationAttributes
      };
    });

    // Format related products
    const relatedProducts = product.cross_sell_ids || [];

    // Create formatted product data
    const formattedProduct = {
      id: product.id.toString(),
      name: product.name,
      slug: product.slug,
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
      categories,
      tags,
      brand,
      colors,
      sizes,
      image_url: product.images?.[0]?.src || '',
      image_alt: product.images?.[0]?.alt || product.name,
      gallery_images: galleryImages.map(img => img.url),
      type: productType,
      average_rating: parseFloat(product.average_rating || '0'),
      review_count: product.rating_count || 0,
      attributes_json: JSON.stringify(attributes),
      variations_json: JSON.stringify(variations),
      related_products: relatedProducts.map(id => id.toString()),
    };

    return formattedProduct;
  } catch (error) {
    log(`Error formatting product ${product.name}: ${error.message}`);
    return null;
  }
}

// Function to fetch one product by ID and its variations and index it in Typesense
async function fetchAndIndexProduct(productId) {
  try {
    log(`Fetching product with ID: ${productId}...`);
    
    // Fetch product data
    const product = await fetchWooCommerceAPI(`products/${productId}`);
    
    if (!product) {
      log(`No product found with ID: ${productId}`);
      return null;
    }
    
    let variations = [];
    
    // Fetch variations if product is variable
    if (product.type === 'variable') {
      log(`Product ${product.name} is variable, fetching variations...`);
      variations = await fetchWooCommerceAPI(`products/${productId}/variations`, { per_page: 100 });
      log(`Found ${variations.length} variations for product ${product.name}`);
    }
    
    // Format product for Typesense
    const formattedProduct = formatProductForTypesense(product, variations);
    
    if (!formattedProduct) {
      log(`Could not format product with ID: ${productId}`);
      return null;
    }
    
    // Debug: Log variable product info
    if (product.type === 'variable' && DEBUG_MODE) {
      log(`Product is variable: ${formattedProduct.name}`);
      log(`Attributes: ${formattedProduct.attributes_json}`);
      log(`Variations: ${formattedProduct.variations_json}`);
      
      // Special logging for Zig Zag product
      if (product.name.includes('Zig Zag') || product.slug.includes('zig-zag')) {
        log('====================== ZIG ZAG PRODUCT FOUND ======================');
        
        // Find Black/Size 3 variation if it exists
        const variations = JSON.parse(formattedProduct.variations_json);
        const blackSize3 = variations.find(v => {
          if (!v.attributes || !Array.isArray(v.attributes)) return false;
          
          const hasBlackColor = v.attributes.some(attr => 
            attr.name.toLowerCase().includes('color') && 
            attr.option?.toLowerCase() === 'black'
          );
          
          const hasSize3 = v.attributes.some(attr => 
            attr.name.toLowerCase().includes('size') && 
            attr.option === '3'
          );
          
          return hasBlackColor && hasSize3;
        });
        
        if (blackSize3) {
          log('Found Black/Size 3 variation:');
          log(JSON.stringify(blackSize3, null, 2));
        } else {
          log('Black/Size 3 variation NOT found');
        }
        
        log('================================================================');
      }
    }
    
    // Add to Typesense
    await typesenseClient.collections('products').documents().upsert(formattedProduct);
    
    log(`Successfully indexed product: ${formattedProduct.name} (${formattedProduct.id})`);
    return formattedProduct;
  } catch (error) {
    log(`Error processing product ID ${productId}: ${error.message}`);
    return null;
  }
}

// Main function to process all products
async function refreshAllProducts() {
  try {
    // Reset Typesense collection
    await resetTypesenseCollection();
    
    let page = 1;
    let hasMoreProducts = true;
    let totalProducts = 0;
    let failedProducts = 0;
    let successfulProducts = 0;

    // Fetch products in batches
    while (hasMoreProducts) {
      log(`Fetching batch of products, page ${page}...`);
      
      const products = await fetchWooCommerceAPI('products', {
        per_page: BATCH_SIZE,
        page,
        status: 'publish',
      });

      if (!products || !Array.isArray(products) || products.length === 0) {
        log('No more products found. Stopping.');
        hasMoreProducts = false;
        break;
      }

      log(`Processing batch of ${products.length} products...`);
      
      // Process products sequentially to avoid overwhelming the API
      for (const product of products) {
        totalProducts++;
        const result = await fetchAndIndexProduct(product.id);
        
        if (result) {
          successfulProducts++;
        } else {
          failedProducts++;
        }
      }

      // Check if we should continue to the next page
      if (products.length < BATCH_SIZE) {
        hasMoreProducts = false;
      } else {
        page++;
      }
      
      log(`Batch complete. Processed ${products.length} products.`);
      log(`Progress: ${totalProducts} total, ${successfulProducts} succeeded, ${failedProducts} failed.`);
    }

    log('===== REFRESH SUMMARY =====');
    log(`Total products processed: ${totalProducts}`);
    log(`Successfully indexed: ${successfulProducts}`);
    log(`Failed to index: ${failedProducts}`);
    log('===========================');
    
    log('Refresh completed successfully.');
  } catch (error) {
    log(`Fatal error during refresh: ${error.message}`);
    process.exit(1);
  }
}

// Run the main function
refreshAllProducts()
  .then(() => {
    log('Script execution completed.');
  })
  .catch((error) => {
    log(`Unhandled error: ${error.message}`);
    process.exit(1);
  });
