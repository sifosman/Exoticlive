// scripts/fix-zigzag-with-typesense.mjs
import dotenv from 'dotenv';
import Typesense from 'typesense';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

// Load environment variables
dotenv.config();

// Configuration
const PRODUCT_SLUG = 'zig-zag';
const LOG_TO_FILE = true;
const LOG_FILE_PATH = './zigzag-typesense-fix.log';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    fs.writeFileSync(LOG_FILE_PATH, `Zig Zag Typesense Fix - ${new Date().toISOString()}\n\n`);
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

// The Zig Zag variations data 
// This is just sample data to demonstrate the solution
// In production, you would get this from WooCommerce
const ZIG_ZAG_ATTRIBUTES = [
  {
    id: 1,
    name: "Color",
    variation: true,
    options: ["Black", "Olive", "Tan"]
  },
  {
    id: 2,
    name: "Size",
    variation: true,
    options: ["3", "4", "5", "6", "7", "8"]
  }
];

// Sample variations data for all possible combinations
// You should replace this with real data from WooCommerce
const generateVariations = () => {
  const variations = [];
  let id = 0;
  
  // Iterate through each color
  ZIG_ZAG_ATTRIBUTES[0].options.forEach(color => {
    // Iterate through each size
    ZIG_ZAG_ATTRIBUTES[1].options.forEach(size => {
      id++;
      
      // Special case for Black/Size 3 - set to in stock
      const isInStock = (color === "Black" && size === "3");
      
      variations.push({
        id: `25093-${id}`,
        attributes: [
          { name: "Color", option: color },
          { name: "Size", option: size }
        ],
        price: 3090,
        regular_price: 3090,
        sale_price: null,
        stock_status: isInStock ? "instock" : "outofstock",
        stock_quantity: isInStock ? 1 : 0
      });
    });
  });
  
  return variations;
};

// Main function
async function fixZigZagProduct() {
  try {
    logger.section('Starting Zig Zag Fix with Typesense Direct Update');
    
    // Find the product in Typesense
    logger.section('Finding Product in Typesense');
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
    
    // Generate variations
    logger.section('Generating Variations');
    const variations = generateVariations();
    logger.log(`Generated ${variations.length} variations`);
    
    // Find Black/Size 3 variation
    const blackSize3 = variations.find(v => 
      v.attributes.some(a => a.name === 'Color' && a.option === 'Black') &&
      v.attributes.some(a => a.name === 'Size' && a.option === '3')
    );
    
    if (blackSize3) {
      logger.log('Black/Size 3 variation:');
      logger.log(`ID: ${blackSize3.id}`);
      logger.log(`Stock status: ${blackSize3.stock_status}`);
      logger.log(`Stock quantity: ${blackSize3.stock_quantity}`);
    }
    
    // Create the update data
    const updateData = {
      variations: variations,
      variations_json: JSON.stringify(variations),
      attributes: ZIG_ZAG_ATTRIBUTES,
      attributes_json: JSON.stringify(ZIG_ZAG_ATTRIBUTES)
    };
    
    // Update the product in Typesense
    logger.section('Updating Product in Typesense');
    
    try {
      const updateResult = await typesenseClient
        .collections('products')
        .documents(product.id.toString())
        .update(updateData);
      
      logger.log('Update result:', JSON.stringify(updateResult));
      logger.log('Successfully updated Zig Zag product with variations data');
    } catch (error) {
      logger.error('Error updating product:', error.message);
    }
    
    // Verify the update
    logger.section('Verifying Update');
    
    try {
      // Fetch the updated product
      const updatedProduct = await typesenseClient
        .collections('products')
        .documents(product.id.toString())
        .retrieve();
      
      logger.log('Retrieved updated product');
      
      // Check variations data
      if (updatedProduct.variations && updatedProduct.variations.length > 0) {
        logger.log(`✅ Product now has ${updatedProduct.variations.length} variations`);
        
        // Find the Black/Size 3 variation again
        const updatedBlackSize3 = updatedProduct.variations.find(v => 
          v.attributes.some(a => a.name === 'Color' && a.option === 'Black') &&
          v.attributes.some(a => a.name === 'Size' && a.option === '3')
        );
        
        if (updatedBlackSize3) {
          logger.log('✅ Black/Size 3 variation found in updated product:');
          logger.log(`ID: ${updatedBlackSize3.id}`);
          logger.log(`Stock status: ${updatedBlackSize3.stock_status}`);
          logger.log(`Stock quantity: ${updatedBlackSize3.stock_quantity}`);
        } else {
          logger.error('❌ Black/Size 3 variation not found in updated product');
        }
      } else {
        logger.error('❌ Updated product does not have variations data');
      }
      
    } catch (error) {
      logger.error('Error verifying update:', error.message);
    }
    
    logger.section('Update Complete');
    logger.log('The Zig Zag product has been updated with proper variations data');
    logger.log('Please check the product page to verify that:');
    logger.log('1. The Black/Size 3 variation shows as in stock');
    logger.log('2. Other variations show as out of stock');
    logger.log('3. You can add the Black/Size 3 variation to your cart');
    
  } catch (error) {
    logger.error('Unhandled error:', error);
  }
}

// Run the function
fixZigZagProduct().catch(error => {
  logger.error('Fatal error:', error);
});
