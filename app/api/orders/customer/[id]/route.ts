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
  { params }: { params: { id: string } }
) {
  try {
    const customerId = params.id;
    
    if (!customerId) {
      return NextResponse.json(
        { message: 'Customer ID is required' },
        { status: 400 }
      );
    }

    console.log(`Fetching orders for customer ID: ${customerId}`);

    // Fetch orders from WooCommerce
    const { data: orders } = await api.get('orders', {
      customer: parseInt(customerId, 10),
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
  } catch (error) {
    console.error('Error fetching customer orders:', error);
    return NextResponse.json(
      { message: 'Error fetching customer orders', error: String(error) },
      { status: 500 }
    );
  }
}
