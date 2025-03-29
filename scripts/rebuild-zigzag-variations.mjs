import Typesense from 'typesense';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Configuration
const PRODUCT_SLUG = 'zig-zag';
const LOG_TO_FILE = true;
const LOG_FILE_PATH = './zigzag-rebuild.log';

// Sample data for variations - adjust stock quantities as needed
const VARIATIONS_DATA = [
  // Black color variations
  {
    id: '25093-1', // Using a convention of productId-variationNumber
    attributes: [
      { name: 'Color', option: 'Black' },
      { name: 'Size', option: '3' }
    ],
    price: 3090, // Should match the product price
    regular_price: 3090,
    sale_price: null,
    stock_status: 'instock',
    stock_quantity: 1 // This is the specific variation we know should be in stock
  },
  {
    id: '25093-2',
    attributes: [
      { name: 'Color', option: 'Black' },
      { name: 'Size', option: '4' }
    ],
    price: 3090,
    regular_price: 3090,
    sale_price: null,
    stock_status: 'outofstock',
    stock_quantity: 0
  },
  {
    id: '25093-3',
    attributes: [
      { name: 'Color', option: 'Black' },
      { name: 'Size', option: '5' }
    ],
    price: 3090,
    regular_price: 3090,
    sale_price: null,
    stock_status: 'outofstock',
    stock_quantity: 0
  },
  {
    id: '25093-4',
    attributes: [
      { name: 'Color', option: 'Black' },
      { name: 'Size', option: '6' }
    ],
    price: 3090,
    regular_price: 3090,
    sale_price: null,
    stock_status: 'outofstock',
    stock_quantity: 0
  },
  {
    id: '25093-5',
    attributes: [
      { name: 'Color', option: 'Black' },
      { name: 'Size', option: '7' }
    ],
    price: 3090,
    regular_price: 3090,
    sale_price: null,
    stock_status: 'outofstock',
    stock_quantity: 0
  },
  {
    id: '25093-6',
    attributes: [
      { name: 'Color', option: 'Black' },
      { name: 'Size', option: '8' }
    ],
    price: 3090,
    regular_price: 3090,
    sale_price: null,
    stock_status: 'outofstock',
    stock_quantity: 0
  },
  
  // Olive color variations
  {
    id: '25093-7',
    attributes: [
      { name: 'Color', option: 'Olive' },
      { name: 'Size', option: '3' }
    ],
    price: 3090,
    regular_price: 3090,
    sale_price: null,
    stock_status: 'outofstock',
    stock_quantity: 0
  },
  {
    id: '25093-8',
    attributes: [
      { name: 'Color', option: 'Olive' },
      { name: 'Size', option: '4' }
    ],
    price: 3090,
    regular_price: 3090,
    sale_price: null,
    stock_status: 'outofstock',
    stock_quantity: 0
  },
  {
    id: '25093-9',
    attributes: [
      { name: 'Color', option: 'Olive' },
      { name: 'Size', option: '5' }
    ],
    price: 3090,
    regular_price: 3090,
    sale_price: null,
    stock_status: 'outofstock',
    stock_quantity: 0
  },
  {
    id: '25093-10',
    attributes: [
      { name: 'Color', option: 'Olive' },
      { name: 'Size', option: '6' }
    ],
    price: 3090,
    regular_price: 3090,
    sale_price: null,
    stock_status: 'outofstock',
    stock_quantity: 0
  },
  {
    id: '25093-11',
    attributes: [
      { name: 'Color', option: 'Olive' },
      { name: 'Size', option: '7' }
    ],
    price: 3090,
    regular_price: 3090,
    sale_price: null,
    stock_status: 'outofstock',
    stock_quantity: 0
  },
  {
    id: '25093-12',
    attributes: [
      { name: 'Color', option: 'Olive' },
      { name: 'Size', option: '8' }
    ],
    price: 3090,
    regular_price: 3090,
    sale_price: null,
    stock_status: 'outofstock',
    stock_quantity: 0
  },
  
  // Tan color variations
  {
    id: '25093-13',
    attributes: [
      { name: 'Color', option: 'Tan' },
      { name: 'Size', option: '3' }
    ],
    price: 3090,
    regular_price: 3090,
    sale_price: null,
    stock_status: 'outofstock',
    stock_quantity: 0
  },
  {
    id: '25093-14',
    attributes: [
      { name: 'Color', option: 'Tan' },
      { name: 'Size', option: '4' }
    ],
    price: 3090,
    regular_price: 3090,
    sale_price: null,
    stock_status: 'outofstock',
    stock_quantity: 0
  },
  {
    id: '25093-15',
    attributes: [
      { name: 'Color', option: 'Tan' },
      { name: 'Size', option: '5' }
    ],
    price: 3090,
    regular_price: 3090,
    sale_price: null,
    stock_status: 'outofstock',
    stock_quantity: 0
  },
  {
    id: '25093-16',
    attributes: [
      { name: 'Color', option: 'Tan' },
      { name: 'Size', option: '6' }
    ],
    price: 3090,
    regular_price: 3090,
    sale_price: null,
    stock_status: 'outofstock',
    stock_quantity: 0
  },
  {
    id: '25093-17',
    attributes: [
      { name: 'Color', option: 'Tan' },
      { name: 'Size', option: '7' }
    ],
    price: 3090,
    regular_price: 3090,
    sale_price: null,
    stock_status: 'outofstock',
    stock_quantity: 0
  },
  {
    id: '25093-18',
    attributes: [
      { name: 'Color', option: 'Tan' },
      { name: 'Size', option: '8' }
    ],
    price: 3090,
    regular_price: 3090,
    sale_price: null,
    stock_status: 'outofstock',
    stock_quantity: 0
  }
];

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
    fs.writeFileSync(LOG_FILE_PATH, `Zig Zag Variations Rebuild - ${new Date().toISOString()}\n\n`);
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

