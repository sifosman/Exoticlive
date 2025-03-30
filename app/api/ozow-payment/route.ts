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
    // Using the official documentation format for proper hash generation
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
    
    // Construct the payload for Ozow API
    const payload = {
      SiteCode: siteCodeToUse,
      CountryCode: countryCode,
      CurrencyCode: currencyCode,
      Amount: amount,
      TransactionReference: transactionReference,
      BankReference: bankReference,
      Customer: {
        FirstName: customer.firstName,
        LastName: customer.lastName,
        Email: customer.email,
        Mobile: customer.mobileNumber,
      },
      CancelUrl: cancelUrl,
      ErrorUrl: errorUrl,
      SuccessUrl: successUrl,
      NotifyUrl: notifyUrl,
      IsTest: isTest,
      HashCheck: hash
    };

    console.log('Sending request to Ozow API with payload:', {
      SiteCode: payload.SiteCode,
      Amount: payload.Amount,
      TransactionReference: payload.TransactionReference,
      IsTest: payload.IsTest,
      HashCheck: hash.substring(0, 10) + '...'
    });

    // Make request to Ozow API - Using the correct endpoint as per documentation
    const ozowResponse = await fetch('https://pay.ozow.com', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'ApiKey': apiKey
      },
      body: new URLSearchParams({
        SiteCode: payload.SiteCode,
        CountryCode: payload.CountryCode,
        CurrencyCode: payload.CurrencyCode,
        Amount: payload.Amount,
        TransactionReference: payload.TransactionReference,
        BankReference: payload.BankReference,
        CustomerFirstName: payload.Customer.FirstName,
        CustomerLastName: payload.Customer.LastName,
        CustomerEmail: payload.Customer.Email,
        CustomerMobile: payload.Customer.Mobile,
        CancelUrl: payload.CancelUrl,
        ErrorUrl: payload.ErrorUrl,
        SuccessUrl: payload.SuccessUrl,
        NotifyUrl: payload.NotifyUrl,
        IsTest: isTest ? 'true' : 'false',
        HashCheck: payload.HashCheck
      }).toString()
    });

    // Check if the request was successful
    if (!ozowResponse.ok) {
      let errorMessage = `Ozow API Error: ${ozowResponse.status} ${ozowResponse.statusText}`;
      let errorData;
      
      try {
        errorData = await ozowResponse.json();
        console.error('Ozow API Error:', errorData);
        errorMessage = `Ozow API Error: ${JSON.stringify(errorData)}`;
      } catch (e) {
        console.error('Failed to parse Ozow error response:', e);
        // Try to get text response if JSON parsing fails
        try {
          const textResponse = await ozowResponse.text();
          console.error('Ozow API Error (text):', textResponse);
          errorMessage = `Ozow API Error: ${textResponse.substring(0, 100)}...`;
        } catch (textError) {
          console.error('Failed to get text response:', textError);
        }
      }
      
      return NextResponse.json(
        { success: false, message: errorMessage },
        { status: 500 }
      );
    }

    // Parse the Ozow response
    const responseData = await ozowResponse.json();
    console.log('Ozow API response:', responseData);

    // Return the payment URL
    return NextResponse.json({
      success: true,
      paymentUrl: responseData.url
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
