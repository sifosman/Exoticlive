// utils/typesense-client.ts
import Typesense from 'typesense';

// Log the environment variables for debugging (useful for troubleshooting)
console.log('Typesense config:', {
  host: process.env.NEXT_PUBLIC_TYPESENSE_HOST || 'localhost',
  protocol: 'https',
  port: Number(process.env.NEXT_PUBLIC_TYPESENSE_PORT) || 443,
  apiKey: process.env.NEXT_PUBLIC_TYPESENSE_SEARCH_API_KEY ? 'DEFINED' : 'UNDEFINED',
});

export const client = new Typesense.Client({
  nodes: [{
    host: process.env.NEXT_PUBLIC_TYPESENSE_HOST || 'localhost',
    port: Number(process.env.NEXT_PUBLIC_TYPESENSE_PORT) || 443,
    protocol: 'https'
  }],
  apiKey: process.env.NEXT_PUBLIC_TYPESENSE_SEARCH_API_KEY || '',
  connectionTimeoutSeconds: 5
});