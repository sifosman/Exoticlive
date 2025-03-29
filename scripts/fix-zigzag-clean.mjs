import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Typesense from 'typesense';
import fs from 'fs';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env') });

// Create a log file
const logFile = join(__dirname, 'zigzag-fix-log.txt');
fs.writeFileSync(logFile, `Zig Zag Fix Log - ${new Date().toISOString()}\n\n`, 'utf8');

// Log function
const log = (message) => {
  console.log(message);
  fs.appendFileSync(logFile, message + '\n', 'utf8');
};

// Create admin client
const adminClient = new Typesense.Client({
  nodes: [{
    host: process.env.NEXT_PUBLIC_TYPESENSE_HOST || 'localhost',
    port: Number(process.env.NEXT_PUBLIC_TYPESENSE_PORT) || 443,
    protocol: process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL || 'https'
  }],
  apiKey: process.env.NEXT_PUBLIC_TYPESENSE_ADMIN_API_KEY || '',
  connectionTimeoutSeconds: 5
});

// Define the verified correct ZigZag product data
const VERIFIED_VARIATIONS = [
  // Black variations
  { 
    id: '25094', 
    attributes: [
      { name: 'color', option: 'Black' },
      { name: 'size', option: '3' }
    ],
    stock_quantity: 1,
    stock_status: 'instock',
    price: 59.99,
    sale_price: 49.99,
    regular_price: 59.99
  },
  { 
    id: '25095', 
    attributes: [
      { name: 'color', option: 'Black' },
      { name: 'size', option: '4' }
    ],
    stock_quantity: 0,
    stock_status: 'outofstock',
    price: 59.99,
    sale_price: 49.99,
    regular_price: 59.99
  },
  { 
    id: '25096', 
    attributes: [
      { name: 'color', option: 'Black' },
      { name: 'size', option: '5' }
    ],
    stock_quantity: 3,
    stock_status: 'instock',
    price: 59.99,
    sale_price: 49.99,
    regular_price: 59.99
  },
  
  // Red variations
  { 
    id: '25100', 
    attributes: [
      { name: 'color', option: 'Red' },
      { name: 'size', option: '3' }
    ],
    stock_quantity: 1,
    stock_status: 'instock',
    price: 59.99,
    sale_price: 49.99,
    regular_price: 59.99
  },
  { 
    id: '25101', 
    attributes: [
      { name: 'color', option: 'Red' },
      { name: 'size', option: '4' }
    ],
    stock_quantity: 0,
    stock_status: 'outofstock',
    price: 59.99,
    sale_price: 49.99,
    regular_price: 59.99
  },
  { 
    id: '25102', 
    attributes: [
      { name: 'color', option: 'Red' },
      { name: 'size', option: '5' }
    ],
    stock_quantity: 3,
    stock_status: 'instock',
    price: 59.99,
    sale_price: 49.99,
    regular_price: 59.99
  }
];

// Create product attributes array
const VERIFIED_ATTRIBUTES = [
  {
    name: 'color',
    options: ['Black', 'Red'],
    variation: true
  },
  {
    name: 'size',
    options: ['3', '4', '5'],
    variation: true
  }
];

// Completely reset and recreate the Zig Zag product with verified data only
async function resetZigZagProduct() {
  log('Starting complete reset of Zig Zag product...');
  
  try {
    // Check if product exists
    log('Checking if Zig Zag product exists...');
    const searchResults = await adminClient
      .collections('products')
      .documents()
      .search({
        q: 'zig-zag',
        query_by: 'slug',
        per_page: 1
      });
    
    // If product exists, delete it first
    if (searchResults.hits && searchResults.hits.length > 0) {
      const productId = searchResults.hits[0].document.id;
      log(`Found existing Zig Zag product (ID: ${productId}), deleting it...`);
      
      try {
        await adminClient
          .collections('products')
          .documents(productId)
          .delete();
        
        log('Successfully deleted existing Zig Zag product');
      } catch (error) {
        log(`Error deleting product: ${error.message}`);
      }
    } else {
      log('No existing Zig Zag product found');
    }
    
    // Create a brand new product with verified data
    log('Creating new Zig Zag product with verified data...');
    
    const newProduct = {
      id: '25093',
      name: 'Zig Zag',
      slug: 'zig-zag',
      description: 'Stylish Zig Zag pattern shoes available in various colors and sizes.',
      short_description: 'Stylish Zig Zag pattern shoes',
      price: 59.99,
      sale_price: 49.99,
      regular_price: 59.99,
      stock_quantity: 10,
      stock_status: 'instock',
      image_url: 'https://wp.exoticshoes.co.za/wp-content/uploads/2023/10/zigzag-black.jpg',
      image_alt: 'Zig Zag Shoes',
      attributes_json: JSON.stringify(VERIFIED_ATTRIBUTES),
      variations_json: JSON.stringify(VERIFIED_VARIATIONS),
      colors: ['Black', 'Red'], // Extracted for faceting
      sizes: ['3', '4', '5'],   // Extracted for faceting
      categories: ['Shoes', 'Women'],
      tags: ['Fashion', 'Trending']
    };
    
    // Add a slight delay to ensure deletion completes
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const result = await adminClient
      .collections('products')
      .documents()
      .create(newProduct);
    
    log(`Successfully created new Zig Zag product (ID: ${result.id})`);
    
    // Verify the created product
    log('Verifying created product...');
    
    const verifyResult = await adminClient
      .collections('products')
      .documents(result.id)
      .retrieve();
    
    log('Verification successful. Available fields:');
    log(JSON.stringify(Object.keys(verifyResult), null, 2));
    
    // Verify variations_json
    if (verifyResult.variations_json) {
      try {
        const variations = JSON.parse(verifyResult.variations_json);
        log(`Verified variations_json: Found ${variations.length} variations`);
        
        // Look for Black/Size 3
        const blackSize3 = variations.find(v => 
          v.attributes?.some(a => a.name === 'color' && a.option === 'Black') &&
          v.attributes?.some(a => a.name === 'size' && a.option === '3')
        );
        
        if (blackSize3) {
          log('Verified Black/Size 3 variation:');
          log(JSON.stringify(blackSize3, null, 2));
        } else {
          log('CRITICAL ERROR: Could not find Black/Size 3 in verified data');
        }
      } catch (error) {
        log(`Error parsing variations_json: ${error.message}`);
      }
    } else {
      log('CRITICAL ERROR: variations_json missing from verified product');
    }
    
    // Verify attributes_json
    if (verifyResult.attributes_json) {
      try {
        const attributes = JSON.parse(verifyResult.attributes_json);
        log(`Verified attributes_json: Found ${attributes.length} attributes with these options:`);
        attributes.forEach(attr => {
          log(`- ${attr.name}: ${attr.options.join(', ')}`);
        });
      } catch (error) {
        log(`Error parsing attributes_json: ${error.message}`);
      }
    } else {
      log('CRITICAL ERROR: attributes_json missing from verified product');
    }
    
    log('Reset and verification complete!');
    return true;
  } catch (error) {
    log(`Fatal error resetting product: ${error.message}`);
    if (error.response) {
      log(`Response status: ${error.response.status}`);
      log(`Response data: ${JSON.stringify(error.response.data)}`);
    }
    return false;
  }
}

// Run the reset
resetZigZagProduct()
  .then(success => {
    if (success) {
      log('\nProduct reset successful - please refresh your product page to see changes');
    } else {
      log('\nProduct reset failed - please check the log for errors');
    }
  })
  .catch(err => log(`Unexpected error: ${err.message}`));
