// Script to verify Typesense schema has all required fields
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

async function verifySchema() {
  try {
    console.log('Verifying Typesense schema...');
    
    // Get collection schema
    const schema = await typesenseClient.collections('products').retrieve();
    console.log('\nCurrent Schema Fields:');
    
    // Extract and display field names
    const fields = schema.fields;
    fields.forEach(field => {
      const facetStr = field.facet ? ' (facetable)' : '';
      const optionalStr = field.optional ? ' (optional)' : '';
      console.log(`- ${field.name}: ${field.type}${facetStr}${optionalStr}`);
    });
    
    // Check for required fields
    const requiredFields = ['colors', 'sizes', 'brand', 'is_on_sale'];
    const missingFields = [];
    
    requiredFields.forEach(fieldName => {
      if (!fields.some(f => f.name === fieldName)) {
        missingFields.push(fieldName);
      }
    });
    
    if (missingFields.length === 0) {
      console.log('\n✅ All required fields are present in the schema.');
    } else {
      console.log(`\n❌ Missing fields: ${missingFields.join(', ')}`);
    }
    
    // Try to fetch a sample product to verify data
    console.log('\nFetching a sample product...');
    const searchResults = await typesenseClient
      .collections('products')
      .documents()
      .search({
        q: '*',
        per_page: 1,
      });
    
    if (searchResults.hits && searchResults.hits.length > 0) {
      const sampleProduct = searchResults.hits[0].document;
      console.log(`\nSample Product: ${sampleProduct.name}`);
      console.log(`- ID: ${sampleProduct.id}`);
      console.log(`- Colors: ${JSON.stringify(sampleProduct.colors || [])}`);
      console.log(`- Sizes: ${JSON.stringify(sampleProduct.sizes || [])}`);
      console.log(`- Brand: ${sampleProduct.brand || 'N/A'}`);
      console.log(`- Is on sale: ${sampleProduct.is_on_sale}`);
    } else {
      console.log('No products found in Typesense.');
    }
    
    // Try a facet search to verify facets work
    console.log('\nTesting facet search...');
    const facetResults = await typesenseClient
      .collections('products')
      .documents()
      .search({
        q: '*',
        facet_by: 'colors,sizes,brand',
        per_page: 0,
      });
    
    if (facetResults.facet_counts) {
      console.log('\nFacet counts:');
      facetResults.facet_counts.forEach(facet => {
        console.log(`\n${facet.field_name}:`);
        facet.counts.slice(0, 5).forEach(count => {
          console.log(`- ${count.value} (${count.count})`);
        });
      });
      console.log('\n✅ Facet search is working correctly.');
    } else {
      console.log('❌ Facet search failed or returned no results.');
    }
    
  } catch (error) {
    console.error('Error verifying schema:', error.message);
  }
}

verifySchema();
