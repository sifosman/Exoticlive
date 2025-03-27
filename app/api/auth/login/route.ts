import { NextResponse } from 'next/server';

// Use edge runtime for consistency with other authentication endpoints
export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    console.log('Login attempt started');
    const { username, password } = await request.json();
    console.log('Login credentials received:', { username, passwordLength: password?.length || 0 });

    // Verify WordPress URL is correctly set
    const wpUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL;
    console.log('WordPress URL:', wpUrl);
    if (!wpUrl) {
      return NextResponse.json(
        { success: false, message: 'WordPress URL is not configured' },
        { status: 500 }
      );
    }

    // Fix double slash issue if it exists
    const baseUrl = wpUrl.endsWith('/') ? wpUrl.slice(0, -1) : wpUrl;
    console.log('Normalized base URL:', baseUrl);

    // Check WooCommerce credentials
    const wcKey = process.env.WC_CONSUMER_KEY;
    const wcSecret = process.env.WC_CONSUMER_SECRET;
    console.log('WooCommerce credentials exist:', { keyExists: !!wcKey, secretExists: !!wcSecret });
    
    if (!wcKey || !wcSecret) {
      console.error('WooCommerce credentials are missing');
      return NextResponse.json(
        { success: false, message: 'WooCommerce API credentials are not configured' },
        { status: 500 }
      );
    }

    // Step 1: First check if we can directly authenticate with WooCommerce using basic auth
    try {
      console.log('Attempting to authenticate with WooCommerce directly');
      
      // We'll use the system_status endpoint to check if authentication works
      const wcAuthCheckUrl = `${baseUrl}/wp-json/wc/v3/system_status`;
      console.log('WooCommerce auth check URL:', wcAuthCheckUrl);
      
      const authHeader = `Basic ${Buffer.from(`${wcKey}:${wcSecret}`).toString('base64')}`;
      console.log('WooCommerce auth header (partial):', authHeader.substring(0, 15) + '...');
      
      // Try to access a WooCommerce endpoint
      const wcCheckResponse = await fetch(wcAuthCheckUrl, {
        headers: {
          'Authorization': authHeader
        }
      });
      
      console.log('WooCommerce auth check status:', wcCheckResponse.status);
      
      if (!wcCheckResponse.ok) {
        const errorText = await wcCheckResponse.text();
        console.error('WooCommerce authentication failed:', errorText);
        return NextResponse.json(
          { success: false, message: 'Invalid WooCommerce API credentials', error: errorText },
          { status: 401 }
        );
      }
      
      console.log('WooCommerce authentication successful');
      
      // Step 2: Try multiple search approaches to find the customer
      let customers = [];
      
      // Option A: First try direct email search if it looks like an email
      if (username.includes('@')) {
        const emailEndpoint = `${baseUrl}/wp-json/wc/v3/customers?email=${encodeURIComponent(username)}`;
        console.log('Searching for customer by email:', emailEndpoint);
        
        const emailResponse = await fetch(emailEndpoint, {
          headers: {
            'Authorization': authHeader
          }
        });
        
        if (emailResponse.ok) {
          const emailResults = await emailResponse.json();
          console.log('Email search results count:', emailResults.length);
          if (emailResults.length > 0) {
            customers = emailResults;
          }
        }
      }
      
      // Option B: If email search didn't work, try general search
      if (customers.length === 0) {
        // First try a direct search without modification
        const searchEndpoint = `${baseUrl}/wp-json/wc/v3/customers?search=${encodeURIComponent(username)}`;
        console.log('Searching for customer by username:', searchEndpoint);
        
        const searchResponse = await fetch(searchEndpoint, {
          headers: {
            'Authorization': authHeader
          }
        });
        
        if (searchResponse.ok) {
          const searchResults = await searchResponse.json();
          console.log('Username search results count:', searchResults.length);
          customers = searchResults;
        }
      }
      
      // Option C: Try retrieving all customers (with limit) and filter manually
      // Only do this if previous searches failed and we have a small store
      if (customers.length === 0) {
        console.log('Trying to retrieve all customers (limited to 100)');
        const allCustomersEndpoint = `${baseUrl}/wp-json/wc/v3/customers?per_page=100`;
        
        const allCustomersResponse = await fetch(allCustomersEndpoint, {
          headers: {
            'Authorization': authHeader
          }
        });
        
        if (allCustomersResponse.ok) {
          const allCustomers = await allCustomersResponse.json();
          console.log('Total customers retrieved:', allCustomers.length);
          
          // Try to find a match by username, email, or other identifiers
          const matchedCustomers = allCustomers.filter(customer => {
            return (
              customer.email.toLowerCase() === username.toLowerCase() ||
              (customer.username && customer.username.toLowerCase() === username.toLowerCase()) ||
              `${customer.first_name} ${customer.last_name}`.toLowerCase() === username.toLowerCase()
            );
          });
          
          console.log('Manually matched customers:', matchedCustomers.length);
          if (matchedCustomers.length > 0) {
            customers = matchedCustomers;
          }
        }
      }
      
      // Check if we found any customers
      console.log('Final customers found:', customers.length);
      
      if (customers.length === 0) {
        return NextResponse.json(
          { success: false, message: 'No customer account found with these credentials' },
          { status: 401 }
        );
      }
      
      // Step 3: We're using the first matched customer
      const matchedCustomer = customers[0];
      console.log('Found matching customer:', { id: matchedCustomer.id, email: matchedCustomer.email });
      
      // Step 4: Create a custom session token
      const sessionToken = Buffer.from(
        `${matchedCustomer.id}:${matchedCustomer.email}:${Date.now()}:${generateRandomString(16)}`
      ).toString('base64');
      
      console.log('Generated session token');
      
      // Return the customer data
      const userData = {
        id: matchedCustomer.id,
        first_name: matchedCustomer.first_name,
        last_name: matchedCustomer.last_name,
        email: matchedCustomer.email,
        username: matchedCustomer.username || username,
        name: `${matchedCustomer.first_name} ${matchedCustomer.last_name}`,
        billing: matchedCustomer.billing,
        shipping: matchedCustomer.shipping
      };
      
      console.log('Login successful, returning user data');
      const response = NextResponse.json(
        { success: true, user: userData },
        { status: 200 }
      );
      
      // Set HTTP-only cookie with the session token
      response.cookies.set('auth_token', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7 // 1 week
      });
      
      return response;
      
    } catch (wcError) {
      console.error('Error authenticating with WooCommerce:', wcError);
      return NextResponse.json(
        { 
          success: false, 
          message: 'Failed to authenticate with WooCommerce API', 
          error: wcError instanceof Error ? wcError.message : String(wcError)
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Login error:', error);
    // Return detailed error information for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'An error occurred during login',
        error: errorMessage,
        stack: errorStack
      },
      { status: 500 }
    );
  }
}

// Helper function to generate random string for token
function generateRandomString(length: number): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}
