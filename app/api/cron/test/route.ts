import { NextRequest, NextResponse } from 'next/server';

// Log outside the handler to see if the file is being loaded
console.log(`=== TEST CRON JOB FILE LOADED at ${new Date().toISOString()} ===`);

/**
 * This is a simple test cron job to verify that Vercel cron jobs are working.
 */
export async function GET(request: NextRequest) {
  try {
    console.log(`=== TEST CRON JOB TRIGGERED at ${new Date().toISOString()} ===`);
    console.log('Request URL:', request.url);
    console.log('Request headers:', JSON.stringify(Object.fromEntries(request.headers.entries()), null, 2));

    const isVercelCron = request.headers.get('x-vercel-cron') === 'true';
    console.log('Is Vercel cron:', isVercelCron ? 'Yes' : 'No');

    if (isVercelCron) {
      console.log('=== VERCEL CRON JOB DETECTED IN TEST ENDPOINT ===');
      console.log('Vercel cron header:', request.headers.get('x-vercel-cron'));
      console.log('All headers:', JSON.stringify(Object.fromEntries(request.headers.entries()), null, 2));
    }

    return NextResponse.json({
      success: true,
      message: 'Test cron job executed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in test cron job:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Error in test cron job',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
