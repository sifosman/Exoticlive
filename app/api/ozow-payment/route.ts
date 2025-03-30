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
    
    // Simple check for test mode
    const isTest = (process.env.OZOW_IS_TEST === 'true');
    
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
    
    // Generate hash using Ozow Simple Payment format
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
    
    // Use Ozow's Simple Payment URL format
    const baseUrl = isTest 
      ? 'https://pay.ozow.com/simplepaytest' 
      : 'https://pay.ozow.com/simplepay';
    
    // Construct the Ozow redirect URL with minimal required parameters
    const ozowUrl = new URL(baseUrl);
    
    // Required parameters only - keep it simple
    ozowUrl.searchParams.append('SiteCode', siteCodeToUse);
    ozowUrl.searchParams.append('Amount', amountFormatted);
    ozowUrl.searchParams.append('Reference', reference);
    ozowUrl.searchParams.append('Hash', hash);
    
    // Only add necessary redirect URLs
    if (cancelUrl) ozowUrl.searchParams.append('CancelUrl', cancelUrl);
    if (errorUrl) ozowUrl.searchParams.append('ErrorUrl', errorUrl);
    if (successUrl) ozowUrl.searchParams.append('SuccessUrl', successUrl);
    if (notifyUrl) ozowUrl.searchParams.append('NotifyUrl', notifyUrl);

    // Customer information - only if provided
    if (customer.email) {
      ozowUrl.searchParams.append('Customer', `${customer.firstName} ${customer.lastName}`);
      ozowUrl.searchParams.append('Email', customer.email);
    }
    
    const paymentUrl = ozowUrl.toString();
    console.log('Ozow Simple Payment URL:', paymentUrl);

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
