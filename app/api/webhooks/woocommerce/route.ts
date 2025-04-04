import { NextRequest, NextResponse } from 'next/server';
import { Client as TypesenseClient } from 'typesense';
import crypto from 'crypto';

// Initialize Typesense client
const typesenseClient = new TypesenseClient({
  nodes: [{
    host: process.env.TYPESENSE_HOST || process.env.NEXT_PUBLIC_TYPESENSE_HOST || '',
    port: parseInt(process.env.TYPESENSE_PORT || process.env.NEXT_PUBLIC_TYPESENSE_PORT || '443'),
    protocol: process.env.TYPESENSE_PROTOCOL || process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL || 'https'
  }],
  apiKey: process.env.TYPESENSE_API_KEY || process.env.NEXT_PUBLIC_TYPESENSE_ADMIN_API_KEY || '',
  connectionTimeoutSeconds: 10
});

// Verify WooCommerce webhook signature
function verifyWooCommerceWebhook(
  request: NextRequest,
  signature: string,
  payload: string
): boolean {
  // Get the webhook secret from environment variables
  const secret = process.env.WEBHOOK_SECRET || '';
  
  if (!secret) {
    console.warn('WEBHOOK_SECRET not set, skipping signature verification');
    return true;
  }
  
  if (!signature) {
    console.warn('No signature provided in request');
    return false;
  }
  
  try {
    // Create HMAC using the secret
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const calculatedSignature = hmac.digest('base64');
    
    // Compare signatures
    return signature === calculatedSignature;
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

// Handle POST requests (when a product is created or updated)
export async function POST(request: NextRequest) {
  try {
    console.log('=== WEBHOOK DEBUG: Received webhook request ===');
    console.log('Request URL:', request.url);
    console.log('Request method:', request.method);
    console.log('Headers:', JSON.stringify(Object.fromEntries(request.headers.entries()), null, 2));
    
    // Get the request body as text
    const body = await request.text();
    console.log('Request body (first 500 chars):', body.substring(0, 500) + (body.length > 500 ? '...' : ''));
    console.log('Request body length:', body.length);
    
    // Get the signature from the headers
    const signature = request.headers.get('x-wc-webhook-signature') || '';
    
    // Check if this is a test request
    const isTestRequest = request.headers.get('X-WC-Webhook-Source') === 'test-script';
    
    // For now, we'll skip signature verification to make sure the webhook works
    // We'll log the signature for debugging purposes
    console.log('=== WEBHOOK DEBUG: Checking signature verification ===');
    console.log('Signature:', signature);
    console.log('Webhook Secret:', process.env.WEBHOOK_SECRET ? 'Set' : 'Not set');
    
    // Verify the webhook signature (skip for test requests)
    if (!isTestRequest && !verifyWooCommerceWebhook(request, signature, body)) {
      console.error('Invalid webhook signature');
      
      // For test pings, we'll still accept the request
      if (body.trim() === '' || body.includes('webhook_id')) {
        console.log('Test ping detected, accepting despite invalid signature');
      } else {
        // For actual webhooks, enforce signature verification
        console.error('Rejecting webhook with invalid signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }
    
    // If this is a test request, log it
    if (isTestRequest) {
      console.log('=== WEBHOOK DEBUG: Test request detected ===');
    }
    
    let data;
    try {
      // Try to parse the body as JSON
      data = JSON.parse(body);
    } catch (error) {
      console.log('Could not parse body as JSON. This might be a test ping from WooCommerce.');
      // If this is a test ping from WooCommerce, return a success response
      if (body.trim() === '' || body.includes('webhook_id')) {
        console.log('Detected test ping from WooCommerce');
        return NextResponse.json({ success: true, message: 'Webhook test received successfully' });
      }
      
      console.error('Error parsing webhook payload:', error);
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }
    
    const topic = request.headers.get('X-WC-Webhook-Topic') || '';
    console.log(`Received webhook: ${topic}`);
    
    // If no topic is provided, this might be a test ping
    if (!topic) {
      console.log('No topic provided, this might be a test ping');
      return NextResponse.json({ success: true, message: 'Webhook received successfully' });
    }
    
    // Handle product creation/update
    if (topic === 'product.created' || topic === 'product.updated') {
      try {
        console.log(`=== WEBHOOK DEBUG: Processing ${topic} webhook for product ${data.id} ===`);
        
        // Check if this is a variation
        if (data.parent_id) {
          // This is a variation, handle it as a variation update
          console.log(`=== WEBHOOK DEBUG: This is a variation of product ${data.parent_id} ===`);
          console.log('Variation ID:', data.id);
          console.log('Parent ID:', data.parent_id);
          console.log('Stock status:', data.stock_status);
          console.log('Stock quantity:', data.stock_quantity);
          
          // Get the parent product from Typesense
          try {
            const parentId = data.parent_id;
            const product = await typesenseClient
              .collections('products')
              .documents(parentId.toString())
              .retrieve();
            
            console.log('Found product in Typesense:', product.name);
            
            // Get variations
            let variations = [];
            if (product.variations && Array.isArray(product.variations)) {
              variations = [...product.variations];
              console.log('Using variations array');
            } else if (product.variations_json) {
              try {
                variations = JSON.parse(product.variations_json);
                console.log('Using parsed variations_json');
              } catch (error) {
                console.error('Error parsing variations_json:', error);
                variations = [];
              }
            }
            
            // Find the variation
            const variationIndex = variations.findIndex(v => v.id === data.id.toString());
            
            if (variationIndex === -1) {
              console.error(`Variation ${data.id} not found in product ${parentId}`);
              return NextResponse.json({
                error: 'Variation not found',
                message: `Variation ${data.id} not found in product ${parentId}`
              }, { status: 404 });
            }
            
            console.log('Found variation at index:', variationIndex);
            console.log('Current stock status:', variations[variationIndex].stock_status);
            console.log('Current stock quantity:', variations[variationIndex].stock_quantity);
            
            // Update the variation
            variations[variationIndex].stock_status = data.stock_status;
            variations[variationIndex].stock_quantity = data.stock_quantity;
            
            // Update the product in Typesense
            await typesenseClient
              .collections('products')
              .documents(parentId.toString())
              .update({
                variations: variations,
                variations_json: JSON.stringify(variations),
                variations_count: variations.length,
                in_stock_variations_count: variations.filter(v => v.stock_status === 'instock').length
              });
            
            console.log('Updated variation in Typesense');
            
            return NextResponse.json({
              success: true,
              message: `Updated variation ${data.id} in product ${parentId}`
            });
          } catch (error) {
            console.error('Error updating variation:', error);
            return NextResponse.json({
              error: 'Error updating variation',
              message: error.message
            }, { status: 500 });
          }
        } else {
          // This is a regular product, not a variation
          console.log('This is a regular product, not a variation');
          return NextResponse.json({
            success: true,
            message: 'Regular product updates are not handled by this webhook'
          });
        }
      } catch (error) {
        console.error('Error processing product update:', error);
        return NextResponse.json({
          error: 'Error processing product update',
          message: error.message
        }, { status: 500 });
      }
    }
    
    // Handle product deletion
    if (topic === 'product.deleted') {
      try {
        console.log(`Processing product deletion for product ${data.id}`);
        
        // Delete the product from Typesense
        await typesenseClient
          .collections('products')
          .documents(data.id.toString())
          .delete();
        
        console.log(`Product ${data.id} deleted from Typesense`);
        
        return NextResponse.json({
          success: true,
          message: `Product ${data.id} deleted from Typesense`
        });
      } catch (error) {
        console.error('Error processing product deletion:', error);
        return NextResponse.json({
          error: 'Error processing product deletion',
          message: error.message
        }, { status: 500 });
      }
    }
    
    // If we get here, the webhook topic is not supported
    console.log(`Webhook topic ${topic} not supported`);
    return NextResponse.json({
      success: true,
      message: `Webhook topic ${topic} not supported`
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({
      error: 'Error processing webhook',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
