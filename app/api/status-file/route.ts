import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Define the status interface
interface SyncStatus {
  lastRun: string | null;
  lastDuration: number | null;
  productsProcessed: number;
  successCount: number;
  errorCount: number;
  lastError: string | null;
}

// Define the status file path
const STATUS_FILE = path.join(process.cwd(), 'status.json');

// Get the status from the file
function getStatus(): SyncStatus {
  try {
    if (fs.existsSync(STATUS_FILE)) {
      const statusJson = fs.readFileSync(STATUS_FILE, 'utf8');
      return JSON.parse(statusJson);
    }
  } catch (error) {
    console.error('Error reading status file:', error);
  }
  
  // Return default status if file doesn't exist or can't be read
  return {
    lastRun: null,
    lastDuration: null,
    productsProcessed: 0,
    successCount: 0,
    errorCount: 0,
    lastError: null
  };
}

// Save the status to the file
function saveStatus(status: SyncStatus): void {
  try {
    fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
  } catch (error) {
    console.error('Error writing status file:', error);
  }
}

// Handle GET requests to get the status
export async function GET(request: NextRequest) {
  const status = getStatus();
  
  return NextResponse.json({
    success: true,
    status
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
    
    // Get the current status
    const status = getStatus();
    
    // Update the status
    status.lastRun = body.timestamp || new Date().toISOString();
    status.lastDuration = body.duration || null;
    status.productsProcessed = body.productsProcessed || 0;
    status.successCount = body.successCount || 0;
    status.errorCount = body.errorCount || 0;
    status.lastError = body.error || null;
    
    // Save the updated status
    saveStatus(status);
    
    return NextResponse.json({
      success: true,
      message: 'Status updated',
      status
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
