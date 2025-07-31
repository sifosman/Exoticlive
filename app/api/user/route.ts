import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Explicitly set to use Edge runtime which is more compatible with Next.js
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('auth_token');

    if (!token) {
      return NextResponse.json(
        { message: 'Unauthorized' },
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
        { message: 'API configuration is incomplete' },
        { status: 500 }
      );
    }

    // Fix double slash issue if it exists
    const baseUrl = wpUrl.endsWith('/') ? wpUrl.slice(0, -1) : wpUrl;
    
    // With our custom token approach, we need to parse the token
    // Our token format is base64(customerId:email:timestamp:randomString)
    try {
      console.log('Parsing auth token for user endpoint');
      const tokenData = Buffer.from(token.value, 'base64').toString('utf-8').split(':');
      
      if (tokenData.length !== 4) {
        console.error('Invalid token format');
        return NextResponse.json(
          { message: 'Invalid token format' },
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
          { message: 'Token has expired' },
          { status: 401 }
        );
      }
      
      // Get customer data directly from WooCommerce
      const authHeader = `Basic ${Buffer.from(`${wcKey}:${wcSecret}`).toString('base64')}`;
      const customerEndpoint = `${baseUrl}/wp-json/wc/v3/customers/${customerId}`;
      console.log('Fetching customer data from:', customerEndpoint);
      
      const customerResponse = await fetch(customerEndpoint, {
        headers: {
          'Authorization': authHeader
        }
      });
      
      if (!customerResponse.ok) {
        console.error('Failed to retrieve customer data:', await customerResponse.text());
        return NextResponse.json(
          { message: 'Failed to retrieve customer data' },
          { status: 401 }
        );
      }
      
      const customerData = await customerResponse.json();
      console.log('Customer data retrieved for ID:', customerData.id);
      
      // Check that email in token matches the customer's email
      if (customerData.email !== email) {
        console.error('Token email does not match customer email');
        return NextResponse.json(
          { message: 'Invalid authentication token' },
          { status: 401 }
        );
      }
      
      // Format user data with the fields expected by the account page
      const userData = {
        id: customerData.id,
        first_name: customerData.first_name || '',
        last_name: customerData.last_name || '',
        email: customerData.email,
        username: customerData.username || email.split('@')[0],
        name: `${customerData.first_name} ${customerData.last_name}`.trim() || customerData.username || email,
        avatar_url: '', // No avatar available from WooCommerce directly
        billing: customerData.billing,
        shipping: customerData.shipping,
      };

      return NextResponse.json(userData, { 
        status: 200,
        headers: {
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });
      
    } catch (tokenError) {
      console.error('Error parsing token:', tokenError);
      return NextResponse.json(
        { message: 'Invalid token format', error: String(tokenError) },
        { status: 401 }
      );
    }
    
  } catch (error) {
    console.error('Error fetching user data:', error);
    return NextResponse.json(
      { message: 'Error fetching user data' },
      { status: 500 }
    );
  }
}
