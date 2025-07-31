// scripts/verify-stock-display.mjs
import Typesense from 'typesense';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Configuration
const LOG_FILE = './stock-verification.log';
fs.writeFileSync(LOG_FILE, `Stock Verification - ${new Date().toISOString()}\n\n`);

// Logger setup
const logger = {
  log: (...args) => {
    console.log(...args);
    fs.appendFileSync(LOG_FILE, args.join(' ') + '\n');
  },
  section: (title) => {
    const divider = '='.repeat(80);
    console.log(divider);
    console.log(title);
    console.log(divider);
    fs.appendFileSync(LOG_FILE, `${divider}\n${title}\n${divider}\n`);
  },
  json: (obj, label = '') => {
    const formatted = JSON.stringify(obj, null, 2);
    console.log(label ? `${label}:\n${formatted}` : formatted);
    fs.appendFileSync(LOG_FILE, (label ? `${label}:\n${formatted}` : formatted) + '\n\n');
  }
};

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

// Find a product by slug
async function findProductBySlug(slug) {
  logger.section(`Searching for product with slug: ${slug}`);
  
  try {
    const searchParameters = {
      q: slug,
      query_by: 'slug',
      filter_by: `slug:=${slug}`,
      per_page: 1,
    };
    
    const searchResults = await typesenseClient
      .collections('products')
      .documents()
      .search(searchParameters);
    
    if (!searchResults.hits || searchResults.hits.length === 0) {
      logger.log(`No product found with slug "${slug}"`);
      return null;
    }
    
    logger.log(`Found product: ${searchResults.hits[0].document.name} (ID: ${searchResults.hits[0].document.id})`);
    return searchResults.hits[0].document;
  } catch (error) {
    logger.log(`Error searching for product: ${error.message}`);
    return null;
  }
}

// Process product variations and check stock status
function checkProductVariations(product) {
  if (!product) return;
  
  logger.section(`Analyzing variations for ${product.name}`);
  
  // First prepare data structure
  let variations = [];
  let parsedAttrs = [];
  
  // Handle variations - check if already parsed or in JSON
  if (Array.isArray(product.variations)) {
    variations = product.variations;
    logger.log(`Using already parsed variations array with ${variations.length} variations`);
  } else if (typeof product.variations_json === 'string') {
    try {
      variations = JSON.parse(product.variations_json);
      logger.log(`Parsed variations from JSON string, found ${variations.length} variations`);
    } catch (error) {
      logger.log(`Error parsing variations_json: ${error.message}`);
      variations = [];
    }
  }
  
  // Handle attributes - check if already parsed or in JSON
  if (Array.isArray(product.attributes)) {
    parsedAttrs = product.attributes;
    logger.log(`Using already parsed attributes array with ${parsedAttrs.length} attributes`);
  } else if (typeof product.attributes_json === 'string') {
    try {
      parsedAttrs = JSON.parse(product.attributes_json);
      logger.log(`Parsed attributes from JSON string, found ${parsedAttrs.length} attributes`);
    } catch (error) {
      logger.log(`Error parsing attributes_json: ${error.message}`);
      parsedAttrs = [];
    }
  }
  
  // Log attributes
  if (parsedAttrs.length > 0) {
    logger.section('Product Attributes');
    parsedAttrs.forEach((attr, index) => {
      logger.log(`${index + 1}. ${attr.name}: ${attr.options.join(', ')}`);
    });
  } else {
    logger.log('No attributes found for this product');
  }
  
  // Check stock status of variations
  if (variations.length > 0) {
    logger.section('Variation Stock Status');
    
    // Count by stock status
    let inStockCount = 0;
    let outOfStockCount = 0;
    
    variations.forEach((variation, index) => {
      const stockStatus = variation.stock_status || 'unknown';
      const stockQuantity = typeof variation.stock_quantity === 'number' ? variation.stock_quantity : 'unknown';
      
      // Create a human-readable description of the variation
      const attrDesc = Array.isArray(variation.attributes) 
        ? variation.attributes.map(a => `${a.name}: ${a.option}`).join(', ')
        : 'No attributes';
      
      logger.log(`${index + 1}. ${attrDesc} - Stock: ${stockStatus} (${stockQuantity})`);
      
      // Count status
      if (stockStatus === 'instock') {
        inStockCount++;
      } else {
        outOfStockCount++;
      }
    });
    
    // Summary
    logger.section('Stock Status Summary');
    logger.log(`Total variations: ${variations.length}`);
    logger.log(`In stock: ${inStockCount}`);
    logger.log(`Out of stock: ${outOfStockCount}`);
    
    // Check for Black/Size 3
    const blackSize3 = variations.find(v => {
      if (!Array.isArray(v.attributes)) return false;
      
      const hasBlack = v.attributes.some(a => 
        a.name.toLowerCase() === 'color' && 
        a.option.toLowerCase() === 'black'
      );
      
      const hasSize3 = v.attributes.some(a => 
        a.name.toLowerCase() === 'size' && 
        a.option === '3'
      );
      
      return hasBlack && hasSize3;
    });
    
    if (blackSize3) {
      logger.section('Black/Size 3 Variation');
      logger.json(blackSize3);
    } else {
      logger.log('Black/Size 3 variation not found');
    }
    
  } else {
    logger.log('No variations found for this product');
  }
}

// Dump component data for debugging
function dumpComponentStructure(product) {
  if (!product) return;
  
  logger.section('Component Data Structure');
  
  // Create simulated component data for debugging in JSON
  const componentData = {
    productName: product.name,
    productId: product.id,
    productSlug: product.slug,
    hasAttributes: Array.isArray(product.attributes) || typeof product.attributes_json === 'string',
    hasVariations: Array.isArray(product.variations) || typeof product.variations_json === 'string',
    attributeExample: Array.isArray(product.attributes) && product.attributes.length > 0 
      ? product.attributes[0] 
      : typeof product.attributes_json === 'string' 
        ? JSON.parse(product.attributes_json)[0] 
        : null,
    variationExample: Array.isArray(product.variations) && product.variations.length > 0 
      ? product.variations[0] 
      : typeof product.variations_json === 'string' 
        ? JSON.parse(product.variations_json)[0] 
        : null,
  };
  
  logger.json(componentData);
}

// Main execution
async function main() {
  try {
    // Check the zig-zag product first
    const zigZagProduct = await findProductBySlug('zig-zag');
    
    if (zigZagProduct) {
      checkProductVariations(zigZagProduct);
      dumpComponentStructure(zigZagProduct);
    }
    
    // Check another product with variations for comparison
    logger.section('Checking another product for comparison');
    const products = await typesenseClient
      .collections('products')
      .documents()
      .search({
        q: '*',
        query_by: 'name',
        filter_by: 'variations_json:=*',
        per_page: 1
      });
    
    if (products.hits && products.hits.length > 0) {
      const otherProduct = products.hits[0].document;
      logger.log(`Found comparison product: ${otherProduct.name} (${otherProduct.slug})`);
      checkProductVariations(otherProduct);
    } else {
      logger.log('Could not find another product with variations for comparison');
    }
    
    logger.section('Verification Complete');
    console.log('Verification complete. Check the log file for details.');
    
  } catch (error) {
    logger.log(`Fatal error: ${error.message}`);
    console.error('Error during verification:', error);
  }
}

// Run the script
main().catch(console.error);
