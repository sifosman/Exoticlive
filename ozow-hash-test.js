// Ozow Hash Test Script
// This script demonstrates the hash calculation process for Ozow payments
// Run with: node ozow-hash-test.js

const crypto = require('crypto');

// Replace these with your actual values
const SITE_CODE = 'YOUR_SITE_CODE';
const PRIVATE_KEY = 'YOUR_PRIVATE_KEY';
const AMOUNT = '1500.00';
const REFERENCE = 'ozow-1234567890';
const BASE_URL = 'https://exoticshoes.co.za';

// URLs
const cancelUrl = `${BASE_URL}/checkout?status=cancelled&ref=${REFERENCE}`;
const errorUrl = `${BASE_URL}/checkout?status=error&ref=${REFERENCE}`;
const successUrl = `${BASE_URL}/order-success?ref=${REFERENCE}&method=ozow`;
const notifyUrl = `${BASE_URL}/api/ozow-notification?ref=${REFERENCE}`;
const isTest = 'false';

// Step 1: Concatenate all parameters in the exact order
const hashInput =
  SITE_CODE +             // SiteCode
  'ZA' +                  // CountryCode
  'ZAR' +                 // CurrencyCode
  AMOUNT +                // Amount
  REFERENCE +             // TransactionReference
  REFERENCE +             // BankReference (using same as TransactionReference)
  cancelUrl +             // CancelUrl
  errorUrl +              // ErrorUrl
  successUrl +            // SuccessUrl
  notifyUrl +             // NotifyUrl
  isTest +                // IsTest
  PRIVATE_KEY;            // PrivateKey

console.log('=== HASH CALCULATION ===');
console.log('Raw hash input (with redacted private key):',
  hashInput.replace(PRIVATE_KEY, '[REDACTED]'));

// Step 2: Convert to lowercase
const lowercaseHashInput = hashInput.toLowerCase();
console.log('Lowercase hash input (with redacted private key):',
  lowercaseHashInput.replace(PRIVATE_KEY.toLowerCase(), '[REDACTED]'));

// Step 3: Generate SHA512 hash
const hash = crypto
  .createHash('sha512')
  .update(lowercaseHashInput, 'utf8')
  .digest('hex').toLowerCase();

console.log('Calculated hash (lowercase):', hash);
console.log('Hash length:', hash.length);

// Step 4: Construct the URL
const params = new URLSearchParams();
params.append('SiteCode', SITE_CODE);
params.append('CountryCode', 'ZA');
params.append('CurrencyCode', 'ZAR');
params.append('Amount', AMOUNT);
params.append('TransactionReference', REFERENCE);
params.append('BankReference', REFERENCE);
params.append('CancelUrl', cancelUrl);
params.append('ErrorUrl', errorUrl);
params.append('SuccessUrl', successUrl);
params.append('NotifyUrl', notifyUrl);
params.append('IsTest', isTest);
params.append('HashCheck', hash);
params.append('optional1', 'John Doe');
params.append('optional2', 'john.doe@example.com');

// Build URL with parameters in the correct order
let paymentUrlParams = '';
const orderedKeys = [
  'SiteCode', 'CountryCode', 'CurrencyCode', 'Amount', 'TransactionReference', 'BankReference',
  'CancelUrl', 'ErrorUrl', 'SuccessUrl', 'NotifyUrl', 'IsTest', 'HashCheck',
  'optional1', 'optional2'
];

orderedKeys.forEach(key => {
  const value = params.get(key);
  if (value) {
    if (paymentUrlParams) paymentUrlParams += '&';
    paymentUrlParams += `${key}=${encodeURIComponent(value)}`;
  }
});

const paymentUrl = `https://pay.ozow.com/?${paymentUrlParams}`;
console.log('\n=== PAYMENT URL ===');
console.log(paymentUrl);

// Output instructions
console.log('\n=== INSTRUCTIONS ===');
console.log('1. Replace YOUR_SITE_CODE and YOUR_PRIVATE_KEY with your actual values');
console.log('2. Run this script with: node ozow-hash-test.js');
console.log('3. Send the output to Ozow support for verification');
console.log('4. Try the generated URL directly in your browser to test');
