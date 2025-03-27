const dotenv = require('dotenv');
const Typesense = require('typesense');

// Load environment variables
dotenv.config();

// Create Typesense client
const client = new Typesense.Client({
  nodes: [{
    host: process.env.NEXT_PUBLIC_TYPESENSE_HOST,
    port: Number(process.env.NEXT_PUBLIC_TYPESENSE_PORT),
    protocol: process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL || 'http'
  }],
  apiKey: process.env.NEXT_PUBLIC_TYPESENSE_ADMIN_API_KEY,
  connectionTimeoutSeconds: 5
});

async function checkProducts() {
  try {
    console.log('🔍 Searching for all products...');
    const searchResults = await client
      .collections('products')
      .documents()
      .search({
        q: '*',
        per_page: 10,
        include_fields: 'id,name,categories,price,stock_status'
      });

    console.log('\n📊 Search Stats:');
    console.log('Total found:', searchResults.found);
    console.log('Search time:', searchResults.search_time_ms, 'ms');

    if (searchResults.hits && searchResults.hits.length > 0) {
      console.log('\n📦 First 10 products:');
      searchResults.hits.forEach(hit => {
        console.log('\nProduct:', {
          id: hit.document.id,
          name: hit.document.name,
          categories: hit.document.categories,
          price: hit.document.price,
          stock_status: hit.document.stock_status
        });
      });
    } else {
      console.log('\n❌ No products found in the collection');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response);
    }
  }
}

// Run check
checkProducts().catch(console.error);
