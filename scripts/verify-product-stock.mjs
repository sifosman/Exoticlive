// scripts/verify-product-stock.mjs
import Typesense from 'typesense';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Initialize Typesense client
const typesenseClient = new Typesense.Client({
  nodes: [
    {
      host: process.env.NEXT_PUBLIC_TYPESENSE_HOST || 'localhost',
      port: parseInt(process.env.NEXT_PUBLIC_TYPESENSE_PORT || '443'),
      protocol: process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL || 'https',
    },
  ],
  apiKey: process.env.NEXT_PUBLIC_TYPESENSE_ADMIN_API_KEY,
  connectionTimeoutSeconds: 5,
});

// Check if a specific product is properly configured in Typesense
async function verifyProductStock(slug) {
  console.log(`\n===== Verifying product "${slug}" =====\n`);
  
  try {
    // Search for the product by slug
    const searchResults = await typesenseClient
      .collections('products')
      .documents()
      .search({
        q: slug,
        query_by: 'slug',
        filter_by: `slug:=${slug}`,
        per_page: 1,
      });
    
    if (!searchResults.hits || searchResults.hits.length === 0) {
      console.log(`❌ Product with slug "${slug}" not found in Typesense`);
      return;
    }
    
    const product = searchResults.hits[0].document;
    console.log(`✅ Found product: ${product.name} (ID: ${product.id})`);
    
    // Check for attributes and variations
    console.log('\n----- Data Structure -----');
    console.log(`- Type: ${product.type || 'unknown'}`);
    console.log(`- Has attributes_json: ${typeof product.attributes_json === 'string'}`);
    console.log(`- Has variations_json: ${typeof product.variations_json === 'string'}`);
    console.log(`- Has attributes array: ${Array.isArray(product.attributes)}`);
    console.log(`- Has variations array: ${Array.isArray(product.variations)}`);
    
    // Get variations
    let variations = [];
    
    if (Array.isArray(product.variations)) {
      variations = product.variations;
      console.log(`✅ Using pre-parsed variations array with ${variations.length} items`);
    } else if (typeof product.variations_json === 'string') {
      try {
        variations = JSON.parse(product.variations_json);
        console.log(`✅ Parsed variations_json, found ${variations.length} variations`);
      } catch (error) {
        console.log(`❌ Error parsing variations_json: ${error.message}`);
      }
    } else {
      console.log('❌ No variations data found');
    }
    
    // Check attributes
    let attributes = [];
    
    if (Array.isArray(product.attributes)) {
      attributes = product.attributes;
      console.log(`✅ Using pre-parsed attributes array with ${attributes.length} items`);
    } else if (typeof product.attributes_json === 'string') {
      try {
        attributes = JSON.parse(product.attributes_json);
        console.log(`✅ Parsed attributes_json, found ${attributes.length} attributes`);
      } catch (error) {
        console.log(`❌ Error parsing attributes_json: ${error.message}`);
      }
    } else {
      console.log('❌ No attributes data found');
    }
    
    // Print attribute details
    if (attributes.length > 0) {
      console.log('\n----- Attributes -----');
      attributes.forEach((attr, index) => {
        console.log(`${index + 1}. Name: ${attr.name}, Options: ${attr.options.join(', ')}`);
      });
    }
    
    // Analyze variations stock status
    if (variations.length > 0) {
      let inStockCount = 0;
      let outOfStockCount = 0;
      
      // Check if the black/size 3 variation is in stock
      const blackSize3 = variations.find(v => {
        if (!Array.isArray(v.attributes)) return false;
        
        const hasBlack = v.attributes.some(attr => 
          attr.name?.toLowerCase() === 'color' && 
          attr.option?.toLowerCase() === 'black'
        );
        
        const hasSize3 = v.attributes.some(attr => 
          attr.name?.toLowerCase() === 'size' && 
          attr.option === '3'
        );
        
        return hasBlack && hasSize3;
      });
      
      // Count stock statuses
      variations.forEach(v => {
        if (v.stock_status === 'instock') {
          inStockCount++;
        } else {
          outOfStockCount++;
        }
      });
      
      // Display stock summary
      console.log('\n----- Stock Status -----');
      console.log(`Total variations: ${variations.length}`);
      console.log(`In stock: ${inStockCount}`);
      console.log(`Out of stock: ${outOfStockCount}`);
      
      // Display Black/Size 3 status
      if (blackSize3) {
        console.log('\n----- Black/Size 3 Variation -----');
        console.log(`ID: ${blackSize3.id}`);
        console.log(`Stock status: ${blackSize3.stock_status}`);
        console.log(`Stock quantity: ${blackSize3.stock_quantity}`);
      } else {
        console.log('\n❌ Black/Size 3 variation not found');
      }
      
      // Show a sample variation structure
      if (variations.length > 0) {
        console.log('\n----- Sample Variation Structure -----');
        const sample = variations[0];
        console.log(JSON.stringify(sample, null, 2));
      }
    } else {
      console.log('\n❌ No variations data available to analyze');
    }
    
  } catch (error) {
    console.error(`❌ Error verifying product: ${error.message}`);
  }
}