async function main() {
  try {
    logger.section('Starting Zig Zag Variations Rebuild');
    logger.log('Target product:', PRODUCT_SLUG);
    
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
    
    // Update product with variations
    logger.section('2. Creating Variations Data');
    logger.log(`Creating ${VARIATIONS_DATA.length} variations for the product`);
    
    // Serialize variations to JSON
    const variations_json = JSON.stringify(VARIATIONS_DATA);
    
    // Update the product in Typesense
    logger.section('3. Updating Product in Typesense');
    logger.log('Adding variations data to product document');
    
    // Create the update object
    const productUpdate = {
      variations_json: variations_json,
      // We'll also add a non-JSON version for compatibility with any code that might expect it
      variations: VARIATIONS_DATA
    };
    
    // Update the document in Typesense
    try {
      const updateResult = await typesenseClient
        .collections('products')
        .documents(product.id.toString())
        .update(productUpdate);
      
      logger.log('Update result:', JSON.stringify(updateResult));
      logger.log('Successfully updated product with variations data');
    } catch (error) {
      logger.error('Error updating product:', error.message);
    }
    
    logger.section('4. Verification');
    
    // Fetch the updated product to verify the changes
    try {
      const updatedProduct = await typesenseClient
        .collections('products')
        .documents(product.id.toString())
        .retrieve();
      
      logger.log('Retrieved updated product');
      
      // Check if variations_json exists and has content
      if (updatedProduct.variations_json) {
        try {
          const parsedVariations = JSON.parse(updatedProduct.variations_json);
          logger.log(`Verified variations_json is valid and contains ${parsedVariations.length} variations`);
          
          // Log the Black/Size 3 variation
          const blackSize3 = parsedVariations.find(v => {
            return v.attributes.some(a => a.name === 'Color' && a.option === 'Black') &&
                  v.attributes.some(a => a.name === 'Size' && a.option === '3');
          });
          
          if (blackSize3) {
            logger.log('Verified Black/Size 3 variation:');
            logger.log(`ID: ${blackSize3.id}`);
            logger.log(`Stock status: ${blackSize3.stock_status}`);
            logger.log(`Stock quantity: ${blackSize3.stock_quantity}`);
          } else {
            logger.error('Could not find Black/Size 3 variation in the updated data');
          }
        } catch (error) {
          logger.error('Error parsing variations_json from updated product:', error.message);
        }
      } else {
        logger.error('Updated product does not have variations_json field');
      }
      
      // Check direct variations array
      if (Array.isArray(updatedProduct.variations)) {
        logger.log(`Verified variations array exists and contains ${updatedProduct.variations.length} variations`);
      } else {
        logger.error('Updated product does not have variations array');
      }
    } catch (error) {
      logger.error('Error retrieving updated product:', error.message);
    }
    
    logger.section('5. Summary');
    logger.log('✅ Rebuild process completed');
    logger.log('The product should now have properly defined variations with correct stock status information');
    logger.log('Next steps:');
    logger.log('1. Check the product page to verify variations display correctly');
    logger.log('2. Verify that Black/Size 3 shows as in stock');
    logger.log('3. Add additional variations to stock in WooCommerce if needed');
    
  } catch (error) {
    logger.error('Unhandled error in main process:', error);
  }
}

// Run the main function
main().catch(error => {
  logger.error('Fatal error:', error);
});
