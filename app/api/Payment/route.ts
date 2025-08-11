import { NextResponse } from 'next/server';

// Helper function to validate payment data
function validatePaymentData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for required fields
  if (!data.token) errors.push('Missing payment token');
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

    const { token, amountInCents, currency } = body;

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

    const response = await fetch('https://online.yoco.com/v1/charges/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${secretKey}`
      },
      body: JSON.stringify({
        token,
        amountInCents,
        currency
      })
    });

    const charge = await response.json();
    
    console.log('Yoco API Response Status:', response.status);
    console.log('Yoco API Response:', JSON.stringify(charge, null, 2));
    
    if (!response.ok) {
      console.error('Yoco API Error:', charge);
      throw new Error(charge.message || `Yoco API error: ${response.status} ${response.statusText}`);
    }

    return NextResponse.json({ success: true, charge });
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

