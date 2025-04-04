import { NextRequest, NextResponse } from 'next/server';

// Store the logs in memory
const logs: string[] = [];
const MAX_LOGS = 100;

// Add a log entry
export function addLog(message: string) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}`;
  
  logs.unshift(logEntry);
  
  // Keep only the last MAX_LOGS entries
  if (logs.length > MAX_LOGS) {
    logs.length = MAX_LOGS;
  }
  
  return logEntry;
}

// Handle GET requests to get the logs
export async function GET(request: NextRequest) {
  // Get the API key from the request
  const apiKey = request.nextUrl.searchParams.get('key');
  
  // Check if the API key is valid
  if (apiKey !== process.env.ADMIN_API_KEY) {
    return NextResponse.json(
      { success: false, message: 'Invalid API key' },
      { status: 401 }
    );
  }
  
  return NextResponse.json({
    success: true,
    logs
  });
}

// Handle POST requests to add a log entry
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
    
    // Get the log message from the request
    const body = await request.json();
    const message = body.message;
    
    if (!message) {
      return NextResponse.json(
        { success: false, message: 'Log message is required' },
        { status: 400 }
      );
    }
    
    // Add the log entry
    const logEntry = addLog(message);
    
    return NextResponse.json({
      success: true,
      message: 'Log entry added',
      logEntry
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error adding log entry',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
