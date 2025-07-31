import { NextResponse } from 'next/server';

// Use edge runtime for consistency with other authentication endpoints
export const runtime = 'edge';

export async function POST() {
  try {
    console.log('Logout initiated');
    
    // For our custom token-based auth, we just need to clear the auth cookie
    const response = NextResponse.json({ success: true });
    
    // Clear the auth token cookie
    response.cookies.set('auth_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // Setting to 0 will delete the cookie
      path: '/'
    });
    
    console.log('Auth token cookie cleared');
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'An error occurred during logout',
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
