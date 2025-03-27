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

    if (!privateKey || !apiKey) {
      return NextResponse.json(
        { success: false, message: 'Ozow configuration missing' },
        { status: 500 }
      );
    }

    // Prepare data for hash generation
    const hashString = `${apiKey}${siteCode}${privateKey}${amount}${transactionReference}`;

    // Generate hash using SHA512
    const hash = crypto
      .createHash('sha512')
      .update(hashString)
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
      IsTest: process.env.NODE_ENV !== 'production', // Set to false in production
      HashCheck: hash
    };

    // Make request to Ozow API
    const ozowResponse = await fetch('https://api.ozow.com/postpaymentrequest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ApiKey': apiKey
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
