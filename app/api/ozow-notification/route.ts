import { NextResponse } from 'next/server';
import crypto from 'crypto';

// This function will handle incoming notifications from Ozow about payment status
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Extract relevant fields from the notification
    const {
      TransactionId,
      SiteCode,
      TransactionReference,
      Amount,
      Status,
      Hash
    } = body;

    // Verify the hash to ensure the notification is authentic
    // Retrieve private key from environment variables
    const privateKey = process.env.OZOW_PRIVATE_KEY;
    const apiKey = process.env.OZOW_API_KEY;

    if (!privateKey || !apiKey) {
      console.error('Ozow configuration missing');
      return NextResponse.json({ status: 'error', message: 'Configuration error' }, { status: 500 });
    }

    // Recreate the hash using the same algorithm as Ozow
    // 1. Concatenate values in the correct order
    const hashString = `${apiKey}${SiteCode}${TransactionId}${TransactionReference}${Amount}${Status}${privateKey}`;
    
    // 2. Convert to lowercase
    const lowercaseString = hashString.toLowerCase();
    
    // 3. Generate SHA512 hash
    const calculatedHash = crypto
      .createHash('sha512')
      .update(lowercaseString)
      .digest('hex');
    
    // Verify that the calculated hash matches the provided hash
    if (calculatedHash.toLowerCase() !== Hash.toLowerCase()) {
      console.error('Hash verification failed for Ozow notification');
      return NextResponse.json({ status: 'error', message: 'Invalid hash' }, { status: 400 });
    }
    
    // Process the notification based on status
    // Status values: Complete, Cancelled, Failed, Pending, etc.
    if (Status === 'Complete') {
      // Payment successful - update order status in WooCommerce
      await updateOrderStatus(TransactionReference, 'processing', 'Payment received via Ozow');
    } else if (Status === 'Cancelled') {
      // Payment was cancelled
      await updateOrderStatus(TransactionReference, 'cancelled', 'Payment cancelled via Ozow');
    } else if (Status === 'Failed') {
      // Payment failed
      await updateOrderStatus(TransactionReference, 'failed', 'Payment failed via Ozow');
    }
    
    // Always respond with 200 OK to Ozow to acknowledge receipt of notification
    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('Error processing Ozow notification:', error);
    // Still return 200 OK to prevent Ozow from retrying unnecessarily
    return NextResponse.json({ status: 'error', message: 'Error processing notification' });
  }
}

// Function to update WooCommerce order status
async function updateOrderStatus(reference: string, status: string, note: string) {
  try {
    // Extract order ID from reference (assuming format EXO-timestamp-orderid)
    // If your reference format is different, adjust accordingly
    const orderId = reference.split('-')[1]; // Adjust based on your reference format
    
    // Update order status in WooCommerce
    const response = await fetch(`https://wp.exoticshoes.co.za/wp-json/wc/v3/orders/${orderId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa('ck_266d630c64bfc03268cb471bdd86250b7a0b13f1:cs_d9da89b71742f6404027107dcc42b52926f7cb89')
      },
      body: JSON.stringify({
        status: status,
        customer_note: note
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update order status: ${response.statusText}`);
    }
    
    console.log(`Order ${orderId} status updated to ${status}`);
    return true;
  } catch (error) {
    console.error('Error updating order status:', error);
    return false;
  }
}
