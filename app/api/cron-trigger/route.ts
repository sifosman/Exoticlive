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

    // First call the simplified sync API for updated products
    console.log('Calling sync-simple API for updated products...');
    const syncResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin}/api/sync-simple`);

    if (!syncResponse.ok) {
      const errorText = await syncResponse.text();
      throw new Error(`Failed to sync updated products: ${syncResponse.status} ${syncResponse.statusText} - ${errorText}`);
    }

    const syncResult = await syncResponse.json();
    console.log('Updated products sync result:', syncResult.message);

    // Then call the new products sync API
    console.log('Calling sync-new-products API for new products...');
    // Add a timestamp to avoid caching issues
    const timestamp = new Date().getTime();
    const newProductsResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin}/api/sync-new-products?t=${timestamp}`);

    if (!newProductsResponse.ok) {
      const errorText = await newProductsResponse.text();
      console.error(`Failed to sync new products: ${newProductsResponse.status} ${newProductsResponse.statusText} - ${errorText}`);
      // Continue with the result from the first sync even if the second one fails
    } else {
      const newProductsResult = await newProductsResponse.json();
      console.log('New products sync result:', newProductsResult.message);
    }

    // Combine the results
    const result = {
      ...syncResult,
      message: `${syncResult.message}. Also checked for new products.`
    };

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
