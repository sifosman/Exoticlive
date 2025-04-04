'use client';

/**
 * This component has been deprecated.
 * We now use a cron job to sync stock data from WooCommerce to Typesense.
 * See /api/cron/sync-stock for the new implementation.
 */

export default function StockListenerWrapper() {
  // Return null (component is not used anymore)
  return null;
}
