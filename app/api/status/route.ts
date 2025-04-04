import { NextRequest, NextResponse } from 'next/server';

// Store the status information
interface SyncStatus {
  lastRun: string | null;
  lastDuration: number | null;
  productsProcessed: number;
  successCount: number;
  errorCount: number;
  lastError: string | null;
}

// Initialize the status
const syncStatus: SyncStatus = {
  lastRun: null,
  lastDuration: null,
  productsProcessed: 0,
  successCount: 0,
  errorCount: 0,
  lastError: null
};

// Handle GET requests to get the status
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    status: syncStatus
  });
}

// Handle POST requests to update the status
export async function POST(request: NextRequest) {
  try {
    // Get the API key from the request
    const apiKey = request.headers.get('x-api-key');
    
    // Check if the API key is valid
    if (apiKey !== process.env.SYNC_API_KEY) {
      return NextResponse.json(
        { success: false, message: 'Invalid API key' },
        { status: 401 }
      );
    }
    
    // Get the status update from the request
    const body = await request.json();
    
    // Update the status
    syncStatus.lastRun = body.timestamp || new Date().toISOString();
    syncStatus.lastDuration = body.duration || null;
    syncStatus.productsProcessed = body.productsProcessed || 0;
    syncStatus.successCount = body.successCount || 0;
    syncStatus.errorCount = body.errorCount || 0;
    syncStatus.lastError = body.error || null;
    
    return NextResponse.json({
      success: true,
      message: 'Status updated',
      status: syncStatus
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error updating status',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
