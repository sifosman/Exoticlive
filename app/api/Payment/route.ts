import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Check if secret key is configured
    if (!process.env.YOCO_SECRET_KEY) {
      console.error('YOCO_SECRET_KEY environment variable is not configured');
      return NextResponse.json({ 
        success: false, 
        error: 'Payment service not configured' 
      }, { status: 500 });
    }

    const { token, amountInCents, currency } = await request.json();

    // Validate required parameters
    if (!token || !amountInCents || !currency) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required payment parameters' 
      }, { status: 400 });
    }

    console.log('Processing Yoco payment:', { amountInCents, currency });

    const response = await fetch('https://online.yoco.com/v1/charges/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.YOCO_SECRET_KEY}`
      },
      body: JSON.stringify({
        token,
        amountInCents,
        currency
      })
    });

    const charge = await response.json();
    
    if (!response.ok) {
      console.error('Yoco API error:', {
        status: response.status,
        statusText: response.statusText,
        charge
      });
      throw new Error(charge.message || `Payment failed with status ${response.status}`);
    }

    console.log('Yoco payment successful:', charge.id);
    return NextResponse.json({ success: true, charge });
  } catch (error) {
    console.error('Payment processing error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Payment failed' 
    }, { status: 500 });
  }
}

