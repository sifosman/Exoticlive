import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Get the email from the request
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    
    // WooCommerce REST API credentials and endpoint
    const WC_CONSUMER_KEY = process.env.WC_CONSUMER_KEY;
    const WC_CONSUMER_SECRET = process.env.WC_CONSUMER_SECRET;
    const wordpressUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL;
    
    // WordPress password reset endpoint
    const resetEndpoint = `${wordpressUrl}/wp-json/wp/v2/users/lost-password`;
    
    // Create authentication header for WooCommerce API
    const authString = Buffer.from(`${WC_CONSUMER_KEY}:${WC_CONSUMER_SECRET}`).toString('base64');
    const authHeader = `Basic ${authString}`;
    
    // Request password reset from WordPress
    const response = await fetch(resetEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_login: email }),
    });
    
    // If WordPress REST API doesn't have the lost-password endpoint,
    // use the standard WooCommerce endpoints as fallback
    if (response.status === 404) {
      // Alternative approach - use WooCommerce endpoint directly
      const wcResetEndpoint = `${wordpressUrl}/wp-json/wc/v3/customers/password-reset`;
      
      const wcResponse = await fetch(wcResetEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email }),
      });
      
      if (!wcResponse.ok) {
        const errorData = await wcResponse.json();
        console.error('Error sending reset email:', errorData);
        
        // Check if it's an "invalid email" error
        if (errorData.code === 'rest_user_invalid_email') {
          return NextResponse.json({ 
            error: 'No account was found with this email address.'
          }, { status: 400 });
        }
        
        return NextResponse.json({ 
          error: errorData.message || 'Failed to send password reset email.' 
        }, { status: wcResponse.status });
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'Password reset email has been sent. Please check your inbox.' 
      });
    }
    
    // Process the WordPress response
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error sending reset email:', errorData);
      
      // Check if it's an "invalid email" error
      if (errorData.code === 'rest_user_invalid_email') {
        return NextResponse.json({ 
          error: 'No account was found with this email address.'
        }, { status: 400 });
      }
      
      return NextResponse.json({ 
        error: errorData.message || 'Failed to send password reset email.' 
      }, { status: response.status });
    }
    
    // Return success message
    return NextResponse.json({ 
      success: true, 
      message: 'Password reset email has been sent. Please check your inbox.' 
    });
    
  } catch (error) {
    console.error('Error in forgot password:', error);
    return NextResponse.json({ 
      error: 'Failed to send password reset email. Please try again.' 
    }, { status: 500 });
  }
}
