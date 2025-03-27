import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  try {
    // Return environment variable existence without revealing their actual values
    return NextResponse.json({
      NEXT_PUBLIC_WORDPRESS_URL: {
        exists: !!process.env.NEXT_PUBLIC_WORDPRESS_URL,
        value: process.env.NEXT_PUBLIC_WORDPRESS_URL ? `${process.env.NEXT_PUBLIC_WORDPRESS_URL.substring(0, 8)}...` : null
      },
      WC_CONSUMER_KEY: {
        exists: !!process.env.WC_CONSUMER_KEY,
        length: process.env.WC_CONSUMER_KEY?.length || 0
      },
      WC_CONSUMER_SECRET: {
        exists: !!process.env.WC_CONSUMER_SECRET,
        length: process.env.WC_CONSUMER_SECRET?.length || 0
      },
      // Also check NODE_ENV as it affects cookie security settings
      NODE_ENV: process.env.NODE_ENV || 'not set'
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to check environment variables',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
