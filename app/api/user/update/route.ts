import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Get the auth token from the cookies
    const cookieStore = cookies();
    const authToken = cookieStore.get('auth_token')?.value;

    if (!authToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get user data from the request
    const userData = await request.json();
    
    // Required fields for the update
    const { id, email, first_name, last_name } = userData;
    
    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Prepare the customer data for update
    const customerData = {
      email,
      first_name,
      last_name,
    };
    
    // Create authentication header for WooCommerce API
    const WC_CONSUMER_KEY = process.env.WC_CONSUMER_KEY;
    const WC_CONSUMER_SECRET = process.env.WC_CONSUMER_SECRET;
    const authString = Buffer.from(`${WC_CONSUMER_KEY}:${WC_CONSUMER_SECRET}`).toString('base64');
    const authHeader = `Basic ${authString}`;
    
    // WooCommerce REST API endpoint for updating a customer
    const wordpressUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL;
    const customerEndpoint = `${wordpressUrl}/wp-json/wc/v3/customers/${id}`;
    
    // Update customer data in WooCommerce
    const response = await fetch(customerEndpoint, {
      method: 'PUT',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(customerData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error updating customer:', errorData);
      return NextResponse.json({ error: 'Failed to update user' }, { status: response.status });
    }
    
    const updatedCustomer = await response.json();
    
    // Return the updated customer data
    return NextResponse.json(updatedCustomer);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
