import { NextResponse } from 'next/server';
import Yoco from 'yoco';

// Initialize Yoco with your secret key
const yoco = new Yoco(process.env.YOCO_SECRET_KEY as string);

export async function POST(request: Request) {
  try {
    const { token, amountInCents, currency } = await request.json();

    const charge = await yoco.charges.create({
      token,
      amountInCents,
      currency
    });

    return NextResponse.json({ success: true, charge });
  } catch (error) {
    console.error('Payment error:', error);
    return NextResponse.json({ success: false, error: 'Payment failed' }, { status: 500 });
  }
}

