import { NextResponse } from 'next/server';

// This function handles webhooks from WooCommerce to ensure immediate stock updates
export async function POST(request: Request) {
  try {
    // Verify the webhook signature if WooCommerce provides one
    // const signature = request.headers.get('x-wc-webhook-signature');
    // Basic authentication can be added here if needed

    const payload = await request.json();
    console.log('Received WooCommerce webhook:', payload.topic);

    // Process different webhook events
    if (payload.topic === 'order.created' || payload.topic === 'order.updated') {
      const order = payload.data;
      
      // Check if stock should be manually reduced for this order
      if (order.status === 'on-hold' || order.status === 'pending') {
        await reduceStockForOrder(order);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ success: false, error: 'Webhook processing failed' }, { status: 500 });
  }
}

// Function to manually reduce stock for an order via the WooCommerce API
async function reduceStockForOrder(order: any) {
  try {
    const orderId = order.id;
    
    // Call the WooCommerce API to reduce stock for this order
    const response = await fetch(`https://wp.exoticshoes.co.za/wp-json/wc/v3/orders/${orderId}/reduce-stock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa('ck_266d630c64bfc03268cb471bdd86250b7a0b13f1:cs_d9da89b71742f6404027107dcc42b52926f7cb89')
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to reduce stock for order ${orderId}`);
    }

    console.log(`Successfully reduced stock for order ${orderId}`);
    return true;
  } catch (error) {
    console.error('Error reducing stock:', error);
    return false;
  }
}
