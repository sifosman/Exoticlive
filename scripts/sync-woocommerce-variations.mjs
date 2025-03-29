import Typesense from 'typesense';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Configuration
const LOG_TO_FILE = true;
const LOG_FILE_PATH = './woo-typesense-sync.log';
const PRODUCT_SLUG = 'zig-zag'; // Can be changed to '' to sync all products

// WooCommerce API credentials
const WOOCOMMERCE_API_URL = process.env.NEXT_PUBLIC_WORDPRESS_API_URL?.replace(/\/graphql$/, '') || 'https://exoticlive.co.za/wp-json';
const WOO_CONSUMER_KEY = process.env.WOO_CONSUMER_KEY;
const WOO_CONSUMER_SECRET = process.env.WOO_CONSUMER_SECRET;

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
    fs.writeFileSync(LOG_FILE_PATH, `WooCommerce to Typesense Sync - ${new Date().toISOString()}\n\n`);
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

// Function to fetch product data from WooCommerce REST API
async function fetchProductFromWooCommerce(slug) {
  try {
    // First get the product ID from the slug
    const productsEndpoint = `${WOOCOMMERCE_API_URL}/wc/v3/products?slug=${slug}&consumer_key=${WOO_CONSUMER_KEY}&consumer_secret=${WOO_CONSUMER_SECRET}`;
    
    logger.log(`Fetching product with slug "${slug}" from WooCommerce`);
    const productsResponse = await fetch(productsEndpoint);
    
    if (!productsResponse.ok) {
      throw new Error(`Failed to fetch products: ${productsResponse.status} ${productsResponse.statusText}`);
    }
    
    const products = await productsResponse.json();
    
    if (!products || products.length === 0) {
      throw new Error(`No product found with slug "${slug}"`);
    }
    
    const product = products[0];
    logger.log(`Found product: ${product.name} (ID: ${product.id})`);
    
    // Now fetch the variations for this product
    const variationsEndpoint = `${WOOCOMMERCE_API_URL}/wc/v3/products/${product.id}/variations?per_page=100&consumer_key=${WOO_CONSUMER_KEY}&consumer_secret=${WOO_CONSUMER_SECRET}`;
    
    logger.log(`Fetching variations for product ID ${product.id}`);
    const variationsResponse = await fetch(variationsEndpoint);
    
    if (!variationsResponse.ok) {
      throw new Error(`Failed to fetch variations: ${variationsResponse.status} ${variationsResponse.statusText}`);
    }
    
    const variations = await variationsResponse.json();
    logger.log(`Found ${variations.length} variations`);
    
    // Combine the product and variations data
    return {
      product,
      variations
    };
  } catch (error) {
    logger.error(`Error fetching product from WooCommerce: ${error.message}`);
    throw error;
  }
}

// Function to find product in Typesense
async function findProductInTypesense(slug) {
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
      return null;
    }
    
    return searchResults.hits[0].document;
  } catch (error) {
    logger.error(`Error searching for product in Typesense: ${error.message}`);
    throw error;
  }
}

// Function to convert WooCommerce variations to our format
function convertWooCommerceVariations(wooVariations) {
  return wooVariations.map(wooVariation => {
    // Convert WooCommerce attributes to our format
    const attributes = Object.entries(wooVariation.attributes || {})
      .map(([name, value]) => {
        // Clean up the attribute name (remove pa_ prefix)
        const cleanName = name.startsWith('pa_') ? name.substring(3) : name;
        
        // Format attribute name properly
        const formattedName = cleanName
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        return {
          name: formattedName,
          option: value
        };
      });
    
    // Create a variation object in our format
    return {
      id: wooVariation.id.toString(),
      attributes,
      price: wooVariation.price,
      regular_price: wooVariation.regular_price || wooVariation.price,
      sale_price: wooVariation.sale_price || null,
      stock_status: wooVariation.stock_status || 'outofstock',
      stock_quantity: wooVariation.stock_quantity || 0
    };
  });
}

