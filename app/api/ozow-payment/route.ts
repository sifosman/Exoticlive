import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Helper function to validate payment data
function validatePaymentData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check for required fields
  if (!data.siteCode && !process.env.OZOW_SITE_CODE) errors.push('Missing SiteCode');
  if (!data.amount || isNaN(parseFloat(data.amount))) errors.push('Invalid or missing Amount');
  if (!data.transactionReference) errors.push('Missing TransactionReference');
  if (!data.cancelUrl) errors.push('Missing CancelUrl');
  if (!data.errorUrl) errors.push('Missing ErrorUrl');
  if (!data.successUrl) errors.push('Missing SuccessUrl');
  if (!data.notifyUrl) errors.push('Missing NotifyUrl');
  
  // Additional validations
  if (data.amount && parseFloat(data.amount) <= 0) errors.push('Amount must be greater than 0');
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    console.log('Ozow Payment Request Received:', JSON.stringify(body, null, 2));
    
    // Validate the payment data first
    const validation = validatePaymentData(body);
    if (!validation.isValid) {
      console.error('Payment data validation failed:', validation.errors);
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid payment data: ' + validation.errors.join(', ') 
        },
        { status: 400 }
      );
    }

    // Extract only the payment details we need from request body
    const {
      siteCode,
      amount,
      transactionReference,
      customer,
      cancelUrl,
      errorUrl,
      successUrl,
      notifyUrl
    } = body;

    // Ensure required environment variables are set
    // Use ONLY environment variable or body value, not both
    const siteCodeToUse = process.env.OZOW_SITE_CODE || siteCode;
    
    
    const privateKey = process.env.OZOW_PRIVATE_KEY;
    const apiKey = process.env.OZOW_API_KEY;
    
    console.log('===== OZOW CREDENTIALS CHECK =====');
    console.log('Site Code:', siteCodeToUse);
    console.log('Private Key exists:', !!privateKey, 'Length:', privateKey ? privateKey.length : 0);
    console.log('API Key exists:', !!apiKey, 'Length:', apiKey ? apiKey.length : 0);
    
    // Always use "false" string for production mode
    const isTestString = 'false';
    
    if (!privateKey || !siteCodeToUse || !apiKey) {
      console.error('Missing Ozow configuration:', {
        hasSiteCode: !!siteCodeToUse,
        hasPrivateKey: !!privateKey,
        hasApiKey: !!apiKey
      });
      return NextResponse.json(
        { success: false, message: 'Ozow configuration missing (keys or site code).' },
        { status: 500 }
      );
    }

    // Format values for proper request
    const amountFormatted = parseFloat(amount).toFixed(2);
    const reference = transactionReference.trim();
    const bankReference = reference;
    const customerName = customer.firstName && customer.lastName ? 
      `${customer.firstName.trim()} ${customer.lastName.trim()}` : '';
    const customerId = customer.email || '';
    
    console.log('===== PAYMENT DETAILS =====');
    console.log('Amount:', amountFormatted);
    console.log('Reference:', reference);
    console.log('Customer:', customerName);
    console.log('Customer ID:', customerId);
    console.log('Success URL:', successUrl);
    console.log('Notify URL:', notifyUrl);
    
    // Use standard Ozow URL for production
    const baseUrl = 'https://pay.ozow.com';
    
    // Construct the Ozow redirect URL with all required parameters
    const params = new URLSearchParams();
    
    // Required parameters in the exact order Ozow expects
    params.append('SiteCode', siteCodeToUse);
    params.append('CountryCode', 'ZA');
    params.append('CurrencyCode', 'ZAR');
    params.append('Amount', amountFormatted);
    params.append('TransactionReference', reference);
    params.append('BankReference', bankReference);
    params.append('IsTest', isTestString);
    
    // Customer information
    if (customerName) {
      params.append('CustomerInformation', customerName);
    }
    
    if (customerId) {
      params.append('CustomerId', customerId);
    }
    
    // URLs - all required
    params.append('CancelUrl', cancelUrl);
    params.append('ErrorUrl', errorUrl);
    params.append('SuccessUrl', successUrl);
    params.append('NotifyUrl', notifyUrl);
    
    console.log('===== HASH CALCULATION =====');
    
    // Extract all parameters for hash calculation
    const paramsObj: Record<string, string> = {};
    params.forEach((value, key) => {
      paramsObj[key] = value;
    });
    
    // Sort parameters alphabetically as per Ozow requirements
    const sortedKeys = Object.keys(paramsObj).sort();
    const paramsForHash: string[] = [];
    
    // Build the hash input with all parameters in correct format
    for (const key of sortedKeys) {
      paramsForHash.push(`${key}=${paramsObj[key]}`);
    }
    
    // Concatenate with '&' and append private key
    // Rebuild parameters in exact order required by Ozow
    const ozowOrderedParams = [
      `SiteCode=${encodeURIComponent(siteCodeToUse)}`,
      `CountryCode=${encodeURIComponent('ZA')}`,
      `CurrencyCode=${encodeURIComponent('ZAR')}`,
      `Amount=${encodeURIComponent(amountFormatted)}`,
      `TransactionReference=${encodeURIComponent(reference)}`,
      `BankReference=${encodeURIComponent(bankReference)}`,
      `IsTest=${encodeURIComponent(isTestString)}`,
      ...(customerName ? [`CustomerInformation=${encodeURIComponent(customerName)}`] : []),
      ...(customerId ? [`CustomerId=${encodeURIComponent(customerId)}`] : []),
      `CancelUrl=${encodeURIComponent(cancelUrl)}`,
      `ErrorUrl=${encodeURIComponent(errorUrl)}`,
      `SuccessUrl=${encodeURIComponent(successUrl)}`,
      `NotifyUrl=${encodeURIComponent(notifyUrl)}`
    ];

    const hashInput = ozowOrderedParams.join('&') + `&PrivateKey=${privateKey}`;
    
    console.log('Hash calculation method:');
    console.log('1. Get all parameters in alphabetical order');
    console.log('2. Format as "Key=Value" for each parameter');
    console.log('3. Join with "&" character');
    console.log('4. Append "&PrivateKey=YOUR_PRIVATE_KEY"');
    console.log('5. Calculate SHA512 hash of the resulting string');
    
    // Log detailed parameter information
    console.log('Parameters for hash calculation (sorted):', JSON.stringify(paramsObj, null, 2));
    console.log('Private key length:', privateKey.length);
    
    // Log redacted hash input for debugging
    const redactedHashInput = hashInput.replace(privateKey, '[REDACTED]');
    console.log('Redacted hash input:', redactedHashInput);
    console.log('Full hash input length:', hashInput.length);
    
    // Generate SHA512 hash as required by Ozow
    const hash = crypto
      .createHash('sha512')
      .update(hashInput, 'utf8')
      .digest('hex').toUpperCase();

    console.log('Generated hash:', hash);
    
    // Add hash to parameters
    params.append('HashCheck', hash);
    
    const paymentUrl = `${baseUrl}?${params.toString()}`;
    
    // Log the final URL for debugging
    console.log('===== FINAL PAYMENT URL =====');
    console.log(paymentUrl);

    // Check if URL is too long (over 2000 characters)
    if (paymentUrl.length > 2000) {
      console.warn('Warning: Payment URL is very long (' + paymentUrl.length + ' chars)');
    }
    
    // Return the payment URL to the client
    return NextResponse.json({
      success: true,
      paymentUrl: paymentUrl,
      payload: {
        parameters: paramsObj,
        hashInput: redactedHashInput
      }
    });
  } catch (error) {
    console.error('Error processing Ozow payment:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'An error occurred processing the payment',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
