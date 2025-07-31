// Fast script to refresh Typesense data with optimized performance
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import Typesense from 'typesense';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Constants - ADJUSTABLE FOR PERFORMANCE
const BATCH_SIZE = 50; // Increased from 25
const MAX_CONCURRENT_BATCHES = 3; // Number of parallel product batches to process
const MAX_CONCURRENT_VARIATIONS = 5; // Number of parallel variation requests per product
const LOG_FILE = './logs/typesense-refresh-log.txt';
const DEBUG_MODE = false; // Set to false to reduce console output
const INCLUDE_VARIATIONS = true; // Set to false to skip variation fetching (faster but less complete)
const ONLY_UPDATED_SINCE = ''; // ISO date string, e.g. '2025-03-28T00:00:00', set to '' to get all

// Ensure log directory exists
if (!fs.existsSync('./logs')) {
  fs.mkdirSync('./logs', { recursive: true });
}

// Initialize logger
function log(message, isDebug = false) {
  if (isDebug && !DEBUG_MODE) return;
  
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  
  console.log(logMessage);
  fs.appendFileSync(LOG_FILE, logMessage + '\n');
}

// Clear log file
fs.writeFileSync(LOG_FILE, '');
log('Starting Typesense Fast Refresh...');

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

// Show API configuration
log('WooCommerce API Configuration:');
log(`API URL: ${WC_API_URL}`);
log(`Using consumer key: ${WC_CONSUMER_KEY ? 'Yes' : 'No (not found in env)'}`);
log(`PERFORMANCE SETTINGS: Batch size=${BATCH_SIZE}, Concurrent batches=${MAX_CONCURRENT_BATCHES}`);

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

