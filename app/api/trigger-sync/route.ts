import { NextRequest, NextResponse } from 'next/server';

/**
 * This endpoint allows you to manually trigger the stock sync.
 * It's useful for testing if the cron job is working correctly.
 *
 * Usage: GET /api/trigger-sync
 */
export async function GET(request: NextRequest) {
  try {
    console.log('Manual trigger requested for stock sync');

    // Call the cron job endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin}/api/cron/sync-stock`, {
      headers: {
        // Add a custom header to identify this as a manual trigger
        'x-manual-trigger': 'true',
        // Add the host header to help with local request detection
        'host': request.headers.get('host') || 'localhost'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to trigger sync: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      message: 'Stock sync triggered successfully',
      result
    });
  } catch (error) {
    console.error('Error triggering stock sync:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Error triggering stock sync',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
