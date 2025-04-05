import { NextRequest, NextResponse } from 'next/server';
import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';

// Initialize WooCommerce API
const api = new WooCommerceRestApi({
  url: process.env.NEXT_PUBLIC_WORDPRESS_URL!,
  consumerKey: process.env.WC_CONSUMER_KEY!,
  consumerSecret: process.env.WC_CONSUMER_SECRET!,
  version: 'wc/v3'
});

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId;
    
    if (!userId) {
      return NextResponse.json(
        { message: 'User ID is required' },
        { status: 400 }
      );
    }

    console.log(`Fetching orders for customer ID: ${userId}`);

    // Fetch orders from WooCommerce
    const { data: orders } = await api.get('orders', {
      customer: parseInt(userId, 10),
      per_page: 100, // Adjust as needed
      orderby: 'date',
      order: 'desc'
    });

    console.log(`Found ${orders.length} orders for customer ${userId}`);

    return NextResponse.json(orders, {
      status: 200,
      headers: {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    return NextResponse.json(
      { message: 'Error fetching user orders', error: String(error) },
      { status: 500 }
    );
  }
}
