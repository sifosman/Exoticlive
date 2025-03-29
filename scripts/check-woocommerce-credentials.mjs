// scripts/check-woocommerce-credentials.mjs
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Check required variables
const requiredVariables = [
  'NEXT_PUBLIC_WORDPRESS_URL',
  'WC_CONSUMER_KEY',
  'WC_CONSUMER_SECRET',
  'NEXT_PUBLIC_TYPESENSE_HOST',
  'NEXT_PUBLIC_TYPESENSE_PORT',
  'NEXT_PUBLIC_TYPESENSE_PROTOCOL',
  'NEXT_PUBLIC_TYPESENSE_ADMIN_API_KEY'
];

console.log('Checking environment variables required for WooCommerce sync:');
console.log('=========================================================');

let allVariablesPresent = true;

for (const variable of requiredVariables) {
  if (process.env[variable]) {
    console.log(`✅ ${variable} is set`);
  } else {
    console.log(`❌ ${variable} is missing`);
    allVariablesPresent = false;
  }
}

console.log('=========================================================');

if (allVariablesPresent) {
  console.log('All required variables are set! You can run the sync script.');
} else {
  console.log('Please set the missing variables in your .env file before running the sync script.');
  console.log('See scripts/README-woocommerce-sync.md for instructions.');
}
