// scripts/recreate-typesense-collection.mjs
import dotenv from 'dotenv';
import Typesense from 'typesense';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Logging setup
const LOG_FILE = './typesense-collection-recreate.log';
fs.writeFileSync(LOG_FILE, `Typesense Collection Recreation - ${new Date().toISOString()}\n\n`);

function log(message) {
  console.log(message);
  fs.appendFileSync(LOG_FILE, message + '\n');
}

// Initialize Typesense client
const typesenseClient = new Typesense.Client({
  nodes: [
    {
      host: process.env.NEXT_PUBLIC_TYPESENSE_HOST,
      port: parseInt(process.env.NEXT_PUBLIC_TYPESENSE_PORT),
      protocol: process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL,
    },
  ],
  apiKey: process.env.NEXT_PUBLIC_TYPESENSE_ADMIN_API_KEY,
  connectionTimeoutSeconds: 10,
});

// Create Typesense collection
async function createCollection() {
  log("Creating Typesense Collection...");
  
  const collectionSchema = {
    name: 'products',
    enable_nested_fields: true,
    fields: [
      { name: 'id', type: 'string', facet: false },
      { name: 'name', type: 'string', facet: false },
      { name: 'slug', type: 'string', facet: false },
      { name: 'type', type: 'string', facet: true },
      { name: 'status', type: 'string', facet: true },
      { name: 'featured', type: 'bool', facet: true },
      { name: 'catalog_visibility', type: 'string', facet: true },
      { name: 'description', type: 'string', facet: false },
      { name: 'short_description', type: 'string', facet: false },
      { name: 'price', type: 'float', facet: true },
      { name: 'regular_price', type: 'float', facet: true },
      { name: 'sale_price', type: 'float', facet: true, optional: true },
      { name: 'on_sale', type: 'bool', facet: true },
      { name: 'stock_status', type: 'string', facet: true },
      { name: 'stock_quantity', type: 'int32', facet: true, optional: true },
      { name: 'categories', type: 'string[]', facet: true, optional: true },
      { name: 'tags', type: 'string[]', facet: true, optional: true },
      { name: 'brand', type: 'string', facet: true, optional: true },
      { name: 'image_url', type: 'string', facet: false, optional: true },
      { name: 'image_alt', type: 'string', facet: false, optional: true },
      { name: 'gallery_images', type: 'string[]', facet: false, optional: true },
      { name: 'attributes_json', type: 'string', facet: false, optional: true },
      { name: 'variations_json', type: 'string', facet: false, optional: true },
      { name: 'colors', type: 'string[]', facet: true, optional: true },
      { name: 'sizes', type: 'string[]', facet: true, optional: true },
      // Using nested objects
      { name: 'attributes', type: 'object[]', optional: true },
      { name: 'variations', type: 'object[]', optional: true }
    ],
    default_sorting_field: 'price',
  };
  
  try {
    // First, check if collection exists and delete it if it does
    try {
      await typesenseClient.collections('products').retrieve();
      log("Existing 'products' collection found. Deleting it first...");
      await typesenseClient.collections('products').delete();
      log("Successfully deleted existing 'products' collection");
    } catch (error) {
      if (error.httpStatus === 404) {
        log("No existing 'products' collection found. Will create new one.");
      } else {
        throw error;
      }
    }
    
    // Create the collection
    await typesenseClient.collections().create(collectionSchema);
    log("Successfully created 'products' collection in Typesense");
    return true;
  } catch (error) {
    log(`ERROR: Failed to create collection: ${error.message}`);
    if (error.httpStatus === 409) {
      log("Collection already exists"); 
      return true;
    }
    return false;
  }
}

// Test collection by adding a sample product
async function addSampleProduct() {
  log("Adding sample product to verify collection is working...");
  
  const sampleProduct = {
    id: "test-product-1",
    name: "Test Product",
    slug: "test-product",
    type: "simple",
    status: "publish",
    featured: false,
    catalog_visibility: "visible",
    description: "This is a test product",
    short_description: "Test product",
    price: 29.99,
    regular_price: 29.99,
    sale_price: null,
    on_sale: false,
    stock_status: "instock",
    stock_quantity: 10,
    categories: ["Test Category"],
    attributes: [
      {
        name: "Color",
        options: ["Red", "Blue"]
      }
    ],
    variations: [
      {
        id: "test-product-1-1",
        attributes: [
          {
            name: "Color",
            option: "Red"
          }
        ],
        stock_status: "instock",
        stock_quantity: 5
      },
      {
        id: "test-product-1-2",
        attributes: [
          {
            name: "Color",
            option: "Blue"
          }
        ],
        stock_status: "outofstock",
        stock_quantity: 0
      }
    ],
    attributes_json: JSON.stringify([
      {
        name: "Color",
        options: ["Red", "Blue"]
      }
    ]),
    variations_json: JSON.stringify([
      {
        id: "test-product-1-1",
        attributes: [
          {
            name: "Color",
            option: "Red"
          }
        ],
        stock_status: "instock",
        stock_quantity: 5
      },
      {
        id: "test-product-1-2",
        attributes: [
          {
            name: "Color",
            option: "Blue"
          }
        ],
        stock_status: "outofstock",
        stock_quantity: 0
      }
    ])
  };
  
  try {
    await typesenseClient.collections('products').documents().create(sampleProduct);
    log("Successfully added sample product to Typesense");
    return true;
  } catch (error) {
    log(`ERROR: Failed to add sample product: ${error.message}`);
    return false;
  }
}

// Check collection
async function verifyCollection() {
  log("Verifying collection...");
  
  try {
    const collection = await typesenseClient.collections('products').retrieve();
    log(`Collection 'products' exists with ${collection.num_documents} documents`);
    
    if (collection.num_documents > 0) {
      const searchResults = await typesenseClient.collections('products').documents().search({
        q: '*',
        per_page: 1
      });
      
      log(`Search returned ${searchResults.found} total documents`);
      if (searchResults.hits.length > 0) {
        log(`Found sample document: ${searchResults.hits[0].document.name}`);
      }
    }
    
    return true;
  } catch (error) {
    log(`ERROR: Failed to verify collection: ${error.message}`);
    return false;
  }
}

// Main function
async function main() {
  log("=".repeat(80));
  log("STARTING TYPESENSE COLLECTION RECREATION");
  log("=".repeat(80));
  
  try {
    // Step 1: Create collection
    const collectionCreated = await createCollection();
    if (!collectionCreated) {
      throw new Error("Failed to create collection");
    }
    
    // Step 2: Add sample product
    const sampleProductAdded = await addSampleProduct();
    if (!sampleProductAdded) {
      throw new Error("Failed to add sample product");
    }
    
    // Step 3: Verify collection
    const collectionVerified = await verifyCollection();
    if (!collectionVerified) {
      throw new Error("Failed to verify collection");
    }
    
    log("=".repeat(80));
    log("COLLECTION RECREATION COMPLETED SUCCESSFULLY");
    log("=".repeat(80));
    
    log("\nYou can now run the complete-woocommerce-sync.mjs script to import all products.");
    
  } catch (error) {
    log("=".repeat(80));
    log(`COLLECTION RECREATION FAILED: ${error.message}`);
    log("=".repeat(80));
  }
}

// Run the script
main();
