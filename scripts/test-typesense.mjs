import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Typesense from 'typesense';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env') });

console.log('Environment variables loaded');
console.log('Host:', process.env.NEXT_PUBLIC_TYPESENSE_HOST);
console.log('Port:', process.env.NEXT_PUBLIC_TYPESENSE_PORT);
console.log('Protocol:', process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL);

// Create Typesense client
const client = new Typesense.Client({
  nodes: [{
    host: process.env.NEXT_PUBLIC_TYPESENSE_HOST || 'localhost',
    port: Number(process.env.NEXT_PUBLIC_TYPESENSE_PORT) || 8108,
    protocol: process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL || 'http'
  }],
  apiKey: process.env.NEXT_PUBLIC_TYPESENSE_ADMIN_API_KEY || 'xyz123',
  connectionTimeoutSeconds: 5
});

console.log('Typesense client created');

async function testConnection() {
  try {
    console.log('Testing Typesense connection...');
    const health = await client.health.retrieve();
    console.log('Typesense health check:', health);
    
    console.log('Listing collections...');
    const collections = await client.collections().retrieve();
    console.log('Collections:', collections);
  } catch (error) {
    console.error('Error:', error);
    if (error.response) {
      console.error('Response:', await error.response.text());
    }
  }
}

testConnection().catch(console.error);
