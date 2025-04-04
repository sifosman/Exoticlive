import { NextRequest, NextResponse } from 'next/server';
import { startStockUpdateListener, startStockPolling } from '@/services/stockUpdateService';

let listenerActive = false;
let unsubscribe: (() => void) | null = null;

/**
 * Start the stock update listener
 */
export async function GET(request: NextRequest) {
  if (!listenerActive) {
    try {
      // Try to start the subscription-based listener
      unsubscribe = startStockUpdateListener();
      listenerActive = true;
      return NextResponse.json({ 
        success: true, 
        message: 'Stock update listener started',
        mode: 'subscription'
      });
    } catch (error) {
      console.error('Error starting stock update listener:', error);
      
      // Fall back to polling
      unsubscribe = startStockPolling();
      listenerActive = true;
      return NextResponse.json({ 
        success: true, 
        message: 'Stock update polling started (fallback mode)',
        mode: 'polling'
      });
    }
  } else {
    return NextResponse.json({ 
      success: true, 
      message: 'Stock update listener already running'
    });
  }
}

/**
 * Restart the stock update listener
 */
export async function POST(request: NextRequest) {
  try {
    // Stop the current listener if it's running
    if (unsubscribe) {
      unsubscribe();
    }
    
    // Get the request body
    const body = await request.json();
    const { mode, interval } = body;
    
    if (mode === 'polling') {
      // Start polling
      unsubscribe = startStockPolling(interval || 60000);
      listenerActive = true;
      return NextResponse.json({ 
        success: true, 
        message: `Stock update polling started with interval ${interval || 60000}ms`,
        mode: 'polling'
      });
    } else {
      // Start subscription-based listener
      unsubscribe = startStockUpdateListener();
      listenerActive = true;
      return NextResponse.json({ 
        success: true, 
        message: 'Stock update listener restarted',
        mode: 'subscription'
      });
    }
  } catch (error) {
    console.error('Error restarting stock update listener:', error);
    return NextResponse.json({ 
      success: false, 
      message: `Error restarting stock update listener: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}

/**
 * Stop the stock update listener
 */
export async function DELETE(request: NextRequest) {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
    listenerActive = false;
    return NextResponse.json({ 
      success: true, 
      message: 'Stock update listener stopped'
    });
  } else {
    return NextResponse.json({ 
      success: true, 
      message: 'Stock update listener was not running'
    });
  }
}
