import Typesense from 'typesense';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Debug output settings
const LOG_TO_FILE = true;
const LOG_FILE_PATH = './variation-debug.log';

// Constants
const PRODUCT_SLUG = 'zig-zag';
const SPECIFIC_VARIATION = {
  color: 'Black',
  size: '3'
};

// Initialize the logger
const logger = {
  log: (...args) => {
    console.log(...args);
    if (LOG_TO_FILE) {
      fs.appendFileSync(LOG_FILE_PATH, args.join(' ') + '\n');
    }
  },
  error: (...args) => {
    console.error(...args);
    if (LOG_TO_FILE) {
      fs.appendFileSync(LOG_FILE_PATH, '[ERROR] ' + args.join(' ') + '\n');
    }
  },
  divider: () => {
    const divider = '-'.repeat(80);
    console.log(divider);
    if (LOG_TO_FILE) {
      fs.appendFileSync(LOG_FILE_PATH, divider + '\n');
    }
  },
  section: (title) => {
    const divider = '='.repeat(80);
    console.log(divider);
    console.log(title);
    console.log(divider);
    if (LOG_TO_FILE) {
      fs.appendFileSync(LOG_FILE_PATH, divider + '\n');
      fs.appendFileSync(LOG_FILE_PATH, title + '\n');
      fs.appendFileSync(LOG_FILE_PATH, divider + '\n');
    }
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

// Clear the log file if it exists
if (LOG_TO_FILE) {
  try {
    fs.writeFileSync(LOG_FILE_PATH, `Variation Debug Log - ${new Date().toISOString()}\n\n`);
    logger.log('Initialized log file at', LOG_FILE_PATH);
  } catch (error) {
    console.error('Failed to initialize log file:', error);
  }
}

// Utility functions
function normalizeAttributeName(name) {
  if (!name) return '';
  
  // Convert to lowercase, trim spaces, and remove all non-alphanumeric characters
  let normalized = name.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  
  // Remove 'pa_' prefix if present (WooCommerce specific)
  if (normalized.startsWith('pa')) {
    normalized = normalized.substring(2);
  }
  
  return normalized;
}

function normalizeAttributeValue(value) {
  if (value === null || value === undefined) return '';
  // Convert to string first to handle numeric values
  const stringValue = String(value);
  return stringValue.toLowerCase().trim();
}

// Simulate the frontend component's logic for finding a matching variation
function findMatchingVariation(variations, selectedAttrs) {
  if (!variations || !Array.isArray(variations) || variations.length === 0) {
    return null;
  }
  
  // Get array of selected attribute names
  const selectedAttrNames = Object.keys(selectedAttrs);
  
  // Return null if no attributes are selected
  if (selectedAttrNames.length === 0) {
    return null;
  }
  
  logger.log('Finding matching variation for attributes:', JSON.stringify(selectedAttrs));
  
  // Find variations that match ALL selected attributes
  const matchingVariations = variations.filter(variation => {
    // Skip variations without attributes
    if (!variation.attributes || !Array.isArray(variation.attributes)) {
      logger.log(`Variation ${variation.id} has no attributes, skipping`);
      return false;
    }
    
    // Check each selected attribute
    const allAttributesMatch = selectedAttrNames.every(attrName => {
      const normalizedAttrName = normalizeAttributeName(attrName);
      const normalizedAttrValue = normalizeAttributeValue(selectedAttrs[attrName]);
      
      // Find matching attribute in variation
      const attributeMatches = variation.attributes.some(attr => {
        const varAttrName = normalizeAttributeName(attr.name || attr.option_name);
        const varAttrValue = normalizeAttributeValue(attr.option || attr.value);
        
        const nameMatches = varAttrName === normalizedAttrName;
        const valueMatches = varAttrValue === normalizedAttrValue;
        
        logger.log(`  Comparing variation ${variation.id} attribute: ${varAttrName}=${varAttrValue} with selected ${normalizedAttrName}=${normalizedAttrValue}`);
        logger.log(`  Name match: ${nameMatches}, Value match: ${valueMatches}`);
        
        return nameMatches && valueMatches;
      });
      
      return attributeMatches;
    });
    
    logger.log(`Variation ${variation.id} all attributes match: ${allAttributesMatch}`);
    return allAttributesMatch;
  });
  
  logger.log(`Found ${matchingVariations.length} matching variations`);
  
  if (matchingVariations.length > 0) {
    const firstMatch = matchingVariations[0];
    logger.log('First matching variation:', JSON.stringify(firstMatch, null, 2));
    
    // Log stock status
    logger.log(`Stock status: ${firstMatch.stock_status}`);
    logger.log(`Stock quantity: ${firstMatch.stock_quantity}`);
    logger.log(`Is in stock: ${firstMatch.stock_status === 'instock' && firstMatch.stock_quantity > 0}`);
  }
  
  // Return the first matching variation (if any)
  return matchingVariations.length > 0 ? matchingVariations[0] : null;
}

// Main execution function
async function main() {
  try {
    logger.section('Starting Deep Dive Debug of Variation Stock Issues');
    logger.log('Target product:', PRODUCT_SLUG);
    logger.log('Target variation:', JSON.stringify(SPECIFIC_VARIATION));
    
    // Search for product in Typesense by slug
    logger.section('1. Fetching Product Data from Typesense');
    
    const searchParameters = {
      q: PRODUCT_SLUG,
      query_by: 'slug',
      filter_by: `slug:=${PRODUCT_SLUG}`,
      per_page: 1,
    };
    
    logger.log('Search parameters:', JSON.stringify(searchParameters));
    
    const searchResults = await typesenseClient
      .collections('products')
      .documents()
      .search(searchParameters);
    
    if (!searchResults.hits || searchResults.hits.length === 0) {
      logger.error('Product not found in Typesense');
      return;
    }
    
    // Get the product document
    const product = searchResults.hits[0].document;
    logger.log('Product found:', product.name);
    logger.log('Product ID:', product.id);
    
    // Log key product fields
    logger.section('2. Basic Product Information');
    logger.log('Name:', product.name);
    logger.log('Slug:', product.slug);
    logger.log('Stock status (base):', product.stock_status);
    
    // Process variations from JSON string if needed
    logger.section('3. Parsing Variations');
    let variations = [];
    
    if (typeof product.variations_json === 'string') {
      try {
        logger.log('Found variations_json, parsing...');
        variations = JSON.parse(product.variations_json);
        logger.log(`Successfully parsed ${variations.length} variations`);
      } catch (error) {
        logger.error('Error parsing variations_json:', error.message);
      }
    } else if (Array.isArray(product.variations)) {
      logger.log('Found variations array directly');
      variations = product.variations;
      logger.log(`Found ${variations.length} variations in direct array`);
    } else {
      logger.error('No variations found in product data');
    }
    
    // Process attributes from JSON string if needed
    logger.section('4. Parsing Attributes');
    let attributes = [];
    
    if (typeof product.attributes_json === 'string') {
      try {
        logger.log('Found attributes_json, parsing...');
        attributes = JSON.parse(product.attributes_json);
        logger.log(`Successfully parsed ${attributes.length} attributes`);
      } catch (error) {
        logger.error('Error parsing attributes_json:', error.message);
      }
    } else if (Array.isArray(product.attributes)) {
      logger.log('Found attributes array directly');
      attributes = product.attributes;
      logger.log(`Found ${attributes.length} attributes in direct array`);
    } else {
      logger.error('No attributes found in product data');
    }
    
    // Log all variations
    logger.section('5. All Variations');
    if (variations.length > 0) {
      variations.forEach((variation, index) => {
        logger.log(`\nVariation #${index + 1}:`);
        logger.log(`ID: ${variation.id}`);
        logger.log(`Stock status: ${variation.stock_status}`);
        logger.log(`Stock quantity: ${variation.stock_quantity}`);
        
        if (variation.attributes && Array.isArray(variation.attributes)) {
          logger.log('Attributes:');
          variation.attributes.forEach(attr => {
            logger.log(`  ${attr.name}: ${attr.option}`);
          });
        } else {
          logger.log('No attributes in this variation');
        }
      });
    } else {
      logger.error('No variations to display');
    }
    
    // Log all attributes
    logger.section('6. All Attributes');
    if (attributes.length > 0) {
      attributes.forEach((attribute, index) => {
        logger.log(`\nAttribute #${index + 1}:`);
        logger.log(`Name: ${attribute.name}`);
        logger.log(`Is variation: ${attribute.variation !== false}`);
        logger.log('Options:', attribute.options.join(', '));
      });
    } else {
      logger.error('No attributes to display');
    }
    
    // Focus on the specific variation we're debugging
    logger.section('7. Debugging Specific Variation: ' + JSON.stringify(SPECIFIC_VARIATION));
    
    // Find the variation matching the specific attributes
    const matchingVariation = findMatchingVariation(variations, SPECIFIC_VARIATION);
    
    if (matchingVariation) {
      logger.log('Found matching variation:');
      logger.log(`ID: ${matchingVariation.id}`);
      logger.log(`Stock status: ${matchingVariation.stock_status}`);
      logger.log(`Stock quantity: ${matchingVariation.stock_quantity}`);
      
      // Detailed attribute comparison for this variation
      logger.log('\nDetailed attribute analysis:');
      
      Object.entries(SPECIFIC_VARIATION).forEach(([attrName, attrValue]) => {
        logger.log(`\nFor attribute: ${attrName} = ${attrValue}`);
        
        const normalizedSearchName = normalizeAttributeName(attrName);
        const normalizedSearchValue = normalizeAttributeValue(attrValue);
        
        logger.log(`Normalized search: ${normalizedSearchName} = ${normalizedSearchValue}`);
        
        // Check each attribute in the matching variation
        if (matchingVariation.attributes && Array.isArray(matchingVariation.attributes)) {
          matchingVariation.attributes.forEach(attr => {
            const varAttrName = normalizeAttributeName(attr.name || attr.option_name);
            const varAttrValue = normalizeAttributeValue(attr.option || attr.value);
            
            logger.log(`Variation attribute: ${attr.name} = ${attr.option}`);
            logger.log(`Normalized variation attribute: ${varAttrName} = ${varAttrValue}`);
            logger.log(`Name match: ${varAttrName === normalizedSearchName}`);
            logger.log(`Value match: ${varAttrValue === normalizedSearchValue}`);
          });
        }
      });
      
      // Verify stock status logic
      logger.log('\nStock Status Verification:');
      logger.log(`Raw stock_status: ${matchingVariation.stock_status}`);
      logger.log(`Raw stock_quantity: ${matchingVariation.stock_quantity}`);
      
      const stockStatusNormalized = matchingVariation.stock_status ? matchingVariation.stock_status.toLowerCase() : 'unknown';
      const isExplicitlyInStock = stockStatusNormalized === 'instock';
      const hasPositiveStock = typeof matchingVariation.stock_quantity === 'number' && matchingVariation.stock_quantity > 0;
      
      logger.log(`Is explicitly marked as "instock": ${isExplicitlyInStock}`);
      logger.log(`Has positive stock quantity: ${hasPositiveStock}`);
      logger.log(`Final stock status determination: ${isExplicitlyInStock && hasPositiveStock ? 'IN STOCK' : 'OUT OF STOCK'}`);
      
      // Check for any data type issues
      logger.log('\nData Type Analysis:');
      logger.log(`stock_status is type: ${typeof matchingVariation.stock_status}`);
      logger.log(`stock_quantity is type: ${typeof matchingVariation.stock_quantity}`);
      
      if (typeof matchingVariation.stock_quantity === 'string') {
        logger.log(`Warning: stock_quantity is a string ("${matchingVariation.stock_quantity}") instead of a number`);
        const parsedQuantity = parseInt(matchingVariation.stock_quantity, 10);
        logger.log(`Parsed as number: ${parsedQuantity}, isNaN: ${isNaN(parsedQuantity)}`);
      }
    } else {
      logger.error('No variation found matching the specific attributes');
      
      // Detailed attribute search to see what we might be missing
      logger.log('\nDetailed search for why no match was found:');
      
      Object.entries(SPECIFIC_VARIATION).forEach(([attrName, attrValue]) => {
        logger.log(`\nSearching variations with ${attrName} = ${attrValue}:`);
        
        const normalizedSearchName = normalizeAttributeName(attrName);
        const normalizedSearchValue = normalizeAttributeValue(attrValue);
        
        // Find variations with this attribute name and value
        const matchingVariationsForAttr = variations.filter(variation => {
          if (!variation.attributes || !Array.isArray(variation.attributes)) {
            return false;
          }
          
          return variation.attributes.some(attr => {
            const varAttrName = normalizeAttributeName(attr.name || attr.option_name);
            const varAttrValue = normalizeAttributeValue(attr.option || attr.value);
            
            return varAttrName === normalizedSearchName && varAttrValue === normalizedSearchValue;
          });
        });
        
        logger.log(`Found ${matchingVariationsForAttr.length} variations matching this attribute`);
        
        if (matchingVariationsForAttr.length > 0) {
          matchingVariationsForAttr.forEach((variation, idx) => {
            logger.log(`\n  Match #${idx + 1}:`);
            logger.log(`  ID: ${variation.id}`);
            logger.log(`  Stock status: ${variation.stock_status}`);
            logger.log(`  Stock quantity: ${variation.stock_quantity}`);
            
            if (variation.attributes && Array.isArray(variation.attributes)) {
              logger.log('  Attributes:');
              variation.attributes.forEach(attr => {
                logger.log(`    ${attr.name}: ${attr.option}`);
              });
            }
          });
        }
      });
    }
    
    // Summary and recommendations
    logger.section('8. Summary and Recommendations');
    if (matchingVariation) {
      if (matchingVariation.stock_status === 'instock' && matchingVariation.stock_quantity > 0) {
        logger.log('The variation IS in stock but might not be displaying correctly');
        logger.log('Possible issues:');
        logger.log('1. Frontend logic might not be correctly evaluating the stock status');
        logger.log('2. There might be a data format inconsistency between Typesense and frontend');
        logger.log('3. Attribute name/value normalization might be different on frontend vs backend');
      } else {
        logger.log('The variation is genuinely out of stock according to the data');
        logger.log(`Stock status: ${matchingVariation.stock_status}`);
        logger.log(`Stock quantity: ${matchingVariation.stock_quantity}`);
        logger.log('Consider updating the product in WooCommerce to correct the stock status');
      }
    } else {
      logger.log('Unable to find the specified variation combination');
      logger.log('Possible issues:');
      logger.log('1. The attribute names/values might be inconsistent between WooCommerce and Typesense');
      logger.log('2. The variation might not exist in the database at all');
      logger.log('3. There might be data format issues with the variations data');
    }
    
    logger.log('\nRecommended actions:');
    logger.log('1. Check the raw data in WooCommerce admin for this product variation');
    logger.log('2. Verify the data synchronization process between WooCommerce and Typesense');
    logger.log('3. Update the frontend code to better handle the stock status evaluation');
    
    logger.divider();
    logger.log('Debug script completed. Check the log file for complete details.');
  } catch (error) {
    logger.error('Error in main execution:', error);
  }
}

// Run the main function
main().catch(error => {
  logger.error('Unhandled error in main:', error);
});
