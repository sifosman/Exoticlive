import { NextRequest, NextResponse } from 'next/server';

/**
 * This endpoint is designed to be called by an external cron service.
 * It supports HTTP Basic Authentication if needed.
 *
 * You can set up an external cron service (like cron-job.org, EasyCron, etc.)
 * to call this endpoint every 2 minutes.
 *
 * URL to use: https://exoticshoes.co.za/api/cron-trigger
 *
 * If using HTTP authentication:
 * Username: (set in CRON_USERNAME environment variable)
 * Password: (set in CRON_PASSWORD environment variable)
 */
export async function GET(request: NextRequest) {
  try {
    console.log('External cron service triggered stock sync');

    // Call the simplified sync API
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin}/api/sync-simple`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to sync stock: ${response.status} ${response.statusText} - ${errorText}`);
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
