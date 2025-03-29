// Debug script for checking "Zig Zag" product variation stock
require('dotenv').config();
const Typesense = require('typesense');

// Log the keys we're using
console.log('API Key:', process.env.NEXT_PUBLIC_TYPESENSE_SEARCH_API_KEY ? '[set]' : '[not set]');
console.log('Host:', process.env.NEXT_PUBLIC_TYPESENSE_HOST);
console.log('Port:', process.env.NEXT_PUBLIC_TYPESENSE_PORT);
console.log('Protocol:', process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL);

// Initialize Typesense client with the same configuration as in the app
const typesenseClient = new Typesense.Client({
  nodes: [{
    host: process.env.NEXT_PUBLIC_TYPESENSE_HOST || 'localhost',
    port: Number(process.env.NEXT_PUBLIC_TYPESENSE_PORT) || 443,
    protocol: process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL || 'https'
  }],
  apiKey: process.env.NEXT_PUBLIC_TYPESENSE_SEARCH_API_KEY || 'xyz',
  connectionTimeoutSeconds: 5
});

async function debugZigZagVariation() {
  try {
    console.log('Searching for Zig Zag product...');
    
    // First search for the product by name (similar to slug search in the app)
    const searchResults = await typesenseClient
      .collections('products')
      .documents()
      .search({
        q: 'zig zag',
        query_by: 'name,slug',
        per_page: 5
      });

    if (!searchResults.hits || searchResults.hits.length === 0) {
      console.log('Product not found');
      return;
    }

    // Get the first product that matches
    const product = searchResults.hits[0].document;
    console.log(`\nFound product: "${product.name}" (${product.slug})`);
    console.log(`Product ID: ${product.id}`);
    
    // Check if variations exist
    if (!product.variations || !Array.isArray(product.variations)) {
      console.log('No variations found for this product');
      return;
    }
    
    console.log(`\nProduct has ${product.variations.length} variations`);
    
    // Print details of all variations to find the issue
    console.log('\n--- ALL VARIATIONS AND ATTRIBUTES (DEBUG) ---');
    product.variations.forEach((variation, index) => {
      console.log(`\nVariation #${index + 1} (ID: ${variation.id}):`);
      console.log(`- Stock Quantity: ${variation.stock_quantity}`);
      console.log(`- Stock Status: ${variation.stock_status}`);
      
      if (variation.attributes && Array.isArray(variation.attributes)) {
        console.log('  Attributes:');
        variation.attributes.forEach(attr => {
          console.log(`  - ${attr.name} (${typeof attr.name}): ${attr.option} (${typeof attr.option})`);
        });
      } else {
        console.log('  No attributes found for this variation');
      }
    });
    
    // Find and list all color and size combinations
    const colorSizeCombinations = [];
    
    product.variations.forEach(variation => {
      if (!variation.attributes || !Array.isArray(variation.attributes)) return;
      
      let color = '';
      let size = '';
      
      variation.attributes.forEach(attr => {
        if (attr.name && typeof attr.name === 'string' && 
           (attr.name.toLowerCase() === 'color' || attr.name.toLowerCase() === 'colour')) {
          color = attr.option;
        } else if (attr.name && typeof attr.name === 'string' && attr.name.toLowerCase() === 'size') {
          size = attr.option;
        }
      });
      
      if (color && size) {
        colorSizeCombinations.push({
          color,
          size,
          stock_quantity: variation.stock_quantity,
          stock_status: variation.stock_status,
          variation_id: variation.id
        });
      }
    });
    
    console.log('\nAvailable color/size combinations:');
    colorSizeCombinations.forEach(combo => {
      console.log(`- Color: ${combo.color}, Size: ${combo.size}, Stock: ${combo.stock_quantity}, Status: ${combo.stock_status}`);
    });
    
    // Search more broadly for color "black" or anything similar
    console.log('\n--- SEARCHING FOR BLACK COLOR VARIATIONS ---');
    const blackColorVariations = product.variations.filter(variation => {
      if (!variation.attributes || !Array.isArray(variation.attributes)) return false;
      
      return variation.attributes.some(attr => {
        if (!attr.name || !attr.option) return false;
        const attrName = String(attr.name).toLowerCase();
        const attrValue = String(attr.option).toLowerCase();
        return (attrName === 'color' || attrName === 'colour') && 
               (attrValue === 'black' || attrValue.includes('black'));
      });
    });
    
    if (blackColorVariations.length > 0) {
      console.log(`Found ${blackColorVariations.length} variations with black color:`);
      blackColorVariations.forEach(variation => {
        console.log(`- ID: ${variation.id}, Stock: ${variation.stock_quantity}, Status: ${variation.stock_status}`);
        variation.attributes.forEach(attr => {
          console.log(`  - ${attr.name}: ${attr.option}`);
        });
      });
    } else {
      console.log('No black color variations found');
    }
    
    // Search for size "3" or similar
    console.log('\n--- SEARCHING FOR SIZE 3 VARIATIONS ---');
    const sizeThreeVariations = product.variations.filter(variation => {
      if (!variation.attributes || !Array.isArray(variation.attributes)) return false;
      
      return variation.attributes.some(attr => {
        if (!attr.name || !attr.option) return false;
        const attrName = String(attr.name).toLowerCase();
        const attrValue = String(attr.option);
        return attrName === 'size' && 
               (attrValue === '3' || attrValue === 3 || attrValue.includes('3'));
      });
    });
    
    if (sizeThreeVariations.length > 0) {
      console.log(`Found ${sizeThreeVariations.length} variations with size 3:`);
      sizeThreeVariations.forEach(variation => {
        console.log(`- ID: ${variation.id}, Stock: ${variation.stock_quantity}, Status: ${variation.stock_status}`);
        variation.attributes.forEach(attr => {
          console.log(`  - ${attr.name}: ${attr.option}`);
        });
      });
    } else {
      console.log('No size 3 variations found');
    }
    
    // Find the specific variation with color "black" and size "3" (exact case-sensitive match)
    const exactMatch = product.variations.find(variation => {
      if (!variation.attributes || !Array.isArray(variation.attributes)) return false;
      
      const hasExactBlackColor = variation.attributes.some(attr => 
        attr.name === 'color' && attr.option === 'Black'
      );
      
      const hasExactSize3 = variation.attributes.some(attr => 
        attr.name === 'size' && attr.option === '3'
      );
      
      return hasExactBlackColor && hasExactSize3;
    });
    
    console.log('\n--- EXACT MATCH CHECK ---');
    if (exactMatch) {
      console.log('Found exact match with color="Black" and size="3"');
      console.log(`Stock Quantity: ${exactMatch.stock_quantity}`);
      console.log(`Stock Status: ${exactMatch.stock_status}`);
    } else {
      console.log('No exact match found with color="Black" and size="3"');
    }
    
    // Try other possible variations of the attribute names and values
    console.log('\n--- TRYING DIFFERENT ATTRIBUTE FORMATS ---');
    const possibleMatches = [];
    
    // Check various formats
    const colorVariations = ['color', 'colour', 'Color', 'Colour'];
    const blackVariations = ['black', 'Black', 'BLACK'];
    const sizeVariations = ['size', 'Size', 'SIZE'];
    const sizeFmtVariations = ['3', 3, '03', 'UK3', 'EU3'];
    
    for (const colorName of colorVariations) {
      for (const blackValue of blackVariations) {
        for (const sizeName of sizeVariations) {
          for (const size3Value of sizeFmtVariations) {
            const match = product.variations.find(variation => {
              if (!variation.attributes || !Array.isArray(variation.attributes)) return false;
              
              const hasMatchingColor = variation.attributes.some(attr => 
                String(attr.name) === colorName && String(attr.option) === blackValue
              );
              
              const hasMatchingSize = variation.attributes.some(attr => 
                String(attr.name) === sizeName && String(attr.option) == size3Value
              );
              
              return hasMatchingColor && hasMatchingSize;
            });
            
            if (match) {
              possibleMatches.push({
                colorName,
                blackValue,
                sizeName,
                size3Value,
                variation: match
              });
            }
          }
        }
      }
    }
    
    if (possibleMatches.length > 0) {
      console.log(`Found ${possibleMatches.length} possible matches with various attribute formats:`);
      possibleMatches.forEach((match, index) => {
        console.log(`\nMatch #${index + 1}:`);
        console.log(`- Format: ${match.colorName}="${match.blackValue}" and ${match.sizeName}="${match.size3Value}"`);
        console.log(`- Stock Quantity: ${match.variation.stock_quantity}`);
        console.log(`- Stock Status: ${match.variation.stock_status}`);
      });
    } else {
      console.log('No matches found with any attribute format combination');
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
debugZigZagVariation();
