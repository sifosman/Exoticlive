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
    
    // For production, we should explicitly set isTest to false 
    // (overriding any environment variables to ensure we're in production mode)
    const isTest = false;
    
    console.log('Ozow config:', { 
      siteCode: siteCodeToUse,
      privateKeyExists: !!privateKey,
      isTest
    });

    if (!privateKey || !siteCodeToUse) {
      return NextResponse.json(
        { success: false, message: 'Ozow configuration missing.' },
        { status: 500 }
      );
    }

    // Format values for hash and URL
    const amountFormatted = parseFloat(amount).toFixed(2);
    const reference = transactionReference.trim();
    
    // Generate hash using standard Ozow format for production
    // SiteCode + Amount + Reference + PrivateKey
    const hashString = `${siteCodeToUse}${amountFormatted}${reference}${privateKey}`;
    const hashStringLower = hashString.toLowerCase();
    
    console.log('Hash input (redacted):', 
      `${siteCodeToUse}${amountFormatted}${reference}[REDACTED]`);
    
    const hash = crypto
      .createHash('sha512')
      .update(hashStringLower)
      .digest('hex');

    console.log('Generated hash (first 20 chars):', hash.substring(0, 20) + '...');
    
    // Use standard Ozow URL for production (NOT SimplePayment)
    const baseUrl = 'https://pay.ozow.com';
    
    // Construct the Ozow redirect URL with all required parameters
    const params = new URLSearchParams();
    
    // Required parameters
    params.append('SiteCode', siteCodeToUse);
    params.append('CountryCode', 'ZA');
    params.append('CurrencyCode', 'ZAR');
    params.append('Amount', amountFormatted);
    params.append('TransactionReference', reference);
    params.append('BankReference', reference);
    params.append('IsTest', 'false'); // Explicitly set to production mode
    
    // Customer information
    if (customer.firstName && customer.lastName) {
      params.append('CustomerInformation', `${customer.firstName} ${customer.lastName}`);
    }
    
    if (customer.email) {
      params.append('CustomerId', customer.email);
    }
    
    // URLs
    if (cancelUrl) params.append('CancelUrl', cancelUrl);
    if (errorUrl) params.append('ErrorUrl', errorUrl);
    if (successUrl) params.append('SuccessUrl', successUrl);
    if (notifyUrl) params.append('NotifyUrl', notifyUrl);
    
    // Hash
    params.append('HashCheck', hash);
    
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
