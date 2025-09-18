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
    
    // Try multiple strategies to validate HashCheck, as Ozow docs vary across versions
    const inHash = String(data.HashCheck || '');
    const isTestVal = (String(data.IsTest ?? 'false')).toLowerCase();

    // Strategy A: Use same concatenation as Payment Request (values only, exact order)
    const concatValues = (
      (siteCode || '') +
      (data.CountryCode || '') +
      (data.CurrencyCode || '') +
      (data.Amount || '') +
      (transactionReference || '') +
      (data.BankReference || '') +
      (data.CancelUrl || '') +
      (data.ErrorUrl || '') +
      (data.SuccessUrl || '') +
      (data.NotifyUrl || '') +
      isTestVal +
      (privateKey || '')
    ).toLowerCase();
    const calcA = crypto.createHash('sha512').update(concatValues, 'utf8').digest('hex');

    // Strategy B: Legacy/alt approach building key=value joined by & (case-insensitive compare)
    const orderedParamsKv = [
      ['SiteCode', siteCode],
      ['CountryCode', data.CountryCode || ''],
      ['CurrencyCode', data.CurrencyCode || ''],
      ['Amount', data.Amount || ''],
      ['TransactionReference', transactionReference],
      ['BankReference', data.BankReference || ''],
      ['CancelUrl', data.CancelUrl || ''],
      ['ErrorUrl', data.ErrorUrl || ''],
      ['SuccessUrl', data.SuccessUrl || ''],
      ['NotifyUrl', data.NotifyUrl || ''],
      ['IsTest', isTestVal]
    ] as const;
    const hashInputB = orderedParamsKv.map(([k, v]) => `${k}=${encodeURIComponent(v || '')}`).join('&') + `&PrivateKey=${privateKey}`;
    const calcB = crypto.createHash('sha512').update(hashInputB, 'utf8').digest('hex');

    const match = inHash.toLowerCase() === calcA.toLowerCase() || inHash.toLowerCase() === calcB.toLowerCase();

    console.log('Notification hash verification:', {
      receivedHash: inHash.substring(0, 8) + '...'
        + inHash.substring(Math.max(8, inHash.length - 8)),
      strategyA: calcA.substring(0, 8) + '...' + calcA.substring(Math.max(8, calcA.length - 8)),
      strategyB: calcB.substring(0, 8) + '...' + calcB.substring(Math.max(8, calcB.length - 8)),
      matched: match
    });

    if (!match) {
      console.warn('Ozow notification HashCheck did not validate with known strategies. Proceeding as unverified.');
      // We still acknowledge to avoid retries; downstream should re-verify via status API.
    }

    // Respond with 200 to acknowledge receipt
    return NextResponse.json({ 
      status: match ? 'ok' : 'unverified',
      message: match ? 'Notification verified' : 'Notification received but hash unverified',
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