// Let's update the Black/Size 3 variation directly to ensure it's in stock
async function forceUpdateVariationStock(slug, size, color, stockStatus, stockQuantity) {
  console.log(`\n===== Forcing update for ${color}/${size} on "${slug}" =====\n`);
  
  try {
    // First get the product
    const searchResults = await typesenseClient
      .collections('products')
      .documents()
      .search({
        q: slug,
        query_by: 'slug',
        filter_by: `slug:=${slug}`,
        per_page: 1,
      });
    
    if (!searchResults.hits || searchResults.hits.length === 0) {
      console.log(`❌ Product with slug "${slug}" not found in Typesense`);
      return;
    }
    
    const product = searchResults.hits[0].document;
    console.log(`✅ Found product: ${product.name} (ID: ${product.id})`);
    
    // Get variations
    let variations = [];
    
    if (Array.isArray(product.variations)) {
      variations = product.variations;
    } else if (typeof product.variations_json === 'string') {
      try {
        variations = JSON.parse(product.variations_json);
      } catch (error) {
        console.log(`❌ Error parsing variations_json: ${error.message}`);
        return;
      }
    } else {
      console.log('❌ No variations data found');
      return;
    }
    
    // Find the specific variation to update
    const variationIndex = variations.findIndex(v => {
      if (!Array.isArray(v.attributes)) return false;
      
      const hasColor = v.attributes.some(attr => 
        attr.name?.toLowerCase() === 'color' && 
        attr.option?.toLowerCase() === color.toLowerCase()
      );
      
      const hasSize = v.attributes.some(attr => 
        attr.name?.toLowerCase() === 'size' && 
        attr.option === size
      );
      
      return hasColor && hasSize;
    });
    
    if (variationIndex === -1) {
      console.log(`❌ ${color}/${size} variation not found`);
      return;
    }
    
    // Update the variation
    console.log(`✅ Found ${color}/${size} variation at index ${variationIndex}`);
    console.log(`Updating from ${variations[variationIndex].stock_status}/${variations[variationIndex].stock_quantity} to ${stockStatus}/${stockQuantity}`);
    
    variations[variationIndex].stock_status = stockStatus;
    variations[variationIndex].stock_quantity = stockQuantity;
    
    // Update the product with the modified variations
    const updateData = {
      variations,
      variations_json: JSON.stringify(variations)
    };
    
    await typesenseClient
      .collections('products')
      .documents(product.id)
      .update(updateData);
    
    console.log(`✅ Successfully updated ${color}/${size} variation to ${stockStatus} (${stockQuantity})`);
    
  } catch (error) {
    console.error(`❌ Error updating variation: ${error.message}`);
  }
}

// Main execution function
async function main() {
  const productSlug = process.argv[2] || 'zig-zag';
  const action = process.argv[3];
  
  // Check what action to perform
  if (action === 'update') {
    const size = process.argv[4] || '3';
    const color = process.argv[5] || 'Black';
    const stockStatus = process.argv[6] || 'instock';
    const stockQuantity = parseInt(process.argv[7] || '1', 10);
    
    await forceUpdateVariationStock(productSlug, size, color, stockStatus, stockQuantity);
  }
  
  // Always verify the product after any updates
  await verifyProductStock(productSlug);
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
}).finally(() => {
  console.log('\nVerification complete');
});
