// scripts/fix-product-variations-sync.mjs
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Typesense from 'typesense';
import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';
import fs from 'fs';

// Get dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.join(__dirname, '..', '.env') });

// Configuration - Change this to the product slug you want to fix
const PRODUCT_SLUG = 'zig-zag';
const LOG_TO_FILE = true;
const LOG_FILE_PATH = './product-variations-fix.log';

// Initialize logger
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
    console.log('\n' + divider);
    console.log(title);
    console.log(divider);
    if (LOG_TO_FILE) {
      fs.appendFileSync(LOG_FILE_PATH, '\n' + divider + '\n');
      fs.appendFileSync(LOG_FILE_PATH, title + '\n');
      fs.appendFileSync(LOG_FILE_PATH, divider + '\n');
    }
  }
};

// Clear the log file if it exists
if (LOG_TO_FILE) {
  try {
    fs.writeFileSync(LOG_FILE_PATH, `Product Variations Fix - ${new Date().toISOString()}\n\n`);
    logger.log('Initialized log file at', LOG_FILE_PATH);
  } catch (error) {
    console.error('Failed to initialize log file:', error);
  }
}

// Initialize WooCommerce API
const WooCommerce = new WooCommerceRestApi({
  url: process.env.NEXT_PUBLIC_WORDPRESS_URL,
  consumerKey: process.env.WC_CONSUMER_KEY,
  consumerSecret: process.env.WC_CONSUMER_SECRET,
  version: 'wc/v3'
});

// Initialize Typesense client
const client = new Typesense.Client({
  nodes: [{
    host: process.env.NEXT_PUBLIC_TYPESENSE_HOST,
    port: Number(process.env.NEXT_PUBLIC_TYPESENSE_PORT),
    protocol: process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL || 'http'
  }],
  apiKey: process.env.NEXT_PUBLIC_TYPESENSE_ADMIN_API_KEY,
  connectionTimeoutSeconds: 5
});

// Function to fetch a specific product from WooCommerce
async function fetchProductFromWooCommerce(slug) {
  try {
    logger.log(`Fetching product "${slug}" from WooCommerce...`);
    const response = await WooCommerce.get('products', {
      slug: slug,
      status: 'publish'
    });
    
    if (!response.data || response.data.length === 0) {
      throw new Error(`No product found with slug "${slug}"`);
    }
    
    const product = response.data[0];
    logger.log(`Found product: ${product.name} (ID: ${product.id})`);
    
    // Fetch variations if it's a variable product
    if (product.type === 'variable') {
      logger.log(`Fetching variations for product ID ${product.id}...`);
      const variationsResponse = await WooCommerce.get(`products/${product.id}/variations`, {
        per_page: 100
      });
      
      product.variations_data = variationsResponse.data;
      logger.log(`Found ${product.variations_data.length} variations`);
    } else {
      logger.log(`Product is not variable (type: ${product.type}), skipping variations fetch`);
      product.variations_data = [];
    }
    
    return product;
  } catch (error) {
    logger.error(`Error fetching product from WooCommerce: ${error.message}`);
    throw error;
  }
}

// Function to find product in Typesense
async function findProductInTypesense(slug) {
  try {
    logger.log(`Searching for product "${slug}" in Typesense...`);
    const searchParameters = {
      q: slug,
      query_by: 'slug',
      filter_by: `slug:=${slug}`,
      per_page: 1,
    };
    
    const searchResults = await client
      .collections('products')
      .documents()
      .search(searchParameters);
    
    if (!searchResults.hits || searchResults.hits.length === 0) {
      logger.error(`No product found with slug "${slug}" in Typesense`);
      return null;
    }
    
    const product = searchResults.hits[0].document;
    logger.log(`Found product in Typesense: ${product.name} (ID: ${product.id})`);
    return product;
  } catch (error) {
    logger.error(`Error searching for product in Typesense: ${error.message}`);
    throw error;
  }
}

// Transform WooCommerce product for Typesense
function transformProduct(product, existingTypesenseProduct) {
  // Extract categories
  const categories = product.categories?.map(cat => cat.name) || [];
  
  // Process attributes properly (keeping the full structure, not just names)
  const attributes = product.attributes?.map(attr => ({
    id: attr.id,
    name: attr.name,
    position: attr.position,
    visible: attr.visible,
    variation: attr.variation,
    options: attr.options || []
  })) || [];
  
  // Process variations properly
  const variations = (product.variations_data || []).map(variation => {
    // Map variation attributes
    const variationAttributes = variation.attributes.map(attr => ({
      name: attr.name,
      option: attr.option
    }));
    
    return {
      id: variation.id.toString(),
      price: parseFloat(variation.price || '0'),
      regular_price: parseFloat(variation.regular_price || '0'),
      sale_price: variation.sale_price ? parseFloat(variation.sale_price) : null,
      stock_status: variation.stock_status || 'outofstock',
      stock_quantity: variation.stock_quantity || 0,
      attributes: variationAttributes
    };
  });
  
  // Create the updated document for Typesense
  const updatedDocument = {
    id: product.id.toString(),
    name: product.name,
    description: product.description,
    short_description: product.short_description,
    price: parseFloat(product.price || '0'),
    sale_price: product.sale_price ? parseFloat(product.sale_price) : null,
    regular_price: parseFloat(product.regular_price || '0'),
    stock_quantity: product.stock_quantity,
    stock_status: product.stock_status,
    categories: categories,
    image_url: product.images[0]?.src || '',
    image_alt: product.images[0]?.alt || '',
    slug: product.slug,
    gallery_images: product.images.map(img => img.src),
    attributes: attributes,
    // Add these fields for variations
    attributes_json: JSON.stringify(attributes),
    variations_json: JSON.stringify(variations),
    variations: variations // Add direct variations array too
  };
  
  // Preserve any existing fields that we don't want to overwrite
  if (existingTypesenseProduct) {
    // Preserve any fields from existing product that aren't in our update
    // (Add fields here if needed)
  }
  
  return updatedDocument;
}