// Main execution function
async function main() {
  try {
    logger.section('Starting WooCommerce to Typesense Variation Sync');
    
    // Validate WooCommerce credentials
    if (!WOO_CONSUMER_KEY || !WOO_CONSUMER_SECRET) {
      logger.error('WooCommerce API credentials are not set. Please set WOO_CONSUMER_KEY and WOO_CONSUMER_SECRET in your .env file');
      logger.log('\nTo generate these keys:');
      logger.log('1. Go to WooCommerce > Settings > Advanced > REST API');
      logger.log('2. Click "Add Key"');
      logger.log('3. Set permissions to "Read/Write"');
      logger.log('4. Copy the Consumer Key and Consumer Secret to your .env file');
      return;
    }
    
    // Process specific product (Zig Zag) or all products
    if (PRODUCT_SLUG) {
      // Single product mode
      await processProduct(PRODUCT_SLUG);
    } else {
      // All products mode - Not implemented yet
      logger.log('Multiple product sync is not implemented yet. Please set PRODUCT_SLUG to a specific product');
    }
    
    logger.section('Sync Complete');
    logger.log('The variations data has been synchronized from WooCommerce to Typesense');
    logger.log('The product page should now display accurate stock information from your WooCommerce store');
    
  } catch (error) {
    logger.error(`Unhandled error in main process: ${error.message}`);
  }
}

