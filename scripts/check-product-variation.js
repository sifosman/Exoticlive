// Script to check a specific product variation in Typesense
require('dotenv').config();
const Typesense = require('typesense');

// Initialize Typesense client
const typesenseClient = new Typesense.Client({
  nodes: [{
    host: process.env.TYPESENSE_CLOUD_HOST || process.env.NEXT_PUBLIC_TYPESENSE_HOST,
    port: 443,
    protocol: 'https'
  }],
  apiKey: process.env.TYPESENSE_CLOUD_API_KEY || process.env.NEXT_PUBLIC_TYPESENSE_SEARCH_API_KEY,
  connectionTimeoutSeconds: 2
});

async function checkProductVariation() {
  try {
    // Get product slug from command line arguments
    const productSlug = process.argv[2];
    const colorOption = process.argv[3];
    const sizeOption = process.argv[4];
    
    if (!productSlug) {
      console.error('Please provide a product slug as the first argument');
      process.exit(1);
    }
    
    console.log(`Searching for product: ${productSlug}`);
    if (colorOption) console.log(`Color: ${colorOption}`);
    if (sizeOption) console.log(`Size: ${sizeOption}`);

    // Search for the product by slug
    const searchParameters = {
      q: productSlug,
      query_by: 'slug',
      per_page: 1
    };

    const searchResults = await typesenseClient
      .collections('products')
      .documents()
      .search(searchParameters);

    if (!searchResults.hits || searchResults.hits.length === 0) {
      console.log(`Product with slug '${productSlug}' not found`);
      return;
    }

    const product = searchResults.hits[0].document;
    console.log(`Found product: ${product.name} (ID: ${product.id})`);
    
    // Check if product has variations
    if (!product.variations || !Array.isArray(product.variations) || product.variations.length === 0) {
      console.log('Product has no variations');
      console.log('Product stock status:', product.stock_status);
      console.log('Product stock quantity:', product.stock_quantity);
      return;
    }
    
    console.log(`Product has ${product.variations.length} variations`);
    
    // Find the specific variation by color and size
    if (colorOption && sizeOption) {
      // Function to normalize attribute names
      const normalizeAttributeName = (name) => {
        if (!name) return '';
        let normalized = name.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
        if (normalized.startsWith('pa')) {
          normalized = normalized.substring(2);
        }
        return normalized;
      };
      
      // Function to normalize attribute values
      const normalizeAttributeValue = (value) => {
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        return stringValue.toLowerCase().trim();
      };
      
      const matchingVariations = product.variations.filter(variation => {
        if (!variation.attributes) return false;
        
        let hasMatchingColor = false;
        let hasMatchingSize = false;
        
        // Check color
        Object.entries(variation.attributes).forEach(([attrName, attrValue]) => {
          const normalizedName = normalizeAttributeName(attrName);
          const normalizedValue = normalizeAttributeValue(attrValue);
          
          if (normalizedName === 'color' && normalizedValue === colorOption.toLowerCase()) {
            hasMatchingColor = true;
          }
          
          if (normalizedName === 'size' && normalizedValue === sizeOption.toLowerCase()) {
            hasMatchingSize = true;
          }
        });
        
        return hasMatchingColor && hasMatchingSize;
      });
      
      if (matchingVariations.length > 0) {
        console.log(`Found ${matchingVariations.length} variations matching color "${colorOption}" and size "${sizeOption}"`);
        
        matchingVariations.forEach((variation, index) => {
          console.log(`\nVariation #${index + 1}:`);
          console.log(`ID: ${variation.id}`);
          console.log(`Stock Status: ${variation.stock_status}`);
          console.log(`Stock Quantity: ${variation.stock_quantity}`);
          console.log(`Manage Stock: ${variation.manage_stock}`);
          console.log(`Attributes:`, variation.attributes);
          
          // Show raw stock data if available
          if (variation._raw_stock_data) {
            console.log(`Raw stock data:`, variation._raw_stock_data);
          }
        });
      } else {
        console.log(`No variations found with color "${colorOption}" and size "${sizeOption}"`);
      }
    } else {
      // Show the first 5 variations for overview
      console.log('\nFirst 5 variations:');
      product.variations.slice(0, 5).forEach((variation, index) => {
        console.log(`\nVariation #${index + 1}:`);
        console.log(`ID: ${variation.id}`);
        console.log(`Stock Status: ${variation.stock_status}`);
        console.log(`Stock Quantity: ${variation.stock_quantity}`);
        console.log(`Attributes:`, variation.attributes);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the function
checkProductVariation();
