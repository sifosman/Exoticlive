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
    const privateKey = process.env.OZOW_PRIVATE_KEY;
    const apiKey = process.env.OZOW_API_KEY;
    const isTest = process.env.OZOW_IS_TEST === 'true';

    console.log('Ozow server config:', { 
      siteCodeProvided: !!siteCode,
      apiKeyExists: !!apiKey,
      privateKeyExists: !!privateKey,
      isTest
    });

    if (!privateKey || !apiKey) {
      console.error('Ozow configuration missing: API key or private key not found in environment variables');
      return NextResponse.json(
        { success: false, message: 'Ozow configuration missing' },
        { status: 500 }
      );
    }

    // Prepare data for hash generation according to Ozow documentation
    // Using the official documentation format for proper hash generation
    const hashInputString = `${siteCode}${countryCode}${currencyCode}${amount}${transactionReference}${bankReference}${customer.firstName} ${customer.lastName}${notifyUrl}${isTest ? 'true' : 'false'}${privateKey}`;
    
    console.log('Hash input string (without sensitive data):', hashInputString.replace(privateKey, '[REDACTED]'));
    
    // Convert to lowercase as required by Ozow
    const lowercaseString = hashInputString.toLowerCase();
    
    // Generate SHA512 hash
    const hash = crypto
      .createHash('sha512')
      .update(lowercaseString)
      .digest('hex');

    // Construct the payload for Ozow API
    const payload = {
      SiteCode: siteCode,
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
      ...payload,
      HashCheck: hash.substring(0, 10) + '...',
    });

    // Make request to Ozow API - Using the correct endpoint as per documentation
    const ozowResponse = await fetch('https://api.ozow.com/secure/request/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ApiKey': apiKey,
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
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
