// scripts/refresh-all-variations.mjs
import Typesense from 'typesense';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

// Load environment variables
dotenv.config();

// Configuration
const LOG_TO_FILE = true;
const LOG_FILE_PATH = './variations-refresh.log';
const BATCH_SIZE = 10; // Process products in batches

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

// Clear the log file if it exists
if (LOG_TO_FILE) {
  try {
    fs.writeFileSync(LOG_FILE_PATH, `Product Variations Refresh - ${new Date().toISOString()}\n\n`);
    logger.log('Initialized log file at', LOG_FILE_PATH);
  } catch (error) {
    console.error('Failed to initialize log file:', error);
  }
}

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

// Function to fetch all products from Typesense
async function fetchAllProducts() {
  try {
    logger.log('Fetching all products from Typesense...');
    
    let allProducts = [];
    let page = 1;
    const perPage = 250; // Maximum allowed per page
    let hasMoreProducts = true;
    
    while (hasMoreProducts) {
      logger.log(`Fetching page ${page} of products...`);
      
      // Search with pagination
      const searchParameters = {
        q: '*',
        query_by: 'name',
        per_page: perPage,
        page: page
      };
      
      const searchResults = await typesenseClient
        .collections('products')
        .documents()
        .search(searchParameters);
      
      if (!searchResults.hits || searchResults.hits.length === 0) {
        hasMoreProducts = false;
        break;
      }
      
      const products = searchResults.hits.map(hit => hit.document);
      logger.log(`Found ${products.length} products on page ${page}`);
      
      allProducts = allProducts.concat(products);
      
      // Check if we need to fetch more pages
      if (products.length < perPage) {
        hasMoreProducts = false;
      } else {
        page++;
      }
    }
    
    logger.log(`Found a total of ${allProducts.length} products in Typesense`);
    return allProducts;
  } catch (error) {
    logger.error(`Error fetching products from Typesense: ${error.message}`);
    throw error;
  }
}

// Function to ensure attributes are properly structured
function ensureValidAttributes(attributes) {
  // If attributes is already a proper array of objects, return it
  if (Array.isArray(attributes) && attributes.every(attr => 
      typeof attr === 'object' && attr !== null && 
      typeof attr.name === 'string' && 
      Array.isArray(attr.options))) {
    return attributes;
  }
  
  // Check for attributes_json field first
  if (attributes === null || attributes === undefined) {
    return [];
  }
  
  // If attributes is a string (JSON), try to parse it
  if (typeof attributes === 'string') {
    try {
      const parsedAttributes = JSON.parse(attributes);
      if (Array.isArray(parsedAttributes)) {
        return parsedAttributes;
      }
    } catch (error) {
      logger.error(`Error parsing attributes JSON: ${error.message}`);
    }
  }
  
  // If we reached here, attributes is not properly structured
  return [];
}

// Function to ensure variations are properly structured
function ensureValidVariations(variations, attributes, productId) {
  // If variations is a string (JSON), try to parse it
  if (typeof variations === 'string') {
    try {
      const parsedVariations = JSON.parse(variations);
      if (Array.isArray(parsedVariations)) {
        variations = parsedVariations;
      }
    } catch (error) {
      logger.error(`Error parsing variations JSON: ${error.message}`);
    }
  }
  
  // If variations is not an array, initialize as empty array
  if (!Array.isArray(variations)) {
    variations = [];
  }
  
  // Map through the variations to ensure they have all required fields
  return variations.map((variation, index) => {
    // Ensure variation has an ID
    const id = variation.id || `${productId}-${index + 1}`;
    
    // Ensure variation has attributes
    const variationAttributes = Array.isArray(variation.attributes) ? variation.attributes : [];
    
    // Ensure price fields
    const price = parseFloat(variation.price) || 0;
    const regular_price = parseFloat(variation.regular_price) || price;
    const sale_price = variation.sale_price ? parseFloat(variation.sale_price) : null;
    
    // Ensure stock fields
    const stock_status = variation.stock_status || 'outofstock';
    const stock_quantity = typeof variation.stock_quantity === 'number' ? variation.stock_quantity : 0;
    
    // Return a properly structured variation
    return {
      id,
      price,
      regular_price,
      sale_price,
      stock_status,
      stock_quantity,
      attributes: variationAttributes
    };
  });
}

