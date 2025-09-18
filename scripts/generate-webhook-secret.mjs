#!/usr/bin/env node

// scripts/generate-webhook-secret.mjs
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Generate a random webhook secret
const generateSecret = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Path to the .env file
const envPath = path.join(__dirname, '..', '.env');

// Check if .env file exists
if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found. Creating a new one...');
  fs.writeFileSync(envPath, '');
}

// Read the current .env file
let envContent = fs.readFileSync(envPath, 'utf8');

// Generate a new webhook secret
const newSecret = generateSecret();

// Check if WEBHOOK_SECRET already exists in the .env file
if (envContent.includes('WEBHOOK_SECRET=')) {
  // Replace the existing WEBHOOK_SECRET
  envContent = envContent.replace(/WEBHOOK_SECRET=.*/g, `WEBHOOK_SECRET=${newSecret}`);
  console.log('✅ Replaced existing WEBHOOK_SECRET in .env file');
} else {
  // Add the WEBHOOK_SECRET to the .env file
  envContent += `\nWEBHOOK_SECRET=${newSecret}`;
  console.log('✅ Added WEBHOOK_SECRET to .env file');
}

// Write the updated content back to the .env file
fs.writeFileSync(envPath, envContent);

console.log('\n🔑 New webhook secret generated:');
console.log(newSecret);
console.log('\n📋 Instructions:');
console.log('1. Make sure this secret is also set in your deployment environment');
console.log('2. Run the webhook registration script to update webhooks in WooCommerce:');
console.log('   node scripts/register-woocommerce-webhooks.mjs');
