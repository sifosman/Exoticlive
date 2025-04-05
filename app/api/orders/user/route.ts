import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';

// Initialize WooCommerce API
const api = new WooCommerceRestApi({
  url: process.env.NEXT_PUBLIC_WORDPRESS_URL!,
  consumerKey: process.env.WC_CONSUMER_KEY!,
  consumerSecret: process.env.WC_CONSUMER_SECRET!,
  version: 'wc/v3'
});

export async function GET(request: Request) {
  try {
    // Get the auth token from cookies
    const cookieStore = cookies();
    const token = cookieStore.get('auth_token');

    if (!token) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse the token to get the user ID
    try {
      // Log the token for debugging
      console.log('Auth token:', token.value);

      // Try different parsing approaches
      let tokenData;
      let customerId;

      try {
        // First attempt: direct JSON parse
        tokenData = JSON.parse(token.value);
        customerId = tokenData.id;
      } catch (parseError) {
        try {
          // Second attempt: base64 decode then JSON parse
          const decoded = Buffer.from(token.value, 'base64').toString();
          console.log('Decoded token:', decoded);
          tokenData = JSON.parse(decoded);
          customerId = tokenData.id;
        } catch (decodeError) {
          // Third attempt: try to extract ID using regex if JSON parsing fails
          console.log('Trying to extract ID using regex');
          const idMatch = token.value.match(/["']id["']\s*:\s*([0-9]+)/);
          if (idMatch && idMatch[1]) {
            customerId = parseInt(idMatch[1], 10);
            console.log('Extracted customer ID using regex:', customerId);
          } else {
            // Fourth attempt: try to get the user ID from the user API
            console.log('Trying to get user ID from user API');
            try {
              const userResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || request.headers.get('origin') || ''}/api/user`, {
                headers: {
                  cookie: `auth_token=${token.value}`
                }
              });

              if (userResponse.ok) {
                const userData = await userResponse.json();
                customerId = userData.id;
                console.log('Got customer ID from user API:', customerId);
              } else {
                throw new Error('Failed to get user data from API');
              }
            } catch (userApiError) {
              console.error('Error getting user from API:', userApiError);
              throw new Error('Could not extract customer ID from token or user API');
            }
          }
        }
      }

      if (!customerId) {
        return NextResponse.json(
          { message: 'Invalid token: missing customer ID' },
          { status: 401 }
        );
      }

      console.log(`Fetching orders for customer ID: ${customerId}`);

      // Fetch orders from WooCommerce
      const { data: orders } = await api.get('orders', {
        customer: customerId,
        per_page: 100, // Adjust as needed
        orderby: 'date',
        order: 'desc'
      });

      console.log(`Found ${orders.length} orders for customer ${customerId}`);

      return NextResponse.json(orders, {
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
    console.error('Error fetching user orders:', error);
    return NextResponse.json(
      { message: 'Error fetching user orders', error: String(error) },
      { status: 500 }
    );
  }
}