// Process a single product
async function processProduct(slug) {
  try {
    logger.section(`Processing Product: ${slug}`);
    
    // Step 1: Fetch the product data from WooCommerce
    logger.log('Fetching product data from WooCommerce');
    const wooData = await fetchProductFromWooCommerce(slug);
    
    if (!wooData) {
      logger.error(`Product "${slug}" not found in WooCommerce`);
      return;
    }
    
    logger.log(`Fetched product: ${wooData.product.name}`);
    logger.log(`Found ${wooData.variations.length} variations in WooCommerce`);
    
    // Step 2: Find the product in Typesense
    logger.log('Looking up product in Typesense');
    const typesenseProduct = await findProductInTypesense(slug);
    
    if (!typesenseProduct) {
      logger.error(`Product "${slug}" not found in Typesense`);
      return;
    }
    
    logger.log(`Found product in Typesense: ${typesenseProduct.name} (ID: ${typesenseProduct.id})`);
    
    // Step 3: Convert WooCommerce variations to our format
    logger.log('Converting WooCommerce variations to Typesense format');
    const convertedVariations = convertWooCommerceVariations(wooData.variations);
    
    // Step 4: Log some variations for verification
    if (convertedVariations.length > 0) {
      logger.log('\nSample of converted variations:');
      const sampleSize = Math.min(3, convertedVariations.length);
      
      for (let i = 0; i < sampleSize; i++) {
        const variation = convertedVariations[i];
        logger.log(`\nVariation ${i + 1}:`);
        logger.log(`ID: ${variation.id}`);
        logger.log(`Stock status: ${variation.stock_status}`);
        logger.log(`Stock quantity: ${variation.stock_quantity}`);
        logger.log('Attributes:');
        variation.attributes.forEach(attr => {
          logger.log(`  ${attr.name}: ${attr.option}`);
        });
      }
    }
    
    // Step 5: Look for specific variation of interest
    const blackSize3 = convertedVariations.find(v => {
      if (!v.attributes || !Array.isArray(v.attributes)) return false;
      
      const hasBlackColor = v.attributes.some(attr => 
        attr.name.toLowerCase() === 'color' && 
        attr.option.toLowerCase() === 'black'
      );
      
      const hasSize3 = v.attributes.some(attr => 
        attr.name.toLowerCase() === 'size' && 
        attr.option === '3'
      );
      
      return hasBlackColor && hasSize3;
    });
    
    if (blackSize3) {
      logger.log('\nFound Black/Size 3 variation:');
      logger.log(`ID: ${blackSize3.id}`);
      logger.log(`Stock status: ${blackSize3.stock_status}`);
      logger.log(`Stock quantity: ${blackSize3.stock_quantity}`);
    } else {
      logger.log('\nNo Black/Size 3 variation found in WooCommerce data');
    }
    
    // Step 6: Update the product in Typesense with variation data from WooCommerce
    logger.section('Updating Product in Typesense');
    logger.log(`Updating product ${typesenseProduct.name} with ${convertedVariations.length} variations from WooCommerce`);
    
    // Create the update object
    const productUpdate = {
      variations_json: JSON.stringify(convertedVariations),
      variations: convertedVariations
    };
    
    // Update the document in Typesense
    try {
      const updateResult = await typesenseClient
        .collections('products')
        .documents(typesenseProduct.id.toString())
        .update(productUpdate);
      
      logger.log('Update successful!');
      logger.log(`Updated product ID: ${updateResult.id}`);
    } catch (error) {
      logger.error(`Error updating product in Typesense: ${error.message}`);
    }
    
    // Step 7: Verify the update
    logger.section('Verification');
    
    // Fetch the updated product to verify the changes
    try {
      const updatedProduct = await typesenseClient
        .collections('products')
        .documents(typesenseProduct.id.toString())
        .retrieve();
      
      logger.log('Retrieved updated product');
      
      // Check if variations_json exists and has content
      if (updatedProduct.variations_json) {
        try {
          const parsedVariations = JSON.parse(updatedProduct.variations_json);
          logger.log(`✅ variations_json exists and contains ${parsedVariations.length} variations`);
          
          // Check for specific variation again
          if (blackSize3) {
            // Look for the same variation in updated data
            const updatedBlackSize3 = parsedVariations.find(v => {
              if (!v.attributes || !Array.isArray(v.attributes)) return false;
              
              const hasBlackColor = v.attributes.some(attr => 
                attr.name.toLowerCase() === 'color' && 
                attr.option.toLowerCase() === 'black'
              );
              
              const hasSize3 = v.attributes.some(attr => 
                attr.name.toLowerCase() === 'size' && 
                attr.option === '3'
              );
              
              return hasBlackColor && hasSize3;
            });
            
            if (updatedBlackSize3) {
              logger.log('\n✅ Verified Black/Size 3 variation in updated data:');
              logger.log(`ID: ${updatedBlackSize3.id}`);
              logger.log(`Stock status: ${updatedBlackSize3.stock_status}`);
              logger.log(`Stock quantity: ${updatedBlackSize3.stock_quantity}`);
              
              // Check if the stock values match what we found in WooCommerce
              const stockMatch = updatedBlackSize3.stock_status === blackSize3.stock_status && 
                                updatedBlackSize3.stock_quantity === blackSize3.stock_quantity;
              
              logger.log(`✅ Stock data matches WooCommerce: ${stockMatch ? 'Yes' : 'No'}`);
              
              if (!stockMatch) {
                logger.log('Expected:');
                logger.log(`  Status: ${blackSize3.stock_status}, Quantity: ${blackSize3.stock_quantity}`);
                logger.log('Actual:');
                logger.log(`  Status: ${updatedBlackSize3.stock_status}, Quantity: ${updatedBlackSize3.stock_quantity}`);
              }
            } else {
              logger.log('❌ Could not find Black/Size 3 variation in the updated data');
            }
          }
        } catch (error) {
          logger.error(`Error parsing variations_json from updated product: ${error.message}`);
        }
      } else {
        logger.error('Updated product does not have variations_json field');
      }
    } catch (error) {
      logger.error(`Error retrieving updated product: ${error.message}`);
    }
    
  } catch (error) {
    logger.error(`Error processing product "${slug}": ${error.message}`);
  }
}

// Run the main function
main().catch(error => {
  logger.error(`Fatal error: ${error}`);
});
