import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { token, amountInCents, currency } = await request.json();

    const response = await fetch('https://online.yoco.com/v1/charges/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_YOCO_SECRET_KEY}`
      },
      body: JSON.stringify({
        token,
        amountInCents,
        currency
      })
    });

    const charge = await response.json();
    
    if (!response.ok) {
      throw new Error(charge.message || 'Payment failed');
    }

    return NextResponse.json({ success: true, charge });
  } catch (error) {
    console.error('Payment error:', error);
    return NextResponse.json({ success: false, error: 'Payment failed' }, { status: 500 });
  }
}

