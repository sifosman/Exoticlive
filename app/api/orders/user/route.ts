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
      const tokenData = JSON.parse(Buffer.from(token.value, 'base64').toString());
      const customerId = tokenData.id;

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
