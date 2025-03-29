// scripts/check-typesense-status.mjs
import dotenv from 'dotenv';
import Typesense from 'typesense';

// Load environment variables
dotenv.config();

console.log('Checking Typesense collection status...');

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

// Check collections
async function checkCollections() {
  try {
    console.log('Retrieving collections list...');
    const collections = await typesenseClient.collections().retrieve();
    console.log(`Found ${collections.length} collections:`);
    
    for (const collection of collections) {
      console.log(`- ${collection.name}: ${collection.num_documents} documents`);
    }
    
    // Check if products collection exists
    let productsCollection = collections.find(c => c.name === 'products');
    
    if (productsCollection) {
      console.log('\nProducts collection exists. Checking document count...');
      try {
        // Search for products to verify
        const searchResults = await typesenseClient.collections('products').documents().search({
          q: '*',
          per_page: 3
        });
        
        console.log(`Found ${searchResults.found} total products`);
        if (searchResults.hits.length > 0) {
          console.log('\nSample products:');
          searchResults.hits.forEach((hit, index) => {
            console.log(`${index + 1}. ${hit.document.name} (ID: ${hit.document.id})`);
          });
        }
      } catch (error) {
        console.error('Error searching products:', error.message);
      }
    } else {
      console.log('\nProducts collection does not exist!');
      console.log('Need to recreate the collection and reindex products');
    }
    
  } catch (error) {
    console.error('Error retrieving collections:', error.message);
    
    if (error.httpStatus === 401) {
      console.error('Authentication error: Invalid API key');
    } else if (error.httpStatus === 404) {
      console.error('No collections found');
    }
  }
}

checkCollections();
