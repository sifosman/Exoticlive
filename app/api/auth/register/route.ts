import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Get registration data from the request
    const registrationData = await request.json();
    const { email, password, first_name, last_name } = registrationData;
    
    // Validate required fields
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }
    
    // Prepare customer data for WooCommerce
    const customerData = {
      email,
      password,
      first_name: first_name || '',
      last_name: last_name || '',
      username: email, // Use email as username
    };
    
    // WooCommerce REST API credentials and endpoint
    const WC_CONSUMER_KEY = process.env.WC_CONSUMER_KEY;
    const WC_CONSUMER_SECRET = process.env.WC_CONSUMER_SECRET;
    const wordpressUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL;
    const customerEndpoint = `${wordpressUrl}/wp-json/wc/v3/customers`;
    
    // Create authentication header for WooCommerce API
    const authString = Buffer.from(`${WC_CONSUMER_KEY}:${WC_CONSUMER_SECRET}`).toString('base64');
    const authHeader = `Basic ${authString}`;
    
    // Create the customer in WooCommerce
    const response = await fetch(customerEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(customerData),
    });
    
    const data = await response.json();
    
    // Check if the registration was successful
    if (!response.ok) {
      console.error('Error creating customer:', data);
      
      // Handle specific errors
      if (data.code === 'registration-error-email-exists') {
        return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 400 });
      }
      
      return NextResponse.json({ 
        error: data.message || 'Failed to create account. Please try again.' 
      }, { status: response.status });
    }
    
    // Return the customer data (excluding sensitive info like password)
    const { password: _, ...safeCustomerData } = data;
    return NextResponse.json(safeCustomerData);
    
  } catch (error) {
    console.error('Error registering user:', error);
    return NextResponse.json({ error: 'Failed to register. Please try again.' }, { status: 500 });
  }
}
