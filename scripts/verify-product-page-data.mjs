import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Typesense from 'typesense';
import fetch from 'node-fetch';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env') });

// Create Typesense client using search API key (what product page uses)
const typesenseClient = new Typesense.Client({
  nodes: [{
    host: process.env.NEXT_PUBLIC_TYPESENSE_HOST || 'localhost',
    port: Number(process.env.NEXT_PUBLIC_TYPESENSE_PORT) || 443,
    protocol: process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL || 'https'
  }],
  apiKey: process.env.NEXT_PUBLIC_TYPESENSE_SEARCH_API_KEY || '',
  connectionTimeoutSeconds: 5
});

// Create admin client (for verification and updates)
const adminClient = new Typesense.Client({
  nodes: [{
    host: process.env.NEXT_PUBLIC_TYPESENSE_HOST || 'localhost',
    port: Number(process.env.NEXT_PUBLIC_TYPESENSE_PORT) || 443,
    protocol: process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL || 'https'
  }],
  apiKey: process.env.NEXT_PUBLIC_TYPESENSE_ADMIN_API_KEY || '',
  connectionTimeoutSeconds: 5
});

console.log('Starting verification of Zig Zag product data...');
console.log('API Keys:');
console.log('- Search API key set:', !!process.env.NEXT_PUBLIC_TYPESENSE_SEARCH_API_KEY);
console.log('- Admin API key set:', !!process.env.NEXT_PUBLIC_TYPESENSE_ADMIN_API_KEY);

