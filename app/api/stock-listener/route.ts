import { NextRequest, NextResponse } from 'next/server';

/**
 * This API endpoint has been deprecated.
 * We now use a cron job to sync stock data from WooCommerce to Typesense.
 * See /api/cron/sync-stock for the new implementation.
 */

/**
 * Start the stock update listener (deprecated)
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Stock update listener is deprecated. Using cron job instead.',
    mode: 'cron'
  });
}

/**
 * Restart the stock update listener (deprecated)
 */
export async function POST(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Stock update listener is deprecated. Using cron job instead.',
    mode: 'cron'
  });
}

/**
 * Stop the stock update listener (deprecated)
 */
export async function DELETE(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Stock update listener is deprecated. Using cron job instead.'
  });
}
