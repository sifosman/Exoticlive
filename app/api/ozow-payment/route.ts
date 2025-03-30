import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    console.log('Ozow payment request received with data:', JSON.stringify(body, null, 2));

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
    
    console.log('===================== OZOW PAYMENT DEBUG =====================');
    console.log('Ozow API credentials:');
    console.log('Site Code:', siteCodeToUse);
    console.log('Private Key exists:', !!privateKey);
    console.log('API Key exists:', !!apiKey);
    
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
    
    console.log('Payment Details:');
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
    
    // =====================================================
    // CRITICAL: Generate hash according to Ozow documentation
    // =====================================================
    
    // 1. Create a string with all parameters in exact order they appear in the request
    //    (excluding HashCheck, and BEFORE adding ApiKey)
    const paramsForHash = [
      'SiteCode=' + siteCodeToUse,
      'CountryCode=ZA',
      'CurrencyCode=ZAR',
      'Amount=' + amountFormatted,
      'TransactionReference=' + reference,
      'BankReference=' + bankReference,
      'IsTest=' + isTestString
    ];
    
    // Add optional parameters in the exact order they appear
    if (customerName) {
      paramsForHash.push('CustomerInformation=' + customerName);
    }
    
    if (customerId) {
      paramsForHash.push('CustomerId=' + customerId);
    }
    
    // Add URLs in exact order
    paramsForHash.push('CancelUrl=' + cancelUrl);
    paramsForHash.push('ErrorUrl=' + errorUrl);
    paramsForHash.push('SuccessUrl=' + successUrl);
    paramsForHash.push('NotifyUrl=' + notifyUrl);
    
    // 2. Concatenate all parameters with '&'
    const paramsString = paramsForHash.join('&');
    
    // 3. Append the private key (exactly as provided by Ozow)
    const hashInput = paramsString + '&PrivateKey=' + privateKey;
    
    console.log('Hash calculation method:');
    console.log('1. Concatenate all parameters in order (excluding HashCheck)'); 
    console.log('2. Join with "&" character');
    console.log('3. Append "&PrivateKey=YOUR_PRIVATE_KEY"');
    console.log('4. Calculate SHA512 hash of the resulting string');
    console.log('Hash input string format:', 'SiteCode=XXX&CountryCode=ZA&CurrencyCode=ZAR&Amount=XXX&...[more params]...&PrivateKey=XXX');
    
    // Generate SHA512 hash as required by Ozow
    const hash = crypto
      .createHash('sha512')
      .update(hashInput)
      .digest('hex');

    console.log('Generated hash:', hash);
    
    // Add hash to parameters
    params.append('HashCheck', hash);
    
    // Add the API key as required by Ozow verification
    if (apiKey) {
      params.append('ApiKey', apiKey);
    }
    
    const paymentUrl = `${baseUrl}?${params.toString()}`;
    console.log('Full Payment URL:');
    console.log(paymentUrl);
    console.log('=================== END OZOW PAYMENT DEBUG ===================');

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
