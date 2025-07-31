import { NextRequest, NextResponse } from 'next/server';

/**
 * This is an extremely simplified cron job endpoint designed specifically for Vercel cron jobs.
 * It has minimal code to reduce the chance of errors.
 */
export async function GET(request: NextRequest) {
  try {
    console.log('=== VERCEL CRON JOB TRIGGERED ===');
    console.log('Request URL:', request.url);
    console.log('Headers:', JSON.stringify(Object.fromEntries(request.headers.entries()), null, 2));
    
    // Call the simplified sync API
    const syncUrl = new URL('/api/sync-simple', request.url);
    console.log('Calling sync API at:', syncUrl.toString());
    
    const response = await fetch(syncUrl.toString());
    const result = await response.json();
    
    console.log('Sync result:', JSON.stringify(result, null, 2));
    
    return NextResponse.json({
      success: true,
      message: 'Cron job executed successfully',
      result
    });
  } catch (error) {
    console.error('Error in Vercel cron job:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error in Vercel cron job',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
