import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }

    console.log(`Processing newsletter signup for: ${email}`);
    
    // Create a simplified flow that's less likely to fail
    let emailSent = false;
    let wooCommerceUpdated = false;
    
    // 1. First try to send email notification
    try {
      // Only attempt to send email if the password is configured
      if (process.env.GMAIL_APP_PASSWORD) {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: 'sameer.exoticshoes@gmail.com',
            pass: process.env.GMAIL_APP_PASSWORD
          }
        });

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
        
        emailSent = true;
        console.log('Email notification sent successfully');
      } else {
        console.warn('GMAIL_APP_PASSWORD not configured, skipping email notification');
      }
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
      // Continue with the process even if email fails
    }

    // 2. Try to update WooCommerce
    try {
      // Use environment variables if available, otherwise fall back to hardcoded values
      const consumerKey = process.env.WC_CONSUMER_KEY || 'ck_266d630c64bfc03268cb471bdd86250b7a0b13f1';
      const consumerSecret = process.env.WC_CONSUMER_SECRET || 'cs_d9da89b71742f6404027107dcc42b52926f7cb89';
      
      const wooAuth = 'Basic ' + Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
      const wooCommerceUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL 
        ? `${process.env.NEXT_PUBLIC_WORDPRESS_URL}wp-json/wc/v3`
        : 'https://wp.exoticshoes.co.za/wp-json/wc/v3';

      // Check if the email is already registered
      const checkResponse = await fetch(`${wooCommerceUrl}/customers?email=${encodeURIComponent(email)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': wooAuth
        }
      });

      if (!checkResponse.ok) {
        throw new Error(`WooCommerce API returned ${checkResponse.status}: ${await checkResponse.text()}`);
      }

      const existingCustomers = await checkResponse.json();
      
      if (existingCustomers && existingCustomers.length > 0) {
        // Update existing customer to receive newsletter
        const customerId = existingCustomers[0].id;
        
        const updateResponse = await fetch(`${wooCommerceUrl}/customers/${customerId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': wooAuth
          },
          body: JSON.stringify({
            is_subscribed_to_newsletter: true
          })
        });
        
        if (!updateResponse.ok) {
          throw new Error(`Failed to update customer: ${updateResponse.status}`);
        }
        
        console.log(`Updated existing customer ${customerId} to receive newsletter`);
      } else {
        // Create new subscriber in WooCommerce
        const createResponse = await fetch(`${wooCommerceUrl}/customers`, {
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
        
        if (!createResponse.ok) {
          throw new Error(`Failed to create customer: ${createResponse.status}`);
        }
        
        console.log('Created new newsletter subscriber in WooCommerce');
      }
      
      wooCommerceUpdated = true;
    } catch (wooError) {
      console.error('WooCommerce API error:', wooError);
      // Continue execution - we'll still consider this a success if the Newsletter API works
    }

    // 3. Try the Newsletter plugin as a fallback
    let newsletterUpdated = false;
    try {
      const newsletterResponse = await fetch('https://wp.exoticshoes.co.za/wp-json/newsletter/v1/subscribers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + Buffer.from(`${process.env.WC_CONSUMER_KEY || 'ck_266d630c64bfc03268cb471bdd86250b7a0b13f1'}:${process.env.WC_CONSUMER_SECRET || 'cs_d9da89b71742f6404027107dcc42b52926f7cb89'}`).toString('base64')
        },
        body: JSON.stringify({
          email: email,
          status: 'C', // Confirmed
          lists: ['1'], // Default list ID
        })
      });
      
      if (newsletterResponse.ok) {
        newsletterUpdated = true;
        console.log('Added to newsletter plugin successfully');
      } else {
        console.log(`Newsletter plugin responded with status ${newsletterResponse.status}`);
      }
    } catch (newsletterError) {
      console.error('Newsletter plugin API error:', newsletterError);
    }

    // If any step succeeded, consider it a success
    if (emailSent || wooCommerceUpdated || newsletterUpdated) {
      return NextResponse.json({ 
        success: true,
        message: 'Thank you for subscribing to our newsletter!' 
      });
    } else {
      // If nothing worked, throw an error to be caught by the catch block
      throw new Error('All subscription methods failed');
    }
  } catch (error) {
    console.error('Newsletter signup error:', error);
    return NextResponse.json(
      { error: 'Failed to process subscription. Please try again later.' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
