import Typesense from 'typesense';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Constants
const PRODUCT_SLUG = 'zig-zag';

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

async function main() {
  try {
    console.log('Verifying Zig Zag product variations...');

    // Search for product in Typesense by slug
    const searchParameters = {
      q: PRODUCT_SLUG,
      query_by: 'slug',
      filter_by: `slug:=${PRODUCT_SLUG}`,
      per_page: 1,
    };
    
    const searchResults = await typesenseClient
      .collections('products')
      .documents()
      .search(searchParameters);
    
    if (!searchResults.hits || searchResults.hits.length === 0) {
      console.error('Product not found in Typesense');
      return;
    }
    
    // Get the product document
    const product = searchResults.hits[0].document;
    console.log('Product found:', product.name);
    console.log('Product ID:', product.id);
    
    // Check for variations data
    console.log('\nVerifying variations data:');
    
    // Check if variations_json exists
    if (product.variations_json) {
      try {
        const variations = JSON.parse(product.variations_json);
        console.log(`✅ variations_json exists and contains ${variations.length} variations`);
        
        // Check for Black/Size 3 variation
        const blackSize3 = variations.find(v => {
          if (!v.attributes || !Array.isArray(v.attributes)) return false;
          
          const hasBlackColor = v.attributes.some(attr => 
            attr.name === 'Color' && 
            attr.option === 'Black'
          );
          
          const hasSize3 = v.attributes.some(attr => 
            attr.name === 'Size' && 
            attr.option === '3'
          );
          
          return hasBlackColor && hasSize3;
        });
        
        if (blackSize3) {
          console.log('\n✅ Found Black/Size 3 variation:');
          console.log(`ID: ${blackSize3.id}`);
          console.log(`Stock status: ${blackSize3.stock_status}`);
          console.log(`Stock quantity: ${blackSize3.stock_quantity}`);
        } else {
          console.log('❌ Black/Size 3 variation NOT found in the variations_json data');
        }
      } catch (error) {
        console.error('❌ Error parsing variations_json:', error.message);
      }
    } else {
      console.log('❌ variations_json field does not exist on the product');
    }
    
    // Check if direct variations array exists
    if (Array.isArray(product.variations)) {
      console.log(`\n✅ Direct variations array exists and contains ${product.variations.length} variations`);
      
      // Check for Black/Size 3 variation in direct array
      const directBlackSize3 = product.variations.find(v => {
        if (!v || !v.attributes || !Array.isArray(v.attributes)) return false;
        
        const hasBlackColor = v.attributes.some(attr => 
          attr.name === 'Color' && 
          attr.option === 'Black'
        );
        
        const hasSize3 = v.attributes.some(attr => 
          attr.name === 'Size' && 
          attr.option === '3'
        );
        
        return hasBlackColor && hasSize3;
      });
      
      if (directBlackSize3) {
        console.log('\n✅ Found Black/Size 3 variation in direct array:');
        console.log(`ID: ${directBlackSize3.id}`);
        console.log(`Stock status: ${directBlackSize3.stock_status}`);
        console.log(`Stock quantity: ${directBlackSize3.stock_quantity}`);
      } else {
        console.log('❌ Black/Size 3 variation NOT found in direct variations array');
      }
    } else {
      console.log('❌ Direct variations array does not exist on the product');
    }
    
    // Conclusion
    console.log('\nVerification complete!');
    console.log('Please check the product page to confirm that the variations display correctly.');
    console.log('Black/Size 3 should now show as in stock with 1 item available.');
    
  } catch (error) {
    console.error('Error during verification:', error);
  }
}

// Run the main function
main().catch(error => {
  console.error('Fatal error:', error);
});