// Main function to fix variations for a specific product
async function fixProductVariations(slug) {
  try {
    logger.section(`Starting Variations Fix for Product: ${slug}`);
    
    // 1. Fetch the product from WooCommerce with all variations
    const wooProduct = await fetchProductFromWooCommerce(slug);
    
    // 2. Find the product in Typesense
    const typesenseProduct = await findProductInTypesense(slug);
    
    if (!typesenseProduct) {
      logger.error('Cannot update product in Typesense because it was not found');
      return;
    }
    
    // 3. Transform the product with proper variation data
    logger.section('Transforming Product Data');
    const updatedProduct = transformProduct(wooProduct, typesenseProduct);
    
    // Log some debugging info about the variations
    if (updatedProduct.variations && updatedProduct.variations.length > 0) {
      logger.log(`Processed ${updatedProduct.variations.length} variations`);
      logger.log('\nSample variation data:');
      
      // Show info for the first variation
      const sampleVariation = updatedProduct.variations[0];
      logger.log(`ID: ${sampleVariation.id}`);
      logger.log(`Stock status: ${sampleVariation.stock_status}`);
      logger.log(`Stock quantity: ${sampleVariation.stock_quantity}`);
      logger.log('Attributes:');
      sampleVariation.attributes.forEach(attr => {
        logger.log(`  ${attr.name}: ${attr.option}`);
      });
      
      // Find Black/Size 3 variation if it exists
      const blackSize3 = updatedProduct.variations.find(v => {
        if (!v.attributes || !Array.isArray(v.attributes)) return false;
        
        const hasBlackColor = v.attributes.some(attr => 
          attr.name.toLowerCase().includes('color') && 
          attr.option.toLowerCase() === 'black'
        );
        
        const hasSize3 = v.attributes.some(attr => 
          attr.name.toLowerCase().includes('size') && 
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
        logger.log('\nBlack/Size 3 variation not found in the data');
      }
    } else {
      logger.log('No variations found for this product in WooCommerce');
    }
    
    // 4. Update the product in Typesense
    logger.section('Updating Product in Typesense');
    logger.log(`Updating product ID: ${typesenseProduct.id}`);
    
    try {
      const updateResult = await client
        .collections('products')
        .documents(typesenseProduct.id.toString())
        .update(updatedProduct);
      
      logger.log('Update successful!');
      logger.log(`Updated product ID: ${updateResult.id}`);
    } catch (error) {
      logger.error(`Error updating product in Typesense: ${error.message}`);
    }
    
    // 5. Verify the update
    logger.section('Verifying Update');
    try {
      const updatedTypesenseProduct = await client
        .collections('products')
        .documents(typesenseProduct.id.toString())
        .retrieve();
      
      logger.log('Retrieved updated product');
      
      // Check if variations_json exists and has content
      if (updatedTypesenseProduct.variations_json) {
        try {
          const parsedVariations = JSON.parse(updatedTypesenseProduct.variations_json);
          logger.log(`✅ variations_json exists and contains ${parsedVariations.length} variations`);
        } catch (error) {
          logger.error(`Error parsing variations_json from updated product: ${error.message}`);
        }
      } else {
        logger.error('Updated product does not have variations_json field');
      }
      
      // Check direct variations array
      if (Array.isArray(updatedTypesenseProduct.variations)) {
        logger.log(`✅ variations array exists and contains ${updatedTypesenseProduct.variations.length} variations`);
      } else {
        logger.error('Updated product does not have variations array');
      }
    } catch (error) {
      logger.error(`Error retrieving updated product: ${error.message}`);
    }
    
    logger.section('Fix Complete');
    logger.log(`✅ Successfully updated product "${slug}" with proper variations data`);
    logger.log('\nNext steps:');
    logger.log('1. Check the product page to verify variations display correctly');
    logger.log('2. Verify that variations with stock show as in stock');
    logger.log('3. Update your product sync script to properly handle variations in the future');
    
  } catch (error) {
    logger.error(`Unhandled error during product fix: ${error.message}`);
  }
}

// Run the fix for the specified product
fixProductVariations(PRODUCT_SLUG).catch(error => {
  logger.error(`Fatal error: ${error}`);
});
