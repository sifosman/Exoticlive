import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Handle GET requests to trigger a full sync
export async function GET(request: NextRequest) {
  try {
    console.log('Received request to sync WooCommerce stock data');
    
    // Get the product ID from the query string (optional)
    const productId = request.nextUrl.searchParams.get('productId');
    
    // Build the command
    let command = 'node scripts/sync-woocommerce-stock.mjs';
    if (productId) {
      command += ` --product-id=${productId}`;
    }
    
    // Execute the sync script
    console.log(`Executing command: ${command}`);
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr) {
      console.error('Error output from sync script:', stderr);
    }
    
    console.log('Sync script output:', stdout);
    
    return NextResponse.json({
      success: true,
      message: 'WooCommerce stock data sync completed',
      details: stdout
    });
  } catch (error) {
    console.error('Error syncing WooCommerce stock data:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to sync WooCommerce stock data',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// Handle POST requests for more secure triggering
export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const { productId, apiKey } = body;
    
    // Check API key (you should set this in your .env file)
    const validApiKey = process.env.SYNC_API_KEY;
    if (validApiKey && apiKey !== validApiKey) {
      return NextResponse.json(
        { success: false, message: 'Invalid API key' },
        { status: 401 }
      );
    }
    
    // Build the command
    let command = 'node scripts/sync-woocommerce-stock.mjs';
    if (productId) {
      command += ` --product-id=${productId}`;
    }
    
    // Execute the sync script
    console.log(`Executing command: ${command}`);
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr) {
      console.error('Error output from sync script:', stderr);
    }
    
    console.log('Sync script output:', stdout);
    
    return NextResponse.json({
      success: true,
      message: 'WooCommerce stock data sync completed',
      details: stdout
    });
  } catch (error) {
    console.error('Error syncing WooCommerce stock data:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to sync WooCommerce stock data',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