// Simulate how product page retrieves data
async function simulateProductPageDataRetrieval() {
  try {
    console.log('Simulating how product page retrieves data...');
    
    // Search for product by slug (like product page does)
    const searchResults = await typesenseClient
      .collections('products')
      .documents()
      .search({
        q: 'zig-zag',
        query_by: 'slug',
        per_page: 1
      });
    
    if (!searchResults.hits || searchResults.hits.length === 0) {
      console.log('Product not found when searching by slug');
      return null;
    }
    
    const product = searchResults.hits[0].document;
    console.log('Product found in search results:');
    console.log(`- ID: ${product.id}`);
    console.log(`- Name: ${product.name}`);
    console.log(`- Slug: ${product.slug}`);
    
    // Check if variations are available
    let variations = [];
    
    if (product.variations && Array.isArray(product.variations)) {
      console.log('Product has variations array directly available');
      variations = product.variations;
    } else if (product.variations_json) {
      console.log('Product has variations_json string (new format)');
      try {
        variations = JSON.parse(product.variations_json);
        console.log('Successfully parsed variations_json');
      } catch (error) {
        console.error('Error parsing variations_json:', error.message);
      }
    } else {
      console.log('No variations data found in product');
    }
    
    console.log(`Found ${variations.length} variations`);
    
    // Check for the specific Black/Size 3 variation
    const blackSize3 = variations.find(v => {
      if (!v.attributes || !Array.isArray(v.attributes)) return false;
      
      const hasBlackColor = v.attributes.some(attr => 
        attr.name === 'color' && attr.option === 'Black'
      );
      
      const hasSize3 = v.attributes.some(attr => 
        attr.name === 'size' && attr.option === '3'
      );
      
      return hasBlackColor && hasSize3;
    });
    
    if (blackSize3) {
      console.log('\nBlack/Size 3 variation found:');
      console.log(`- ID: ${blackSize3.id}`);
      console.log(`- Stock Quantity: ${blackSize3.stock_quantity}`);
      console.log(`- Stock Status: ${blackSize3.stock_status}`);
      console.log('- Attributes:');
      blackSize3.attributes.forEach(attr => {
        console.log(`  - ${attr.name}: ${attr.option}`);
      });
    } else {
      console.log('\nBlack/Size 3 variation NOT found in the data');
    }
    
    // Check attributes structure too
    let attributes = [];
    
    if (product.attributes && Array.isArray(product.attributes)) {
      console.log('Product has attributes array directly available');
      attributes = product.attributes;
    } else if (product.attributes_json) {
      console.log('Product has attributes_json string (new format)');
      try {
        attributes = JSON.parse(product.attributes_json);
        console.log('Successfully parsed attributes_json');
      } catch (error) {
        console.error('Error parsing attributes_json:', error.message);
      }
    } else {
      console.log('No attributes data found in product');
    }
    
    console.log(`\nProduct has ${attributes.length} attribute types:`);
    attributes.forEach(attr => {
      console.log(`- ${attr.name}: ${attr.options ? attr.options.join(', ') : 'No options'}`);
    });
    
    return {
      product,
      variations,
      attributes
    };
  } catch (error) {
    console.error('Error simulating product page data retrieval:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return null;
  }
}

// Check how the product page would interpret the variations data
async function checkProductPageInterpretation() {
  try {
    console.log('\nChecking how product page would handle the data...');
    
    const data = await simulateProductPageDataRetrieval();
    if (!data) return;
    
    const { product, variations, attributes } = data;
    
    console.log('\nEvaluating how ProductContentTypesense.tsx would handle this data:');
    
    // Check if the object structures match what the code expects
    const hasCorrectVariationFormat = variations.length > 0 && 
      variations[0].attributes && 
      Array.isArray(variations[0].attributes) &&
      variations[0].stock_status;
    
    console.log(`- Variations have correct format for code: ${hasCorrectVariationFormat}`);
    
    if (!hasCorrectVariationFormat) {
      console.log('\nWARNING: The variation format does not match what the code expects.');
      console.log('This will cause problems with attribute matching and stock status display.');
      
      if (variations.length > 0) {
        console.log('\nSample variation structure:');
        console.log(JSON.stringify(variations[0], null, 2));
      }
    }
    
    // Check if variations data is correctly formatted in the database
    console.log('\nVerifying database record directly...');
    
    try {
      const dbRecord = await adminClient
        .collections('products')
        .documents(product.id)
        .retrieve();
      
      console.log('Retrieved direct database record:');
      console.log(`- ID: ${dbRecord.id}`);
      console.log(`- Has variations_json: ${!!dbRecord.variations_json}`);
      console.log(`- Has attributes_json: ${!!dbRecord.attributes_json}`);
      
      // Let's verify the structure of the stored JSON
      if (dbRecord.variations_json) {
        const storedVariations = JSON.parse(dbRecord.variations_json);
        console.log(`\n- Stored variations count: ${storedVariations.length}`);
        
        // Check Black/Size 3 again directly from DB
        const blackSize3 = storedVariations.find(v => {
          if (!v.attributes || !Array.isArray(v.attributes)) return false;
          
          const hasBlackColor = v.attributes.some(attr => 
            attr.name === 'color' && attr.option === 'Black'
          );
          
          const hasSize3 = v.attributes.some(attr => 
            attr.name === 'size' && attr.option === '3'
          );
          
          return hasBlackColor && hasSize3;
        });
        
        if (blackSize3) {
          console.log('\nDB: Black/Size 3 variation found:');
          console.log(`- ID: ${blackSize3.id}`);
          console.log(`- Stock Quantity: ${blackSize3.stock_quantity}`);
          console.log(`- Stock Status: ${blackSize3.stock_status}`);
        } else {
          console.log('\nDB: Black/Size 3 variation NOT found in stored data');
        }
        
        // More details about the structure
        if (storedVariations.length > 0) {
          console.log('\nDB: Sample stored variation structure:');
          console.log(JSON.stringify(storedVariations[0], null, 2));
        }
      }
    } catch (error) {
      console.error('Error retrieving direct database record:', error.message);
    }
  } catch (error) {
    console.error('Error in checkProductPageInterpretation:', error.message);
  }
}

// Run the verification
checkProductPageInterpretation()
  .then(() => console.log('\nVerification complete'))
  .catch(err => console.error('Fatal error:', err));
