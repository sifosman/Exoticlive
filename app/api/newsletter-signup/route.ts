import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    // Create a transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'sameer.exoticshoes@gmail.com', // Your Gmail address
        pass: process.env.GMAIL_APP_PASSWORD // Create an app password in your Gmail settings
      }
    });

    // Send email
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

    // Also store the email in your database if needed
    // await db.insert({ email, subscribed_at: new Date() }).into('newsletter_subscribers');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Newsletter signup error:', error);
    return NextResponse.json(
      { error: 'Failed to process subscription' },
      { status: 500 }
    );
  }
}