// Function to process product variations
async function processProductVariations(product) {
  try {
    logger.log(`Processing product: ${product.name} (ID: ${product.id})`);
    
    // Check for attributes in multiple potential locations
    let attributes = null;
    
    // First check the attributes field
    if (product.attributes && (Array.isArray(product.attributes) || typeof product.attributes === 'string')) {
      attributes = ensureValidAttributes(product.attributes);
    } 
    // Then check attributes_json field if attributes is empty
    else if (product.attributes_json && typeof product.attributes_json === 'string') {
      attributes = ensureValidAttributes(product.attributes_json);
    }
    
    // Check if we found valid attributes
    if (!attributes || !Array.isArray(attributes) || attributes.length === 0) {
      // Also check for independent size/color fields
      if ((product.sizes && Array.isArray(product.sizes) && product.sizes.length > 0) ||
          (product.colors && Array.isArray(product.colors) && product.colors.length > 0)) {
        
        // Construct attributes from size/color fields
        attributes = [];
        
        if (product.sizes && Array.isArray(product.sizes) && product.sizes.length > 0) {
          attributes.push({
            id: 1,
            name: "Size",
            options: product.sizes,
            variation: true
          });
        }
        
        if (product.colors && Array.isArray(product.colors) && product.colors.length > 0) {
          attributes.push({
            id: attributes.length + 1,
            name: "Color",
            options: product.colors,
            variation: true
          });
        }
        
        logger.log(`Constructed attributes from size/color fields: ${attributes.length} attributes`);
      } else {
        logger.log('Product has no attributes, skipping');
        return;
      }
    }
    
    // Now check variations
    let variations = null;
    
    // First try the variations field
    if (product.variations && (Array.isArray(product.variations) || typeof product.variations === 'string')) {
      variations = ensureValidVariations(product.variations, attributes, product.id);
    } 
    // Then try variations_json
    else if (product.variations_json && typeof product.variations_json === 'string') {
      variations = ensureValidVariations(product.variations_json, attributes, product.id);
    }
    
    // If we have attributes but no variations, generate default variations
    if (!variations || !Array.isArray(variations) || variations.length === 0) {
      logger.log('Product has attributes but no variations, generating default variations');
      
      // Generate variations based on attributes
      variations = generateVariationsFromAttributes(attributes, product.id);
      
      // Update the product with the new variations
      await updateProductWithVariations(product.id, attributes, variations);
      
      logger.log(`Created ${variations.length} default variations for product ${product.name}`);
    } else {
      // Product has both attributes and variations
      logger.log(`Product has ${variations.length} existing variations`);
      
      // Update the product to ensure consistent structure
      await updateProductWithVariations(product.id, attributes, variations);
      logger.log('Updated product with consistent attribute and variation structure');
    }
  } catch (error) {
    logger.error(`Error processing product ${product.name || product.id}: ${error.message}`);
  }
}

// Function to generate all possible combinations of attribute options
function generateVariationsFromAttributes(attributes, productId) {
  // Filter to only include attributes marked for variation
  const variationAttributes = attributes.filter(attr => attr.variation !== false);
  
  if (variationAttributes.length === 0) {
    return [];
  }
  
  // Generate all possible combinations
  function generateCombinations(attributeIndex, currentCombination = {}) {
    // If we've processed all attributes, return the current combination
    if (attributeIndex >= variationAttributes.length) {
      return [currentCombination];
    }
    
    const currentAttribute = variationAttributes[attributeIndex];
    const combinations = [];
    
    // For each option of the current attribute
    for (const option of currentAttribute.options) {
      // Create a new combination with this option
      const newCombination = {
        ...currentCombination,
        [currentAttribute.name]: option
      };
      
      // Recursively generate combinations for the next attribute
      const nextCombinations = generateCombinations(attributeIndex + 1, newCombination);
      combinations.push(...nextCombinations);
    }
    
    return combinations;
  }
  
  // Generate all attribute combinations
  const attrCombinations = generateCombinations(0);
  
  // Convert attribute combinations to variations format
  return attrCombinations.map((combination, index) => {
    // Convert the combination object to attributes array
    const variationAttributes = Object.entries(combination).map(([name, option]) => ({
      name,
      option
    }));
    
    // Set all to out of stock by default
    return {
      id: `${productId}-${index + 1}`,
      attributes: variationAttributes,
      price: 0,
      regular_price: 0,
      sale_price: null,
      stock_status: 'outofstock',
      stock_quantity: 0
    };
  });
}

