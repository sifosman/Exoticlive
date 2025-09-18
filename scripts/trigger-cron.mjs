#!/usr/bin/env node

/**
 * This script triggers the cron job API.
 * 
 * Usage: node scripts/trigger-cron.mjs
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get the API key from environment variables
const apiKey = process.env.CRON_API_KEY || '';

// Get the site URL from environment variables
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://exoticshoes.co.za';

// Trigger the cron job
async function triggerCron() {
  try {
    console.log('Triggering cron job...');
    
    // Call the cron API
    const cronUrl = `${siteUrl}/api/cron/sync-stock?key=${apiKey}`;
    console.log(`Calling cron API: ${cronUrl}`);
    
    const response = await fetch(cronUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to trigger cron job: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const result = await response.json();
    
    console.log('Cron job triggered successfully:', result.message);
    console.log('Last sync time:', result.lastSyncTime);
    
    if (result.result && result.result.results) {
      console.log('Synced products:', result.result.results.length);
      result.result.results.forEach(product => {
        console.log(`- ${product.name} (ID: ${product.id}): ${product.success ? 'Success' : 'Failed'}`);
      });
    }
    
    return result;
  } catch (error) {
    console.error('Error triggering cron job:', error);
  }
}

// Run the cron job
triggerCron();