// Function to fetch data from WooCommerce REST API with retries
async function fetchWooCommerceAPI(endpoint, params = {}, retries = 3) {
  try {
    // Convert params to query string
    const queryString = Object.keys(params).length > 0
      ? '?' + new URLSearchParams(params).toString()
      : '';
    
    let response;
    let attempt = 0;
    
    while (attempt < retries) {
      try {
        response = await fetch(`${WC_API_URL}/${endpoint}${queryString}`, {
          headers: {
            'Authorization': `Basic ${AUTH_STRING}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          break;
        }
        
        // If rate limited, wait and retry
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('retry-after') || '5');
          log(`Rate limited, waiting ${retryAfter} seconds before retry...`, true);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        } else {
          // For other errors, retry with backoff
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
        }
      } catch (error) {
        log(`Network error on attempt ${attempt + 1}: ${error.message}`, true);
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
      
      attempt++;
    }

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

// Utility function for extracting colors and sizes
function extractColorsAndSizes(productData, variationsData = []) {
  const colors = new Set();
  const sizes = new Set();
  
  // Fast extraction function to avoid deep nesting
  const processAttributes = (attrs) => {
    if (!attrs || !Array.isArray(attrs)) return;
    
    attrs.forEach(attr => {
      if (!attr) return;
      
      const name = attr.name ? attr.name.toLowerCase() : '';
      const options = attr.options || [];
      const option = attr.option;
      
      // For color attributes
      if (name.includes('color') || name === 'pa_color') {
        if (options.length > 0) {
          options.forEach(opt => colors.add(opt));
        }
        if (option) {
          colors.add(option);
        }
      }
      
      // For size attributes
      if (name.includes('size') || name === 'pa_size') {
        if (options.length > 0) {
          options.forEach(opt => sizes.add(opt));
        }
        if (option) {
          sizes.add(option);
        }
      }
    });
  };
  
  // Process product attributes
  if (productData.attributes) {
    processAttributes(productData.attributes);
  }
  
  // Process variation attributes
  variationsData.forEach(variation => {
    if (variation.attributes) {
      processAttributes(variation.attributes);
    }
  });
  
  return {
    colors: Array.from(colors),
    sizes: Array.from(sizes)
  };
}

// Function to format product data for Typesense - optimized for speed
function formatProductForTypesense(product, variationsData = []) {
  if (!product) return null;

  try {
    // Handle basic product info
    const productType = product.type.toUpperCase();
    
    // Handle gallery images - simplified
    const galleryImages = product.images?.slice(1).map(image => image.src) || [];

    // Handle categories
    const categories = product.categories?.map(cat => cat.name) || [];

    // Handle tags
    const tags = product.tags?.map(tag => tag.name) || [];
    
    // Extract brand - simplified logic
    let brand = '';
    if (product.attributes && Array.isArray(product.attributes)) {
      const brandAttr = product.attributes.find(attr => 
        attr?.name?.toLowerCase() === 'brand' || 
        attr?.name?.toLowerCase() === 'pa_brand'
      );
      if (brandAttr && brandAttr.options?.length > 0) {
        brand = brandAttr.options[0];
      } else if (tags.length > 0) {
        // Fallback to first tag
        brand = tags[0];
      } else if (categories.length > 0) {
        // Fallback to first category
        brand = categories[0];
      }
    }
    
    // Extract colors and sizes - optimized
    const { colors, sizes } = extractColorsAndSizes(product, variationsData);

    // Format attributes and variations - faster with direct mapping
    const attributes = (product.attributes || []).map(attr => ({
      name: attr.name || '',
      label: attr.name || '',
      options: attr.options || [],
      variation: attr.variation !== false,
      visible: attr.visible !== false
    }));

    // Format variations - only process essential fields
    const variations = variationsData.map(variation => ({
      id: variation.id,
      price: parseFloat(variation.price || '0'),
      regular_price: parseFloat(variation.regular_price || '0'),
      sale_price: variation.sale_price ? parseFloat(variation.sale_price) : null,
      on_sale: !!variation.on_sale,
      stock_status: (variation.stock_status || 'outofstock').toLowerCase(),
      stock_quantity: variation.stock_quantity || 0,
      attributes: (variation.attributes || []).map(attr => ({
        name: attr.name,
        option: attr.option
      }))
    }));

    // Create formatted product data - optimized for speed
    return {
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
      categories,
      tags,
      brand,
      colors,
      sizes,
      image_url: product.images?.[0]?.src || '',
      image_alt: product.images?.[0]?.alt || product.name || '',
      gallery_images: galleryImages,
      type: productType,
      average_rating: parseFloat(product.average_rating || '0'),
      review_count: product.rating_count || 0,
      attributes_json: JSON.stringify(attributes),
      variations_json: JSON.stringify(variations),
      related_products: (product.cross_sell_ids || []).map(id => id.toString()),
    };
  } catch (error) {
    log(`Error formatting product ${product?.name || 'unknown'}: ${error.message}`);
    return null;
  }
}

// Function to fetch and process a single product with variations
async function fetchAndProcessProduct(productId) {
  try {
    // Fetch product data
    const product = await fetchWooCommerceAPI(`products/${productId}`);
    
    if (!product) {
      log(`No product found with ID: ${productId}`);
      return null;
    }
    
    let variations = [];
    
    // Only fetch variations if product is variable and we want variations
    if (INCLUDE_VARIATIONS && product.type === 'variable') {
      log(`Product ${product.name} is variable, fetching variations...`, true);
      
      // Fetch variations in parallel batches for better performance
      if (product.variations && product.variations.length > 0) {
        // First try to get total count of variations
        const totalVariations = Array.isArray(product.variations) ? product.variations.length : 0;
        
        if (totalVariations > 0) {
          // Fetch variations in parallel batches
          const variationBatches = [];
          const variationsPerBatch = 20; // WooCommerce default per_page
          const totalBatches = Math.ceil(totalVariations / variationsPerBatch);
          
          for (let page = 1; page <= totalBatches; page++) {
            variationBatches.push(
              fetchWooCommerceAPI(`products/${productId}/variations`, {
                per_page: variationsPerBatch,
                page
              })
            );
          }
          
          // Wait for all variation batches to complete
          const variationResults = await Promise.all(variationBatches);
          
          // Combine results
          variations = variationResults.flat();
          log(`Fetched ${variations.length} variations for product ${product.name}`, true);
        }
      } else {
        // Fallback to simpler variation fetching
        variations = await fetchWooCommerceAPI(`products/${productId}/variations`, { per_page: 100 });
      }
    }
    
    // Format product for Typesense
    const formattedProduct = formatProductForTypesense(product, variations);
    
    if (!formattedProduct) {
      log(`Could not format product with ID: ${productId}`);
      return null;
    }
    
    // Special logging for Zig Zag product
    if (DEBUG_MODE && (product.name.includes('Zig Zag') || product.slug.includes('zig-zag'))) {
      log('====================== ZIG ZAG PRODUCT FOUND ======================');
      
      // Find Black/Size 3 variation if it exists
      const parsedVariations = JSON.parse(formattedProduct.variations_json);
      const blackSize3 = parsedVariations.find(v => {
        if (!v.attributes || !Array.isArray(v.attributes)) return false;
        
        const hasBlackColor = v.attributes.some(attr => 
          attr.name?.toLowerCase().includes('color') && 
          attr.option?.toLowerCase() === 'black'
        );
        
        const hasSize3 = v.attributes.some(attr => 
          attr.name?.toLowerCase().includes('size') && 
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
    
    // Add to Typesense
    await typesenseClient.collections('products').documents().upsert(formattedProduct);
    
    log(`Successfully indexed product: ${formattedProduct.name} (${formattedProduct.id})`);
    return formattedProduct;
  } catch (error) {
    log(`Error processing product ID ${productId}: ${error.message}`);
    return null;
  }
}

// Process a batch of products concurrently
async function processBatch(products) {
  // Create an array of promises for each product in the batch
  const promises = products.map(product => fetchAndProcessProduct(product.id));
  
  // Wait for all products in the batch to be processed
  const results = await Promise.allSettled(promises);
  
  // Count successful and failed products
  const successful = results.filter(r => r.status === 'fulfilled' && r.value !== null).length;
  const failed = results.filter(r => r.status === 'rejected' || r.value === null).length;
  
  return { successful, failed };
}

// Main function to process all products with concurrency
async function refreshAllProducts() {
  try {
    // Reset Typesense collection
    await resetTypesenseCollection();
    
    // Build query parameters
    const queryParams = {
      per_page: BATCH_SIZE,
      status: 'publish',
    };
    
    // Add date filter if specified
    if (ONLY_UPDATED_SINCE) {
      queryParams.modified_after = ONLY_UPDATED_SINCE;
      log(`Only fetching products updated since: ${ONLY_UPDATED_SINCE}`);
    }
    
    log('Fetching products from WooCommerce...');
    
    let page = 1;
    let hasMoreProducts = true;
    let totalProcessed = 0;
    let totalSuccessful = 0;
    let totalFailed = 0;
    
    // Process products in concurrent batches
    while (hasMoreProducts) {
      // Fetch several pages at once
      const pagesToFetch = Array.from({ length: MAX_CONCURRENT_BATCHES }, (_, i) => page + i);
      const batchPromises = pagesToFetch.map(pageNum => 
        fetchWooCommerceAPI('products', { ...queryParams, page: pageNum })
          .catch(error => {
            log(`Error fetching page ${pageNum}: ${error.message}`);
            return [];
          })
      );
      
      // Wait for all batch fetches to complete
      const batchResults = await Promise.all(batchPromises);
      
      // Filter out empty results and flat map products
      const validBatches = batchResults.filter(batch => Array.isArray(batch) && batch.length > 0);
      
      if (validBatches.length === 0) {
        log('No more products found. Stopping.');
        hasMoreProducts = false;
        break;
      }
      
      // Process each valid batch
      for (const batch of validBatches) {
        log(`Processing batch of ${batch.length} products...`);
        
        const { successful, failed } = await processBatch(batch);
        
        totalProcessed += batch.length;
        totalSuccessful += successful;
        totalFailed += failed;
        
        log(`Batch complete. Success: ${successful}, Failed: ${failed}`);
        log(`Progress: ${totalProcessed} total, ${totalSuccessful} succeeded, ${totalFailed} failed.`);
      }
      
      // Increment page counter
      page += MAX_CONCURRENT_BATCHES;
      
      // Check if we should stop
      const lastBatchSize = validBatches[validBatches.length - 1]?.length || 0;
      if (lastBatchSize < BATCH_SIZE) {
        hasMoreProducts = false;
      }
    }

    log('===== REFRESH SUMMARY =====');
    log(`Total products processed: ${totalProcessed}`);
    log(`Successfully indexed: ${totalSuccessful}`);
    log(`Failed to index: ${totalFailed}`);
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
