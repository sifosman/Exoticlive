import { NextResponse } from 'next/server';
import crypto from 'crypto';

// This endpoint receives notification callbacks from Ozow after payment
export async function POST(request: Request) {
  try {
    console.log('===== OZOW NOTIFICATION RECEIVED =====');
    
    // Try to parse both formats that Ozow might send
    const contentType = request.headers.get('content-type') || '';
    let data: any;
    
    if (contentType.includes('application/json')) {
      data = await request.json();
      console.log('JSON Notification Data:', JSON.stringify(data, null, 2));
    } else {
      // Handle form data
      const formData = await request.formData();
      data = {};
      formData.forEach((value, key) => {
        data[key] = value;
      });
      console.log('Form Data Notification:', JSON.stringify(data, null, 2));
    }
    
    // Extract transaction reference if available to check localStorage later
    const transactionReference = data.TransactionReference || 
                              data.transactionReference || 
                              request.url.split('ref=')[1];
    
    console.log('Transaction Reference from notification:', transactionReference);
    
    // Get Ozow credentials
    const siteCode = process.env.OZOW_SITE_CODE;
    const privateKey = process.env.OZOW_PRIVATE_KEY;
    
    console.log('Ozow credentials available:', {
      hasSiteCode: !!siteCode,
      hasPrivateKey: !!privateKey
    });
    
    // Rebuild parameters in exact Ozow required order
    const ozowOrderedParams = [
      `SiteCode=${encodeURIComponent(siteCode)}`,
      `CountryCode=${encodeURIComponent(data.CountryCode || '')}`,
      `CurrencyCode=${encodeURIComponent(data.CurrencyCode || '')}`,
      `Amount=${encodeURIComponent(data.Amount || '')}`,
      `TransactionReference=${encodeURIComponent(transactionReference)}`,
      `BankReference=${encodeURIComponent(data.BankReference || '')}`,
      `IsTest=${encodeURIComponent(data.IsTest || 'false')}`,
      ...(data.CustomerInformation ? [`CustomerInformation=${encodeURIComponent(data.CustomerInformation)}`] : []),
      ...(data.optional1 ? [`optional1=${encodeURIComponent(data.optional1)}`] : []),
      `CancelUrl=${encodeURIComponent(data.CancelUrl || '')}`,
      `ErrorUrl=${encodeURIComponent(data.ErrorUrl || '')}`,
      `SuccessUrl=${encodeURIComponent(data.SuccessUrl || '')}`,
      `NotifyUrl=${encodeURIComponent(data.NotifyUrl || '')}`
    ];

    const hashInput = ozowOrderedParams.join('&') + `&PrivateKey=${privateKey}`;
    const ourHash = crypto.createHash('sha512').update(hashInput).digest('hex').toUpperCase();

    if (ourHash !== data.HashCheck) {
      console.error('HashCheck mismatch:', {
        received: data.HashCheck,
        calculated: ourHash,
        hashInput
      });
      throw new Error('HashCheck validation failed');
    }

    // Respond with 200 to acknowledge receipt
    return NextResponse.json({ 
      status: 'ok',
      message: 'Notification received successfully',
      reference: transactionReference
    });
  } catch (error) {
    console.error('Error processing Ozow notification:', error);
    return NextResponse.json(
      { 
        status: 'error',
        message: 'Failed to process notification',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}