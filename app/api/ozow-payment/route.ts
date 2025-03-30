import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    console.log('Ozow payment request received with data:', {
      transactionReference: body.transactionReference,
      amount: body.amount
    });

    // Extract payment details from request body
    const {
      siteCode,
      countryCode,
      currencyCode,
      amount,
      transactionReference,
      bankReference,
      customer,
      cancelUrl,
      errorUrl,
      successUrl,
      notifyUrl
    } = body;

    // Ensure required environment variables are set
    // First try server environment variables, then fallback to client-side ones
    const siteCodeToUse = process.env.OZOW_SITE_CODE || siteCode;
    const privateKey = process.env.OZOW_PRIVATE_KEY;
    const apiKey = process.env.OZOW_API_KEY;
    
    // Check test mode - explicitly handle "false" string case
    const testModeEnv = process.env.OZOW_IS_TEST;
    const isTest = testModeEnv !== undefined ? 
      (testModeEnv === 'true' || testModeEnv === '1') : false;

    console.log('Ozow server config:', { 
      siteCodeProvided: !!siteCodeToUse,
      siteCodeSource: process.env.OZOW_SITE_CODE ? 'server' : 'client',
      apiKeyExists: !!apiKey,
      privateKeyExists: !!privateKey,
      isTest,
      testModeEnv
    });

    if (!privateKey || !apiKey || !siteCodeToUse) {
      console.error('Ozow configuration missing - Details:', {
        privateKeyMissing: !privateKey,
        apiKeyMissing: !apiKey,
        siteCodeMissing: !siteCodeToUse
      });
      return NextResponse.json(
        { success: false, message: 'Ozow configuration missing. Check server logs for details.' },
        { status: 500 }
      );
    }

    // Prepare data for hash generation according to Ozow documentation
    const isTestString = isTest ? 'true' : 'false';
    console.log('Using test mode:', isTestString);
    
    // Format the customer name as required by Ozow
    const customerName = `${customer.firstName} ${customer.lastName}`.trim();
    
    // Order of fields for hash generation according to Ozow documentation:
    // SiteCode + CountryCode + CurrencyCode + Amount + TransactionReference + BankReference + CustomerInformation + NotifyUrl + IsTest + PrivateKey
    const hashInputString = `${siteCodeToUse}${countryCode}${currencyCode}${amount}${transactionReference}${bankReference}${customerName}${notifyUrl}${isTestString}${privateKey}`;
    
    console.log('Hash input string base (without sensitive data):', 
      `${siteCodeToUse}${countryCode}${currencyCode}${amount}${transactionReference}${bankReference}${customerName}${notifyUrl}${isTestString}[REDACTED]`.substring(0, 100) + '...');
    
    // Convert to lowercase as required by Ozow
    const lowercaseString = hashInputString.toLowerCase();
    
    // Generate SHA512 hash
    const hash = crypto
      .createHash('sha512')
      .update(lowercaseString)
      .digest('hex');

    console.log('Generated hash (first 20 chars):', hash.substring(0, 20) + '...');
    
    // Construct query parameters for the Ozow payment URL
    const params = new URLSearchParams({
      SiteCode: siteCodeToUse,
      CountryCode: countryCode,
      CurrencyCode: currencyCode,
      Amount: amount,
      TransactionReference: transactionReference,
      BankReference: bankReference,
      CustomerFirstName: customer.firstName,
      CustomerLastName: customer.lastName,
      CustomerEmail: customer.email,
      CustomerMobile: customer.mobileNumber,
      CancelUrl: cancelUrl,
      ErrorUrl: errorUrl,
      SuccessUrl: successUrl,
      NotifyUrl: notifyUrl,
      IsTest: isTestString,
      HashCheck: hash,
      ApiKey: apiKey
    });

    // Construct the direct payment URL - Use the redirect approach instead of API
    const baseUrl = isTest ? 'https://pay.ozow.com/test?' : 'https://pay.ozow.com/?';
    const paymentUrl = baseUrl + params.toString();
    
    console.log('Direct payment URL constructed (truncated):', paymentUrl.substring(0, 100) + '...');

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
