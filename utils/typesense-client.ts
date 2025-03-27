// utils/typesense-client.ts
import Typesense from 'typesense';

const host = process.env.NEXT_PUBLIC_TYPESENSE_HOST || 'localhost';
const port = process.env.NEXT_PUBLIC_TYPESENSE_PORT || '443';
const protocol = 'https';  // Always use HTTPS to avoid mixed content errors
const apiKey = process.env.NEXT_PUBLIC_TYPESENSE_SEARCH_API_KEY || 'xyz';

export const client = new Typesense.Client({
  nodes: [{
    host,
    port: Number(port),
    protocol
  }],
  apiKey,
  connectionTimeoutSeconds: 5
});