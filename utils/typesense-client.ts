// utils/typesense-client.ts
import Typesense from 'typesense';

const host = process.env.NEXT_PUBLIC_TYPESENSE_HOST || 'localhost';
const port = process.env.NEXT_PUBLIC_TYPESENSE_PORT || '8108';
const protocol = process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL || 'http';
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