// Function to update a product with attributes and variations
async function updateProductWithVariations(productId, attributes, variations) {
  try {
    logger.log(`Updating product ${productId} with ${variations.length} variations`);
    
    // Prepare the update data
    const updateData = {
      attributes: attributes,
      attributes_json: JSON.stringify(attributes),
      variations: variations,
      variations_json: JSON.stringify(variations)
    };
    
    // Update the product in Typesense
    const updateResult = await typesenseClient
      .collections('products')
      .documents(productId.toString())
      .update(updateData);
    
    logger.log(`Updated product ID: ${updateResult.id}`);
    return updateResult;
  } catch (error) {
    logger.error(`Error updating product ${productId}: ${error.message}`);
    throw error;
  }
}

// Function to update stock status for a specific variation
async function updateVariationStock(productId, variationId, stockStatus, stockQuantity) {
  try {
    // First, retrieve the product
    const product = await typesenseClient
      .collections('products')
      .documents(productId.toString())
      .retrieve();
    
    // Ensure product has variations
    if (!product.variations || !Array.isArray(product.variations)) {
      logger.error(`Product ${productId} has no variations`);
      return false;
    }
    
    // Find the variation to update
    const variationIndex = product.variations.findIndex(v => v.id.toString() === variationId.toString());
    
    if (variationIndex === -1) {
      logger.error(`Variation ${variationId} not found in product ${productId}`);
      return false;
    }
    
    // Update the variation stock
    product.variations[variationIndex].stock_status = stockStatus;
    product.variations[variationIndex].stock_quantity = stockQuantity;
    
    // Update variations_json to match
    const variationsJson = JSON.stringify(product.variations);
    
    // Update the product
    const updateData = {
      variations: product.variations,
      variations_json: variationsJson
    };
    
    await typesenseClient
      .collections('products')
      .documents(productId.toString())
      .update(updateData);
    
    logger.log(`Updated stock for product ${productId}, variation ${variationId} to ${stockStatus} (${stockQuantity})`);
    return true;
  } catch (error) {
    logger.error(`Error updating variation stock: ${error.message}`);
    return false;
  }
}

// Function to update a specific product
async function updateProduct(productSlug) {
  try {
    // Search for the product by slug
    const searchParameters = {
      q: productSlug,
      query_by: 'slug',
      filter_by: `slug:=${productSlug}`,
      per_page: 1,
    };
    
    const searchResults = await typesenseClient
      .collections('products')
      .documents()
      .search(searchParameters);
    
    if (!searchResults.hits || searchResults.hits.length === 0) {
      logger.error(`No product found with slug "${productSlug}"`);
      return false;
    }
    
    const product = searchResults.hits[0].document;
    await processProductVariations(product);
    return true;
  } catch (error) {
    logger.error(`Error updating product ${productSlug}: ${error.message}`);
    return false;
  }
}

