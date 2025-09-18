// scripts/inspect-product-structure.mjs
import Typesense from 'typesense';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

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
  connectionTimeoutSeconds: 2,
});

// Log file
const LOG_FILE = './product-structure-analysis.log';
fs.writeFileSync(LOG_FILE, `Product Structure Analysis - ${new Date().toISOString()}\n\n`);

// Utility functions for logging
const logger = {
  log: (...args) => {
    console.log(...args);
    fs.appendFileSync(LOG_FILE, args.join(' ') + '\n');
  },
  json: (obj, label = '') => {
    const formatted = JSON.stringify(obj, null, 2);
    console.log(label ? `${label}:\n${formatted}` : formatted);
    fs.appendFileSync(LOG_FILE, (label ? `${label}:\n${formatted}` : formatted) + '\n\n');
  },
  section: (title) => {
    const divider = '='.repeat(80);
    console.log(divider);
    console.log(title);
    console.log(divider);
    fs.appendFileSync(LOG_FILE, `${divider}\n${title}\n${divider}\n`);
  }
};

// Get a list of all attribute keys in the Typesense collection
async function analyzeAttributes() {
  logger.section('Analyzing Product Attributes in Typesense');
  
  try {
    // Retrieve some sample products
    const searchResults = await typesenseClient
      .collections('products')
      .documents()
      .search({
        q: '*',
        query_by: 'name',
        per_page: 50,
      });
    
    if (!searchResults.hits || searchResults.hits.length === 0) {
      logger.log('No products found in Typesense');
      return;
    }
    
    // Collect all attribute field names
    const attributeFields = new Set();
    const productFields = new Set();
    
    // Variable to track products with some form of attributes
    let productsWithAttributes = 0;
    let productsWithAttributesArray = 0;
    let productsWithAttributesString = 0;
    let productsWithAttributesObject = 0;
    let productsWithAttributesJson = 0;
    
    // Analyze each product
    searchResults.hits.forEach(hit => {
      const product = hit.document;
      
      // Collect all field names for analysis
      Object.keys(product).forEach(key => {
        productFields.add(key);
        
        // Look for any attribute-related fields
        if (key.toLowerCase().includes('attr')) {
          attributeFields.add(key);
          
          // Analyze attribute structures
          if (product[key]) {
            productsWithAttributes++;
            
            if (Array.isArray(product[key])) {
              productsWithAttributesArray++;
              
              // Log a sample of the attribute structure
              if (productsWithAttributesArray === 1) {
                logger.json(product[key], `Sample Array Attributes (${key})`);
              }
            } 
            else if (typeof product[key] === 'string') {
              productsWithAttributesString++;
              
              // Try to parse as JSON
              try {
                const parsed = JSON.parse(product[key]);
                productsWithAttributesJson++;
                
                if (productsWithAttributesJson === 1) {
                  logger.json(parsed, `Sample JSON String Attributes (${key})`);
                }
              } catch (e) {
                // Not JSON parseable
                if (productsWithAttributesString === 1) {
                  logger.log(`Sample String Attributes (${key}): ${product[key]}`);
                }
              }
            } 
            else if (typeof product[key] === 'object') {
              productsWithAttributesObject++;
              
              if (productsWithAttributesObject === 1) {
                logger.json(product[key], `Sample Object Attributes (${key})`);
              }
            }
          }
        }
      });
    });
    
    // Log results
    logger.log(`\nAnalyzed ${searchResults.hits.length} products`);
    logger.log(`Products with attribute fields: ${productsWithAttributes}`);
    logger.log(`- Products with array attributes: ${productsWithAttributesArray}`);
    logger.log(`- Products with string attributes: ${productsWithAttributesString}`);
    logger.log(`- Products with JSON string attributes: ${productsWithAttributesJson}`);
    logger.log(`- Products with object attributes: ${productsWithAttributesObject}`);
    
    logger.section('All Product Fields');
    logger.json(Array.from(productFields));
    
    logger.section('Attribute-Related Fields');
    logger.json(Array.from(attributeFields));
    
    // Examine WooCommerce fields
    logger.section('Examining WooCommerce-specific Fields');
    const wooFields = new Set();
    
    searchResults.hits.forEach(hit => {
      const product = hit.document;
      Object.keys(product).forEach(key => {
        if (key.startsWith('woo_') || key.includes('woocommerce')) {
          wooFields.add(key);
        }
      });
    });
    
    logger.json(Array.from(wooFields));
    
    // Inspect variations
    logger.section('Analyzing Variations');
    let productsWithVariations = 0;
    let productsWithVariationsArray = 0;
    let productsWithVariationsString = 0;
    let productsWithVariationsJson = 0;
    
    searchResults.hits.forEach(hit => {
      const product = hit.document;
      
      if (product.variations) {
        productsWithVariations++;
        
        if (Array.isArray(product.variations)) {
          productsWithVariationsArray++;
          
          if (productsWithVariationsArray === 1) {
            logger.json(product.variations, 'Sample Array Variations');
          }
        } 
        else if (typeof product.variations === 'string') {
          productsWithVariationsString++;
          
          try {
            const parsed = JSON.parse(product.variations);
            productsWithVariationsJson++;
            
            if (productsWithVariationsJson === 1) {
              logger.json(parsed, 'Sample JSON String Variations');
            }
          } catch (e) {
            // Not JSON
            if (productsWithVariationsString === 1) {
              logger.log(`Sample String Variations: ${product.variations}`);
            }
          }
        }
      }
    });
    
    logger.log(`\nProducts with variations: ${productsWithVariations}`);
    logger.log(`- Products with array variations: ${productsWithVariationsArray}`);
    logger.log(`- Products with string variations: ${productsWithVariationsString}`);
    logger.log(`- Products with JSON string variations: ${productsWithVariationsJson}`);
    
    // Find a good example product to inspect in full
    logger.section('Detailed Product Examples');
    
    // Look for a product that has both attributes and variations
    const goodExamples = searchResults.hits
      .filter(hit => hit.document.attributes && hit.document.variations)
      .map(hit => hit.document);
    
    if (goodExamples.length > 0) {
      logger.json(goodExamples[0], 'Example Product with Both Attributes and Variations');
    } else {
      // Find any product with attributes
      const attributeExamples = searchResults.hits
        .filter(hit => hit.document.attributes)
        .map(hit => hit.document);
      
      if (attributeExamples.length > 0) {
        logger.json(attributeExamples[0], 'Example Product with Attributes');
      }
      
      // Find any product with variations
      const variationExamples = searchResults.hits
        .filter(hit => hit.document.variations)
        .map(hit => hit.document);
      
      if (variationExamples.length > 0) {
        logger.json(variationExamples[0], 'Example Product with Variations');
      }
    }
    
    // Check for WooCommerce attribute fields
    logger.section('WooCommerce Attribute Structure');
    const attributeProducts = searchResults.hits
      .filter(hit => hit.document.woo_attributes || hit.document.woocommerce_attributes)
      .map(hit => hit.document);
    
    if (attributeProducts.length > 0) {
      logger.json(attributeProducts[0], 'Example Product with WooCommerce Attributes');
    }
    
  } catch (error) {
    logger.log(`Error analyzing attributes: ${error.message}`);
  }
}

// Main function
async function main() {
  try {
    await analyzeAttributes();
    logger.section('Analysis Complete');
  } catch (error) {
    logger.log(`Fatal error: ${error.message}`);
  }
}

// Run the analysis
main().then(() => {
  console.log('Analysis complete. Check the log file for details.');
});
