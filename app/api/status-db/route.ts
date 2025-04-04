import { NextRequest, NextResponse } from 'next/server';
import Typesense from 'typesense';

// Initialize Typesense client
const typesenseClient = new Typesense.Client({
  nodes: [{
    host: process.env.TYPESENSE_HOST || process.env.NEXT_PUBLIC_TYPESENSE_HOST || '',
    port: parseInt(process.env.TYPESENSE_PORT || process.env.NEXT_PUBLIC_TYPESENSE_PORT || '443'),
    protocol: process.env.TYPESENSE_PROTOCOL || process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL || 'https'
  }],
  apiKey: process.env.TYPESENSE_API_KEY || process.env.NEXT_PUBLIC_TYPESENSE_ADMIN_API_KEY || '',
  connectionTimeoutSeconds: 10
});

// Define the status interface
interface SyncStatus {
  id: string;
  lastRun: string | null;
  lastDuration: number | null;
  productsProcessed: number;
  successCount: number;
  errorCount: number;
  lastError: string | null;
}

// Define the status document ID
const STATUS_ID = 'sync_status';

// Get the status from Typesense
async function getStatus(): Promise<SyncStatus> {
  try {
    // Check if the collection exists
    try {
      await typesenseClient.collections('system').retrieve();
    } catch (error) {
      // Collection doesn't exist, create it
      await typesenseClient.collections().create({
        name: 'system',
        fields: [
          { name: 'id', type: 'string' },
          { name: 'lastRun', type: 'string', optional: true },
          { name: 'lastDuration', type: 'int32', optional: true },
          { name: 'productsProcessed', type: 'int32' },
          { name: 'successCount', type: 'int32' },
          { name: 'errorCount', type: 'int32' },
          { name: 'lastError', type: 'string', optional: true }
        ]
      });
    }
    
    // Try to get the status document
    try {
      const status = await typesenseClient
        .collections('system')
        .documents(STATUS_ID)
        .retrieve();
      
      return status as SyncStatus;
    } catch (error) {
      // Document doesn't exist, create it with default values
      const defaultStatus: SyncStatus = {
        id: STATUS_ID,
        lastRun: null,
        lastDuration: null,
        productsProcessed: 0,
        successCount: 0,
        errorCount: 0,
        lastError: null
      };
      
      await typesenseClient
        .collections('system')
        .documents()
        .create(defaultStatus);
      
      return defaultStatus;
    }
  } catch (error) {
    console.error('Error getting status from Typesense:', error);
    
    // Return default status if there's an error
    return {
      id: STATUS_ID,
      lastRun: null,
      lastDuration: null,
      productsProcessed: 0,
      successCount: 0,
      errorCount: 0,
      lastError: null
    };
  }
}

// Save the status to Typesense
async function saveStatus(status: Partial<SyncStatus>): Promise<void> {
  try {
    await typesenseClient
      .collections('system')
      .documents(STATUS_ID)
      .update(status);
  } catch (error) {
    console.error('Error saving status to Typesense:', error);
  }
}

// Handle GET requests to get the status
export async function GET(request: NextRequest) {
  try {
    const status = await getStatus();
    
    return NextResponse.json({
      success: true,
      status
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error getting status',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
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
    const statusUpdate = {
      lastRun: body.timestamp || new Date().toISOString(),
      lastDuration: body.duration || null,
      productsProcessed: body.productsProcessed || 0,
      successCount: body.successCount || 0,
      errorCount: body.errorCount || 0,
      lastError: body.error || null
    };
    
    // Save the updated status
    await saveStatus(statusUpdate);
    
    // Get the updated status
    const status = await getStatus();
    
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
