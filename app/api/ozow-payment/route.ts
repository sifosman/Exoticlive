import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();

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

    if (!privateKey || !apiKey) {
      return NextResponse.json(
        { success: false, message: 'Ozow configuration missing' },
        { status: 500 }
      );
    }

    // Prepare data for hash generation according to Ozow documentation
    // 1. Concatenate the values in order specified by Ozow
    const concatenatedString = `${siteCode}${countryCode}${currencyCode}${amount}${transactionReference}${bankReference}${customer.firstName} ${customer.lastName}${notifyUrl}${isTest}${privateKey}`;
    
    // 2. Convert to lowercase
    const lowercaseString = concatenatedString.toLowerCase();
    
    // 3. Generate SHA512 hash
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
      const errorData = await ozowResponse.json();
      console.error('Ozow API Error:', errorData);
      return NextResponse.json(
        { success: false, message: 'Failed to process payment with Ozow' },
        { status: ozowResponse.status }
      );
    }

    // Parse the Ozow response
    const responseData = await ozowResponse.json();

    // Return the payment URL
    return NextResponse.json({
      success: true,
      paymentUrl: responseData.url
    });
  } catch (error) {
    console.error('Error processing Ozow payment:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred processing the payment' },
      { status: 500 }
    );
  }
}
