import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Explicitly set to use Edge runtime
export const runtime = 'edge'; 
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('Auth check initiated');
    const cookieStore = cookies();
    const token = cookieStore.get('auth_token');

    if (!token) {
      console.log('No auth_token cookie found');
      return NextResponse.json(
        { authenticated: false, message: 'No authentication token found' },
        { status: 401 }
      );
    }

    // Verify WordPress URL and WooCommerce credentials are set
    const wpUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL;
    const wcKey = process.env.WC_CONSUMER_KEY;
    const wcSecret = process.env.WC_CONSUMER_SECRET;
    
    if (!wpUrl || !wcKey || !wcSecret) {
      console.error('Missing WordPress URL or WooCommerce credentials');
      return NextResponse.json(
        { authenticated: false, message: 'API configuration is incomplete' },
        { status: 500 }
      );
    }

    // With our custom token approach, we need to parse the token
    // Our token format is base64(customerId:email:timestamp:randomString)
    try {
      console.log('Parsing auth token');
      const tokenData = Buffer.from(token.value, 'base64').toString('utf-8').split(':');
      
      if (tokenData.length !== 4) {
        console.error('Invalid token format');
        return NextResponse.json(
          { authenticated: false, message: 'Invalid token format' },
          { status: 401 }
        );
      }
      
      const [customerId, email, timestamp] = tokenData;
      console.log('Token contains customer ID:', customerId);
      
      // Check if token is expired (1 week)
      const tokenDate = parseInt(timestamp, 10);
      const now = Date.now();
      const weekInMs = 7 * 24 * 60 * 60 * 1000;
      
      if (now - tokenDate > weekInMs) {
        console.error('Token has expired');
        return NextResponse.json(
          { authenticated: false, message: 'Token has expired' },
          { status: 401 }
        );
      }
      
      // Verify the customer exists in WooCommerce
      console.log('Verifying customer in WooCommerce');
      const authHeader = `Basic ${Buffer.from(`${wcKey}:${wcSecret}`).toString('base64')}`;
      
      const customerEndpoint = `${wpUrl}/wp-json/wc/v3/customers/${customerId}`;
      console.log('Customer verification endpoint:', customerEndpoint);
      
      const customerResponse = await fetch(customerEndpoint, {
        headers: {
          'Authorization': authHeader
        }
      });
      
      console.log('Customer verification response status:', customerResponse.status);
      
      if (!customerResponse.ok) {
        console.error('Failed to verify customer:', await customerResponse.text());
        return NextResponse.json(
          { authenticated: false, message: 'Failed to verify customer' },
          { status: 401 }
        );
      }
      
      const customerData = await customerResponse.json();
      console.log('Customer verified');
      
      // Check that email in token matches the customer's email
      if (customerData.email !== email) {
        console.error('Token email does not match customer email');
        return NextResponse.json(
          { authenticated: false, message: 'Invalid authentication token' },
          { status: 401 }
        );
      }
      
      // Customer is authenticated
      return NextResponse.json(
        { 
          authenticated: true, 
          user: {
            id: customerData.id,
            email: customerData.email,
            first_name: customerData.first_name,
            last_name: customerData.last_name,
            username: customerData.username,
            name: `${customerData.first_name} ${customerData.last_name}`
          }
        }, 
        { 
          status: 200,
          headers: {
            'Cache-Control': 'private, no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          }
        }
      );
    } catch (tokenError) {
      console.error('Error parsing token:', tokenError);
      return NextResponse.json(
        { authenticated: false, message: 'Invalid token format', error: String(tokenError) },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Auth check error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    
    return NextResponse.json(
      { 
        authenticated: false, 
        message: 'An error occurred during authentication check',
        error: errorMessage,
        stack: errorStack
      }, 
      { status: 500 }
    );
  }
}
