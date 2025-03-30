import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    console.log('Ozow payment request received with data:', {
      transactionReference: body.transactionReference,
      amount: body.amount
    });

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
    const siteCodeToUse = process.env.OZOW_SITE_CODE || siteCode;
    const privateKey = process.env.OZOW_PRIVATE_KEY;
    const apiKey = process.env.OZOW_API_KEY;
    
    // For production, we should explicitly set isTest to false 
    const isTest = false;
    const isTestString = 'false';
    
    console.log('Ozow config:', { 
      siteCode: siteCodeToUse,
      privateKeyExists: !!privateKey,
      apiKeyExists: !!apiKey,
      isTest
    });

    if (!privateKey || !siteCodeToUse || !apiKey) {
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
    
    // CRITICAL: This is exactly how Ozow requires hash input string to be formatted
    // The order and case of these fields matter for hash generation
    const hashInput = (
      siteCodeToUse +           // SiteCode
      'ZA' +                    // CountryCode (South Africa)
      'ZAR' +                   // CurrencyCode (South African Rand)
      amountFormatted +         // Amount
      reference +               // TransactionReference
      bankReference +           // BankReference
      customerName +            // CustomerInformation
      notifyUrl +               // NotifyUrl
      isTestString +            // IsTest
      privateKey                // PrivateKey
    ).toLowerCase();            // Ozow requires lowercase for hash input
    
    console.log('Hash input structure (redacted):', 
      'SiteCode+CountryCode+CurrencyCode+Amount+TransactionReference+BankReference+CustomerInformation+NotifyUrl+IsTest+PrivateKey');
    console.log('Sample (with private key redacted):',
      `${siteCodeToUse}+ZA+ZAR+${amountFormatted}+${reference}+${bankReference}+${customerName}+${notifyUrl}+${isTestString}+[REDACTED]`);
    
    // Generate SHA512 hash as required by Ozow
    const hash = crypto
      .createHash('sha512')
      .update(hashInput)
      .digest('hex');

    console.log('Generated hash (first 20 chars):', hash.substring(0, 20) + '...');
    
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
    
    // Customer information
    if (customerName) {
      params.append('CustomerInformation', customerName);
    }
    
    if (customer.email) {
      params.append('CustomerId', customer.email);
    }
    
    // URLs - all required
    params.append('CancelUrl', cancelUrl);
    params.append('ErrorUrl', errorUrl);
    params.append('SuccessUrl', successUrl);
    params.append('NotifyUrl', notifyUrl);
    
    // Must use exactly "false" (not 0 or other values)
    params.append('IsTest', isTestString);
    
    // Hash is required
    params.append('HashCheck', hash);
    
    // Add the API key as required by Ozow verification
    if (apiKey) {
      params.append('ApiKey', apiKey);
    }
    
    const paymentUrl = `${baseUrl}?${params.toString()}`;
    console.log('Ozow Payment URL (first 100 chars):', paymentUrl.substring(0, 100) + '...');

    // Return the payment URL to the client
    return NextResponse.json({
      success: true,
      paymentUrl: paymentUrl
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
