#!/usr/bin/env node

/**
 * This script checks the connection to Typesense and lists all collections.
 * It's useful for debugging connection issues.
 */

import dotenv from 'dotenv';
import { Client as TypesenseClient } from 'typesense';

// Load environment variables
dotenv.config();

// Get Typesense connection parameters from environment variables
const typesenseHost = process.env.TYPESENSE_HOST || process.env.NEXT_PUBLIC_TYPESENSE_HOST;
const typesensePort = process.env.TYPESENSE_PORT || process.env.NEXT_PUBLIC_TYPESENSE_PORT;
const typesenseProtocol = process.env.TYPESENSE_PROTOCOL || process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL;
const typesenseApiKey = process.env.TYPESENSE_API_KEY || process.env.NEXT_PUBLIC_TYPESENSE_ADMIN_API_KEY;

console.log('Typesense connection parameters:');
console.log(`Host: ${typesenseHost || '(not set)'}`);
console.log(`Port: ${typesensePort || '(not set)'}`);
console.log(`Protocol: ${typesenseProtocol || '(not set)'}`);
console.log(`API Key: ${typesenseApiKey ? '(set)' : '(not set)'}`);

// Initialize Typesense client
const typesenseClient = new TypesenseClient({
  nodes: [
    {
      host: typesenseHost || 'localhost',
      port: parseInt(typesensePort || '8108'),
      protocol: typesenseProtocol || 'http'
    }
  ],
  apiKey: typesenseApiKey || '',
  connectionTimeoutSeconds: 10
});

// Check Typesense connection
async function checkTypesenseConnection() {
  try {
    console.log('\nChecking Typesense connection...');
    
    // Check health
    const health = await typesenseClient.health.retrieve();
    console.log(`Health check: ${JSON.stringify(health)}`);
    
    // List collections
    const collections = await typesenseClient.collections().retrieve();
    console.log(`\nFound ${collections.length} collections:`);
    
    collections.forEach(collection => {
      console.log(`- ${collection.name} (${collection.num_documents} documents)`);
    });
    
    // Check if products collection exists
    const productsCollection = collections.find(collection => collection.name === 'products');
    
    if (productsCollection) {
      console.log(`\nProducts collection exists with ${productsCollection.num_documents} documents`);
      
      // Get a sample product
      const searchResults = await typesenseClient
        .collections('products')
        .documents()
        .search({
          q: '*',
          query_by: 'name',
          per_page: 1
        });
      
      console.log(`\nSample product: ${JSON.stringify(searchResults.hits[0]?.document?.name || 'No products found')}`);
    } else {
      console.log('\nProducts collection does not exist');
    }
    
    console.log('\nTypesense connection successful!');
  } catch (error) {
    console.error('\nError connecting to Typesense:', error.message);
    console.error('Stack trace:', error.stack);
    
    // Provide troubleshooting tips
    console.log('\nTroubleshooting tips:');
    console.log('1. Check if your Typesense server is running');
    console.log('2. Verify that the host, port, and protocol are correct');
    console.log('3. Make sure your API key has the necessary permissions');
    console.log('4. Check if there are any network issues or firewalls blocking the connection');
  }
}

// Run the check
checkTypesenseConnection();
