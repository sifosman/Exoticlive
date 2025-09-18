// Script to check stock quantity for a specific product variation
const Typesense = require('typesense');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Log environment variable for debugging
console.log('Environment config:');
console.log('- NEXT_PUBLIC_TYPESENSE_HOST:', process.env.NEXT_PUBLIC_TYPESENSE_HOST);
console.log('- NEXT_PUBLIC_TYPESENSE_PORT:', process.env.NEXT_PUBLIC_TYPESENSE_PORT);
console.log('- NEXT_PUBLIC_TYPESENSE_PROTOCOL:', process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL);
console.log('- NEXT_PUBLIC_TYPESENSE_API_KEY:', process.env.NEXT_PUBLIC_TYPESENSE_API_KEY ? '[REDACTED]' : 'undefined');

// Initialize Typesense client
const typesenseClient = new Typesense.Client({
  nodes: [
    {
      host: process.env.NEXT_PUBLIC_TYPESENSE_HOST || process.env.TYPESENSE_HOST || 'localhost',
      port: process.env.NEXT_PUBLIC_TYPESENSE_PORT || process.env.TYPESENSE_PORT || '8108',
      protocol: process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL || process.env.TYPESENSE_PROTOCOL || 'http'
    },
  ],
  apiKey: process.env.NEXT_PUBLIC_TYPESENSE_API_KEY || process.env.TYPESENSE_ADMIN_API_KEY || 'xyz',
  connectionTimeoutSeconds: 10
});

async function checkVariation() {
  try {
    console.log('Searching for "zig zag" product...');
    
    // Search for the product by name
    const searchResults = await typesenseClient
      .collections('products')
      .documents()
      .search({
        q: 'zig zag',
        query_by: 'name',
        per_page: 5,
        include_fields: 'name,slug,variations,attributes'
      });

    if (!searchResults.hits || searchResults.hits.length === 0) {
      console.log('Product not found');
      return;
    }

    const product = searchResults.hits[0].document;
    console.log(`Found product: ${product.name} (${product.slug})`);
    
    // Check if variations exist
    if (!product.variations || !Array.isArray(product.variations)) {
      console.log('No variations found for this product');
      return;
    }
    
    console.log(`Product has ${product.variations.length} variations`);
    
    // Find the specific variation with color "black" and size "3"
    const targetVariation = product.variations.find(variation => {
      if (!variation.attributes || !Array.isArray(variation.attributes)) return false;
      
      const hasBlackColor = variation.attributes.some(attr => 
        (attr.name.toLowerCase() === 'color' || attr.name.toLowerCase() === 'colour') && 
        attr.option.toLowerCase() === 'black'
      );
      
      const hasSize3 = variation.attributes.some(attr => 
        attr.name.toLowerCase() === 'size' && 
        attr.option === '3'
      );
      
      return hasBlackColor && hasSize3;
    });
    
    if (!targetVariation) {
      console.log('Could not find variation with color "black" and size "3"');
      return;
    }
    
    console.log('\n--- VARIATION DETAILS ---');
    console.log(`Variation ID: ${targetVariation.id}`);
    console.log(`Stock Quantity: ${targetVariation.stock_quantity}`);
    console.log(`Stock Status: ${targetVariation.stock_status}`);
    console.log(`Manage Stock: ${targetVariation.manage_stock}`);
    console.log(`Price: ${targetVariation.price}`);
    
    // Print all attributes for this variation
    console.log('\nAttributes:');
    if (targetVariation.attributes && Array.isArray(targetVariation.attributes)) {
      targetVariation.attributes.forEach(attr => {
        console.log(`- ${attr.name}: ${attr.option}`);
      });
    }
    
  } catch (error) {
    console.error('Error checking variation:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the function
checkVariation();
