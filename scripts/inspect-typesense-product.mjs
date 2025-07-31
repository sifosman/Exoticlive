// Script to inspect a Typesense product's data structure
import dotenv from 'dotenv';
import Typesense from 'typesense';

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
  connectionTimeoutSeconds: 10,
});

// Function to retrieve and display product data
async function inspectProduct() {
  try {
    console.log('Searching for a variable product with variations...');
    
    // Search for a product that likely has variations
    const searchResults = await typesenseClient
      .collections('products')
      .documents()
      .search({
        q: '*',
        filter_by: 'type:VARIABLE',
        per_page: 1,
      });
    
    if (!searchResults.hits || searchResults.hits.length === 0) {
      console.log('No variable products found. Trying any product...');
      
      // Try to fetch any product
      const fallbackResults = await typesenseClient
        .collections('products')
        .documents()
        .search({
          q: '*',
          per_page: 1,
        });
      
      if (!fallbackResults.hits || fallbackResults.hits.length === 0) {
        console.log('No products found in the index.');
        return;
      }
      
      displayProductData(fallbackResults.hits[0].document);
      return;
    }
    
    displayProductData(searchResults.hits[0].document);
  } catch (error) {
    console.error('Error inspecting product data:', error.message);
  }
}

// Function to display product data in a readable format
function displayProductData(product) {
  console.log('\n===== PRODUCT DATA INSPECTION =====');
  console.log(`Product Name: ${product.name}`);
  console.log(`Product ID: ${product.id}`);
  console.log(`Product Type: ${product.type}`);
  console.log(`Stock Status: ${product.stock_status}`);
  
  console.log('\n----- Basic Product Fields -----');
  Object.entries(product)
    .filter(([key]) => !['attributes_json', 'variations_json'].includes(key) && typeof product[key] !== 'object')
    .forEach(([key, value]) => {
      console.log(`${key}: ${value}`);
    });
  
  console.log('\n----- Array Fields -----');
  Object.entries(product)
    .filter(([key, value]) => Array.isArray(value) && !['attributes_json', 'variations_json'].includes(key))
    .forEach(([key, value]) => {
      console.log(`${key}: ${JSON.stringify(value)}`);
    });
  
  console.log('\n----- Attributes JSON -----');
  let attributes = [];
  try {
    attributes = JSON.parse(product.attributes_json || '[]');
    console.log(JSON.stringify(attributes, null, 2));
  } catch (error) {
    console.log(`Error parsing attributes: ${error.message}`);
    console.log('Raw attributes_json:', product.attributes_json);
  }
  
  console.log('\n----- Variations JSON -----');
  let variations = [];
  try {
    variations = JSON.parse(product.variations_json || '[]');
    console.log(JSON.stringify(variations, null, 2));
  } catch (error) {
    console.log(`Error parsing variations: ${error.message}`);
    console.log('Raw variations_json:', product.variations_json);
  }
  
  console.log('\n----- Variation Stock Analysis -----');
  if (variations.length > 0) {
    variations.forEach((variation, index) => {
      console.log(`\nVariation #${index + 1}:`);
      console.log(`  ID: ${variation.id}`);
      console.log(`  Stock Status: ${variation.stock_status}`);
      console.log(`  Stock Quantity: ${variation.stock_quantity}`);
      
      if (variation.attributes && Array.isArray(variation.attributes)) {
        console.log('  Attributes:');
        variation.attributes.forEach(attr => {
          console.log(`    ${attr.name}: ${attr.option}`);
        });
      }
    });
  } else {
    console.log('No variations found for this product.');
  }
}

// Run the inspection
inspectProduct();
