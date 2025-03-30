import { NextResponse } from 'next/server';

// This endpoint receives notification callbacks from Ozow after payment
export async function POST(request: Request) {
  try {
    console.log('===== OZOW NOTIFICATION RECEIVED =====');
    
    // Try to parse both formats that Ozow might send
    const contentType = request.headers.get('content-type') || '';
    let data: any;
    
    if (contentType.includes('application/json')) {
      data = await request.json();
      console.log('JSON Notification Data:', JSON.stringify(data, null, 2));
    } else {
      // Handle form data
      const formData = await request.formData();
      data = {};
      formData.forEach((value, key) => {
        data[key] = value;
      });
      console.log('Form Data Notification:', JSON.stringify(data, null, 2));
    }
    
    // Extract transaction reference if available to check localStorage later
    const transactionReference = data.TransactionReference || 
                              data.transactionReference || 
                              request.url.split('ref=')[1];
    
    console.log('Transaction Reference from notification:', transactionReference);
    
    // Get Ozow credentials
    const siteCode = process.env.OZOW_SITE_CODE;
    const privateKey = process.env.OZOW_PRIVATE_KEY;
    
    console.log('Ozow credentials available:', {
      hasSiteCode: !!siteCode,
      hasPrivateKey: !!privateKey
    });
    
    // Respond with 200 to acknowledge receipt
    return NextResponse.json({ 
      status: 'ok',
      message: 'Notification received successfully',
      reference: transactionReference
    });
    
  } catch (error) {
    console.error('Error processing Ozow notification:', error);
    
    // Return 200 even on error so Ozow knows we received the notification
    return NextResponse.json({ 
      status: 'error',
      message: 'Error processing notification, but received',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
