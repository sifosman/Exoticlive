import { NextRequest, NextResponse } from 'next/server';

// Store the last sync time in memory
let lastSyncTime: string | null = null;

// Log outside the handler to see if the file is being loaded
console.log(`=== CRON JOB FILE LOADED at ${new Date().toISOString()} ===`);

// Handle GET requests to trigger the stock sync
export async function GET(request: NextRequest) {
  try {
    const cronStartTime = Date.now();
    // Log detailed information about the request
    console.log(`=== CRON JOB TRIGGERED at ${new Date().toISOString()} ===`);
    console.log('Request URL:', request.url);
    console.log('Request headers:', JSON.stringify(Object.fromEntries(request.headers.entries()), null, 2));
    console.log('Is Vercel cron:', request.headers.get('x-vercel-cron') === 'true' ? 'Yes' : 'No');
    console.log('Environment variables:');
    console.log('- CRON_API_KEY set:', !!process.env.CRON_API_KEY);
    console.log('- SYNC_API_KEY set:', !!process.env.SYNC_API_KEY);
    console.log('- TYPESENSE_HOST set:', !!process.env.TYPESENSE_HOST);
    console.log('- TYPESENSE_API_KEY set:', !!process.env.TYPESENSE_API_KEY);
    console.log('- WC_CONSUMER_KEY set:', !!process.env.WC_CONSUMER_KEY);
    console.log('- WC_CONSUMER_SECRET set:', !!process.env.WC_CONSUMER_SECRET);
    console.log('Syncing stock...');

    // Logs page has been removed

    // Get the API key from the request
    const apiKey = request.nextUrl.searchParams.get('key');
    const isVercelCron = request.headers.get('x-vercel-cron') === 'true';

    console.log('Is Vercel cron job:', isVercelCron ? 'Yes' : 'No');

    // IMPORTANT: Always allow Vercel cron jobs
    if (isVercelCron) {
      console.log('=== VERCEL CRON JOB DETECTED ===');
      console.log('Allowing request without API key');
      console.log('Vercel cron header:', request.headers.get('x-vercel-cron'));
      console.log('All headers:', JSON.stringify(Object.fromEntries(request.headers.entries()), null, 2));
    } else {
      // For all other requests, require a valid API key
      console.log('Not a Vercel cron job, checking API key');
      if (apiKey !== process.env.CRON_API_KEY) {
        console.log('Invalid API key provided');
        console.log('Expected:', process.env.CRON_API_KEY);
        console.log('Received:', apiKey);
        return NextResponse.json(
          { success: false, message: 'Invalid API key' },
          { status: 401 }
        );
      }
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

    console.log(`=== CRON JOB COMPLETED in ${cronDuration}ms ===`);
    console.log('Result message:', result.message);
    console.log('New last sync time:', lastSyncTime);
    console.log('Products processed:', result.result?.results?.length || 0);
    console.log('Successful updates:', result.result?.results?.filter((r: any) => r.success).length || 0);
    console.log('Failed updates:', result.result?.results?.filter((r: any) => !r.success).length || 0);

    // Logs page has been removed

    // Status page has been removed

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
