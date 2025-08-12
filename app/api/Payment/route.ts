import { NextResponse } from 'next/server';

// Helper function to validate payment data
function validatePaymentData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Hosted Checkout flow: token is NOT required. We only need amount and currency.
  if (!data.amountInCents || isNaN(parseInt(data.amountInCents))) errors.push('Invalid or missing amount');
  if (!data.currency) errors.push('Missing currency');

  return {
    isValid: errors.length === 0,
    errors
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    console.log('Yoco Payment Request Received:', JSON.stringify(body, null, 2));

    // Validate the payment data first
    const validation = validatePaymentData(body);
    if (!validation.isValid) {
      console.error('Payment data validation failed:', validation.errors);
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid payment data: ' + validation.errors.join(', ')
        },
        { status: 400 }
      );
    }

    // Hosted Checkout flow: we only need amount/currency and optional redirect URLs/metadata
    const { token, amountInCents, currency, successUrl, cancelUrl, failureUrl, metadata } = body;

    // Ensure Yoco secret key is configured
    const secretKey = process.env.YOCO_SECRET_KEY;
    
    console.log('===== YOCO CREDENTIALS CHECK =====');
    console.log('Secret Key exists:', !!secretKey, 'Length:', secretKey ? secretKey.length : 0);
    
    if (!secretKey) {
      console.error('Yoco secret key is missing');
      return NextResponse.json(
        { 
          success: false, 
          message: 'Yoco payment service not configured. Please set YOCO_SECRET_KEY environment variable in Vercel.' 
        },
        { status: 500 }
      );
    }

    // Call Yoco Payments API (Hosted Checkout - create checkout and redirect customer)
    // Allow overriding the API base via env var for flexibility if Yoco provides a different base for your account
    const apiBase = process.env.YOCO_API_BASE || 'https://payments.yoco.com/api';
    const endpoint = `${apiBase.replace(/\/$/, '')}/checkouts`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${secretKey}`,
        // Idempotency prevents duplicate charges if the client retries the same token
        // Using the token is generally safe for a one-off payment attempt
        'Idempotency-Key': token || `${amountInCents}-${Date.now()}`
      },
      body: JSON.stringify({
        // Checkout API expects `amount` in cents and `currency`, plus optional redirect URLs
        amount: amountInCents,
        currency,
        successUrl,
        cancelUrl,
        failureUrl,
        metadata: metadata || null
      })
    });

    // Safely parse response: attempt JSON when content-type indicates JSON; otherwise read as text
    const contentType = response.headers.get('content-type') || '';
    const yocoRequestId = response.headers.get('x-request-id') || response.headers.get('x-amzn-requestid') || response.headers.get('cf-ray') || '';
    let parsedBody: any = null;
    let rawText: string | null = null;

    try {
      if (contentType.includes('application/json')) {
        parsedBody = await response.json();
      } else {
        rawText = await response.text();
      }
    } catch (parseErr) {
      // As a final fallback, try reading as text if JSON parsing failed
      try {
        rawText = rawText ?? (await response.text());
      } catch (_) {
        // ignore
      }
      console.error('Failed to parse Yoco response body:', parseErr);
    }

    console.log('Yoco API Response Status:', response.status, response.statusText);
    if (response.url) console.log('Yoco API Final URL:', response.url);
    if (yocoRequestId) console.log('Yoco Request ID:', yocoRequestId);
    if (contentType) console.log('Yoco Response Content-Type:', contentType);
    if (parsedBody) {
      console.log('Yoco API Response (JSON):', JSON.stringify(parsedBody, null, 2));
    } else if (rawText) {
      const preview = rawText.length > 500 ? rawText.slice(0, 500) + '...[truncated]' : rawText;
      console.log('Yoco API Response (text):', preview);
    }

    if (!response.ok) {
      const chargeErr = parsedBody ?? { raw: rawText };
      // Prefer Yoco's user-friendly displayMessage when available
      const errMsg = (parsedBody && (parsedBody.displayMessage || parsedBody.errorMessage || parsedBody.message))
        || `Yoco API error: ${response.status} ${response.statusText}`;

      return NextResponse.json(
        {
          success: false,
          message: errMsg,
          details: chargeErr,
          requestId: yocoRequestId || undefined
        },
        { status: response.status }
      );
    }

    // Success path: return parsed JSON if available, else try to parse from text
    const checkout = parsedBody ?? (rawText ? { raw: rawText } : null);
    // Yoco returns a redirectUrl we should pass to the client
    const redirectUrl = checkout?.redirectUrl || checkout?.redirect_url || null;
    return NextResponse.json({ success: true, redirectUrl, checkout, requestId: yocoRequestId || undefined });
  } catch (error) {
    console.error('Payment error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Payment failed',
        message: 'We are currently experiencing issues with the payment processor. Please try again later.'
      }, 
      { status: 500 }
    );
  }
}

