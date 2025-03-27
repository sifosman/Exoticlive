import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    // Create a transporter for email notification
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'sameer.exoticshoes@gmail.com', // Your Gmail address
        pass: process.env.GMAIL_APP_PASSWORD // Create an app password in your Gmail settings
      }
    });

    // Send email notification
    await transporter.sendMail({
      from: 'sameer.exoticshoes@gmail.com',
      to: 'sameer.exoticshoes@gmail.com',
      subject: 'New Newsletter Subscription',
      text: `New subscriber: ${email}`,
      html: `
        <h2>New Newsletter Subscription</h2>
        <p>A new user has subscribed to the newsletter:</p>
        <p><strong>Email:</strong> ${email}</p>
      `
    });

    // Register the subscriber in WooCommerce
    const wooAuth = 'Basic ' + btoa('ck_266d630c64bfc03268cb471bdd86250b7a0b13f1:cs_d9da89b71742f6404027107dcc42b52926f7cb89');
    const wooCommerceUrl = 'https://wp.exoticshoes.co.za/wp-json/wc/v3';

    // First check if the email is already registered
    const checkResponse = await fetch(`${wooCommerceUrl}/customers?email=${encodeURIComponent(email)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': wooAuth
      }
    });

    const existingCustomers = await checkResponse.json();
    
    if (existingCustomers && existingCustomers.length > 0) {
      // Update existing customer to receive newsletter
      const customerId = existingCustomers[0].id;
      
      await fetch(`${wooCommerceUrl}/customers/${customerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': wooAuth
        },
        body: JSON.stringify({
          is_subscribed_to_newsletter: true
        })
      });
    } else {
      // Create new subscriber in WooCommerce
      await fetch(`${wooCommerceUrl}/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': wooAuth
        },
        body: JSON.stringify({
          email: email,
          is_subscribed_to_newsletter: true,
          first_name: 'Newsletter',
          last_name: 'Subscriber'
        })
      });
    }

    // Additionally, use the Mailchimp/Newsletter plugin API if available
    try {
      await fetch('https://wp.exoticshoes.co.za/wp-json/newsletter/v1/subscribers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': wooAuth
        },
        body: JSON.stringify({
          email: email,
          status: 'C', // Confirmed
          lists: ['1'], // Default list ID, adjust if needed
        })
      });
    } catch (newsletterError) {
      console.error('Newsletter plugin API error (non-critical):', newsletterError);
      // Continue execution even if this fails
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Newsletter signup error:', error);
    return NextResponse.json(
      { error: 'Failed to process subscription' },
      { status: 500 }
    );
  }
}
