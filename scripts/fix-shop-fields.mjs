// Targeted script to fix the shop page by adding missing fields without a full refresh
import dotenv from 'dotenv';
import Typesense from 'typesense';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Constants
const LOG_FILE = './logs/typesense-fix-log.txt';

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
log('Starting Typesense field fix...');

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

// Updated schema to include colors and sizes fields
const updatedSchema = {
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

// Function to create a new collection with the updated schema
async function recreateCollection() {
  try {
    log('Checking existing collection...');
    
    // Get existing documents
    let existingProducts = [];
    try {
      const searchResults = await typesenseClient
        .collections('products')
        .documents()
        .search({
          q: '*',
          per_page: 1000,
        });
      
      if (searchResults.hits) {
        existingProducts = searchResults.hits.map(hit => hit.document);
        log(`Retrieved ${existingProducts.length} existing products.`);
      }
    } catch (error) {
      log(`Error retrieving existing products: ${error.message}`);
      existingProducts = [];
    }
    
    // Delete existing collection
    try {
      await typesenseClient.collections('products').delete();
      log('Existing products collection deleted.');
    } catch (error) {
      log(`No existing collection found or could not delete: ${error.message}`);
    }
    
    // Create new collection with updated schema
    await typesenseClient.collections().create(updatedSchema);
    log('New collection created with updated schema.');
    
    if (existingProducts.length === 0) {
      log('No existing products to migrate.');
      return;
    }
    
    // Add colors and sizes to products based on attributes
    const enhancedProducts = existingProducts.map(product => {
      // Initialize colors and sizes arrays
      const colors = [];
      const sizes = [];
      
      try {
        // Check if attributes_json exists and is not empty
        if (product.attributes_json) {
          const attributes = JSON.parse(product.attributes_json);
          
          // Extract colors and sizes from attributes
          if (Array.isArray(attributes)) {
            attributes.forEach(attr => {
              if (!attr) return;
              
              const attrName = (attr.name || '').toLowerCase();
              const options = attr.options || [];
              
              if (attrName.includes('color')) {
                options.forEach(opt => {
                  if (opt && !colors.includes(opt)) {
                    colors.push(opt);
                  }
                });
              }
              
              if (attrName.includes('size')) {
                options.forEach(opt => {
                  if (opt && !sizes.includes(opt)) {
                    sizes.push(opt);
                  }
                });
              }
            });
          }
        }
        
        // Check if variations_json exists and is not empty
        if (product.variations_json) {
          const variations = JSON.parse(product.variations_json);
          
          // Extract colors and sizes from variations
          if (Array.isArray(variations)) {
            variations.forEach(variation => {
              if (!variation || !Array.isArray(variation.attributes)) return;
              
              variation.attributes.forEach(attr => {
                if (!attr) return;
                
                const attrName = (attr.name || '').toLowerCase();
                const value = attr.option;
                
                if (value) {
                  if (attrName.includes('color') && !colors.includes(value)) {
                    colors.push(value);
                  }
                  
                  if (attrName.includes('size') && !sizes.includes(value)) {
                    sizes.push(value);
                  }
                }
              });
            });
          }
        }
      } catch (error) {
        log(`Error parsing attributes for product ${product.id}: ${error.message}`);
      }
      
      // Return product with colors and sizes
      return {
        ...product,
        colors,
        sizes,
        is_on_sale: product.on_sale || false
      };
    });
    
    // Reindex products in batches
    const batchSize = 100;
    for (let i = 0; i < enhancedProducts.length; i += batchSize) {
      const batch = enhancedProducts.slice(i, i + batchSize);
      await typesenseClient.collections('products').documents().import(batch);
      log(`Reindexed ${i + batch.length}/${enhancedProducts.length} products.`);
    }
    
    log('All products have been enhanced with colors and sizes fields.');
  } catch (error) {
    log(`Error updating schema: ${error.message}`);
    throw error;
  }
}

// Function to add a specific field to all documents
async function fixShopFields() {
  try {
    await recreateCollection();
    
    log('Successfully fixed Typesense schema and added required fields for shop page');
  } catch (error) {
    log(`Error fixing shop fields: ${error.message}`);
    process.exit(1);
  }
}

// Run the fix function
fixShopFields()
  .then(() => {
    log('Fix completed successfully.');
  })
  .catch((error) => {
    log(`Unhandled error: ${error.message}`);
    process.exit(1);
  });
