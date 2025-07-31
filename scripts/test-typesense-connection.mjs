import Typesense from 'typesense';

const typesenseClient = new Typesense.Client({
  nodes: [{
    host: 'localhost',
    port: 8108,
    protocol: 'http'
  }],
  apiKey: 'xyz123',
  connectionTimeoutSeconds: 2
});

async function testConnection() {
  try {
    console.log('Checking Typesense health...');
    
    // Try to get health status
    const health = await typesenseClient.health.retrieve();
    console.log('Health status:', health);
    
    // List collections
    console.log('\nChecking collections...');
    const collections = await typesenseClient.collections().retrieve();
    console.log('Collections:', collections);
    
    // Try to search products
    console.log('\nChecking products collection...');
    const searchResults = await typesenseClient
      .collections('products')
      .documents()
      .search({
        q: '*',
        per_page: 1
      });
    
    console.log('Sample product search result:', searchResults);
    
  } catch (error) {
    console.error('Error connecting to Typesense:', error);
  }
}

testConnection();
