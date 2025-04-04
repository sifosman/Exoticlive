#!/usr/bin/env node

/**
 * This script triggers the stock sync API.
 * 
 * Usage: node scripts/trigger-stock-sync.mjs
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get the API key from environment variables
const apiKey = process.env.SYNC_API_KEY || '';

// Get the site URL from environment variables
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://exoticshoes.co.za';

// Trigger the sync
async function triggerSync() {
  try {
    console.log('Triggering stock sync...');
    
    // Call the sync API
    const syncUrl = `${siteUrl}/api/sync/stock?key=${apiKey}`;
    console.log(`Calling sync API: ${syncUrl}`);
    
    const response = await fetch(syncUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to sync stock: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const result = await response.json();
    
    console.log('Stock sync completed:', result.message);
    console.log('Results:', JSON.stringify(result.results, null, 2));
    
    return result;
  } catch (error) {
    console.error('Error triggering stock sync:', error);
  }
}

// Run the sync
triggerSync();
