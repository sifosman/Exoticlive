import { NextRequest, NextResponse } from 'next/server';

// Store the last sync time in memory
let lastSyncTime: string | null = null;

// Handle GET requests to trigger the stock sync
export async function GET(request: NextRequest) {
  try {
    const cronStartTime = Date.now();
    console.log(`Cron job triggered at ${new Date().toISOString()}: Syncing stock...`);

    // Get the API key from the request
    const apiKey = request.nextUrl.searchParams.get('key');

    // Check if the API key is valid
    if (apiKey !== process.env.CRON_API_KEY) {
      return NextResponse.json(
        { success: false, message: 'Invalid API key' },
        { status: 401 }
      );
    }

    // Get the current time
    const currentTime = new Date().toISOString();

    // Call the sync API with the last sync time
    const syncApiKey = process.env.SYNC_API_KEY || '';
    const syncUrl = `${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/sync/stock?key=${syncApiKey}${lastSyncTime ? `&since=${encodeURIComponent(lastSyncTime)}` : ''}`;

    console.log(`Calling sync API: ${syncUrl}`);
    console.log(`Last sync time: ${lastSyncTime || 'None (first sync)'}`);

    const response = await fetch(syncUrl);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to sync stock: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();

    // Update the last sync time
    lastSyncTime = currentTime;

    const cronEndTime = Date.now();
    const cronDuration = cronEndTime - cronStartTime;

    console.log(`Stock sync completed in ${cronDuration}ms: ${result.message}`);
    console.log('New last sync time:', lastSyncTime);

    return NextResponse.json({
      success: true,
      message: `Stock sync triggered successfully in ${cronDuration}ms`,
      result,
      lastSyncTime,
      duration: cronDuration
    });
  } catch (error) {
    console.error('Error triggering stock sync:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Error triggering stock sync',
        error: error instanceof Error ? error.message : String(error),
        lastSyncTime
      },
      { status: 500 }
    );
  }
}