// Interactive mode for updating specific variation stock
async function interactiveStockUpdate() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  // Promisify readline question
  const question = (query) => new Promise(resolve => rl.question(query, resolve));
  
  try {
    logger.section('Interactive Variation Stock Update');
    
    const productSlug = await question('Enter product slug: ');
    
    // Find the product
    const searchResults = await typesenseClient
      .collections('products')
      .documents()
      .search({
        q: productSlug,
        query_by: 'slug',
        filter_by: `slug:=${productSlug}`,
        per_page: 1,
      });
    
    if (!searchResults.hits || searchResults.hits.length === 0) {
      logger.error(`No product found with slug "${productSlug}"`);
      rl.close();
      return;
    }
    
    const product = searchResults.hits[0].document;
    logger.log(`Found product: ${product.name} (ID: ${product.id})`);
    
    // Check if product has variations
    if (!product.variations || !Array.isArray(product.variations) || product.variations.length === 0) {
      logger.error('This product has no variations');
      rl.close();
      return;
    }
    
    // Display all variations
    logger.log('\nAvailable variations:');
    product.variations.forEach((variation, index) => {
      const attrs = variation.attributes.map(attr => `${attr.name}: ${attr.option}`).join(', ');
      logger.log(`${index + 1}. ID: ${variation.id}, ${attrs}, Stock: ${variation.stock_status} (${variation.stock_quantity})`);
    });
    
    // Ask which variation to update
    const variationIndex = parseInt(await question('\nEnter variation number to update: '), 10) - 1;
    
    if (isNaN(variationIndex) || variationIndex < 0 || variationIndex >= product.variations.length) {
      logger.error('Invalid variation number');
      rl.close();
      return;
    }
    
    const variation = product.variations[variationIndex];
    
    // Ask for new stock status
    const stockStatus = (await question('Enter new stock status (instock/outofstock): ')).toLowerCase();
    
    if (stockStatus !== 'instock' && stockStatus !== 'outofstock') {
      logger.error('Invalid stock status. Must be "instock" or "outofstock"');
      rl.close();
      return;
    }
    
    // Ask for new stock quantity
    const stockQuantity = parseInt(await question('Enter new stock quantity: '), 10);
    
    if (isNaN(stockQuantity) || stockQuantity < 0) {
      logger.error('Invalid stock quantity. Must be a non-negative number');
      rl.close();
      return;
    }
    
    // Update the variation
    const success = await updateVariationStock(product.id, variation.id, stockStatus, stockQuantity);
    
    if (success) {
      logger.log(`✅ Successfully updated variation stock for ${product.name}`);
    } else {
      logger.error('❌ Failed to update variation stock');
    }
    
    rl.close();
  } catch (error) {
    logger.error(`Error in interactive mode: ${error.message}`);
    rl.close();
  }
}

// Main function
async function main() {
  try {
    // Check if a command line argument was provided
    const args = process.argv.slice(2);
    const command = args[0];
    
    if (command === 'refresh') {
      // Refresh variations for all products
      logger.section('Starting Variations Refresh for All Products');
      
      // Fetch all products
      const products = await fetchAllProducts();
      
      // Process products in batches to avoid memory issues
      for (let i = 0; i < products.length; i += BATCH_SIZE) {
        const batch = products.slice(i, i + BATCH_SIZE);
        logger.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(products.length / BATCH_SIZE)}`);
        
        // Process each product in the batch
        for (const product of batch) {
          await processProductVariations(product);
        }
      }
      
      logger.section('Refresh Complete');
      logger.log(`✅ Processed ${products.length} products`);
      
    } else if (command === 'update') {
      // Update a specific product
      const productSlug = args[1];
      
      if (!productSlug) {
        logger.error('No product slug provided. Usage: node refresh-all-variations.mjs update [product-slug]');
        return;
      }
      
      logger.section(`Updating Product: ${productSlug}`);
      const success = await updateProduct(productSlug);
      
      if (success) {
        logger.log(`✅ Successfully updated product "${productSlug}"`);
      } else {
        logger.error(`❌ Failed to update product "${productSlug}"`);
      }
      
    } else if (command === 'stock') {
      // Interactive mode for updating stock
      await interactiveStockUpdate();
      
    } else {
      // Display usage instructions
      logger.section('Product Variations Tool');
      logger.log('Usage:');
      logger.log('  node refresh-all-variations.mjs refresh             - Refresh variations for all products');
      logger.log('  node refresh-all-variations.mjs update [slug]       - Update a specific product by slug');
      logger.log('  node refresh-all-variations.mjs stock               - Interactive mode to update variation stock');
    }
    
  } catch (error) {
    logger.error(`Unhandled error in main process: ${error.message}`);
  }
}

// Run the main function
main().catch(error => {
  logger.error(`Fatal error: ${error}`);
});
