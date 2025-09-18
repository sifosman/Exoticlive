import Typesense from 'typesense';

/**
 * This service has been deprecated.
 * We now use a cron job to sync stock data from WooCommerce to Typesense.
 * See /api/cron/sync-stock for the new implementation.
 */

// Initialize Typesense client
const typesenseClient = new Typesense.Client({
  nodes: [{
    host: process.env.TYPESENSE_HOST || process.env.NEXT_PUBLIC_TYPESENSE_HOST || '',
    port: parseInt(process.env.TYPESENSE_PORT || process.env.NEXT_PUBLIC_TYPESENSE_PORT || '443'),
    protocol: process.env.TYPESENSE_PROTOCOL || process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL || 'https'
  }],
  apiKey: process.env.TYPESENSE_API_KEY || process.env.NEXT_PUBLIC_TYPESENSE_ADMIN_API_KEY || '',
  connectionTimeoutSeconds: 10
});

/**
 * Start listening for stock updates via GraphQL subscription (deprecated)
 */
export function startStockUpdateListener() {
  console.log('Stock update listener is deprecated. Using cron job instead.');
  return () => {}; // Return empty function as unsubscribe
}

/**
 * Start polling for stock updates at regular intervals (deprecated)
 */
export function startStockPolling(intervalMs = 60000) {
  console.log('Stock polling is deprecated. Using cron job instead.');
  return () => {}; // Return empty function as unsubscribe
}

/**
 * Update a simple product in Typesense (deprecated)
 */
export async function updateSimpleProduct(productId: number, stockQuantity: number, stockStatus: string) {
  console.log('updateSimpleProduct is deprecated. Using cron job instead.');
}

/**
 * Update a variable product with variations in Typesense (deprecated)
 */
export async function updateProductWithVariations(productId: number, variations: any[]) {
  console.log('updateProductWithVariations is deprecated. Using cron job instead.');
}
