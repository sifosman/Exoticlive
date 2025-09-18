import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const { path } = body;
    
    if (!path) {
      return NextResponse.json(
        { success: false, message: 'Path is required' },
        { status: 400 }
      );
    }
    
    console.log(`Revalidating path: ${path}`);
    
    // Revalidate the path
    revalidatePath(path);
    
    return NextResponse.json({
      success: true,
      message: `Revalidated path: ${path}`,
      revalidated: true,
      now: Date.now()
    });
  } catch (error) {
    console.error('Error revalidating path:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get the path from the query string
    const path = request.nextUrl.searchParams.get('path');
    
    if (!path) {
      return NextResponse.json(
        { success: false, message: 'Path is required' },
        { status: 400 }
      );
    }
    
    console.log(`Revalidating path: ${path}`);
    
    // Revalidate the path
    revalidatePath(path);
    
    return NextResponse.json({
      success: true,
      message: `Revalidated path: ${path}`,
      revalidated: true,
      now: Date.now()
    });
  } catch (error) {
    console.error('Error revalidating path:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
