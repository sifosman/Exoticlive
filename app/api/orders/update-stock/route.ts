// app/api/orders/update-stock/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Typesense from 'typesense';

// Initialize Typesense Cloud client
const typesenseClient = new Typesense.Client({
  nodes: [{
    host: process.env.TYPESENSE_CLOUD_HOST || '',
    port: 443,
    protocol: 'https'
  }],
  apiKey: process.env.TYPESENSE_CLOUD_API_KEY || '',
  connectionTimeoutSeconds: 10
});

// WooCommerce API base URL and credentials
const WC_API_URL = `${process.env.NEXT_PUBLIC_WORDPRESS_URL}wp-json/wc/v3`;
const WC_CONSUMER_KEY = process.env.WC_CONSUMER_KEY || '';
const WC_CONSUMER_SECRET = process.env.WC_CONSUMER_SECRET || '';

// Authentication string for WooCommerce API
const authString = Buffer.from(`${WC_CONSUMER_KEY}:${WC_CONSUMER_SECRET}`).toString('base64');

/**
 * Updates product stock in WooCommerce
 */
async function updateWooCommerceStock(productId: number, variationId: number | null, newQuantity: number) {
  try {
    // Determine if we're updating a variation or simple product
    const endpoint = variationId 
      ? `${WC_API_URL}/products/${productId}/variations/${variationId}`
      : `${WC_API_URL}/products/${productId}`;
    
    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        stock_quantity: newQuantity,
        stock_status: newQuantity > 0 ? 'instock' : 'outofstock'
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Failed to update WooCommerce stock:', errorData);
      throw new Error(`Failed to update stock: ${response.status}`);
    }

    const updatedProduct = await response.json();
    return updatedProduct;
  } catch (error) {
    console.error('Error updating WooCommerce stock:', error);
    throw error;
  }
}

/**
 * Updates product stock in Typesense
 */
async function updateTypesenseStock(productId: string, newQuantity: number, stockStatus: string) {
  try {
    // First, get the current product document
    const product = await typesenseClient
      .collections('products')
      .documents(productId)
      .retrieve();
      
    // Update stock fields
    const updatedProduct = {
      ...product,
      stock_quantity: newQuantity,
      stock_status: stockStatus
    };
    
    // Update the product in Typesense
    await typesenseClient
      .collections('products')
      .documents()
      .upsert(updatedProduct);
      
    return updatedProduct;
  } catch (error) {
    console.error('Error updating Typesense stock:', error);
    throw error;
  }
}

/**
 * API handler for stock update requests
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate request
    if (!data.productId) {
      return NextResponse.json(
        { error: 'Missing productId' }, 
        { status: 400 }
      );
    }
    
    if (typeof data.quantity !== 'number') {
      return NextResponse.json(
        { error: 'Quantity must be a number' }, 
        { status: 400 }
      );
    }
    
    const {
      productId, 
      variationId = null, 
      quantity,
      orderReference = null
    } = data;
    
    // Update WooCommerce stock
    const updatedProduct = await updateWooCommerceStock(
      parseInt(productId), 
      variationId ? parseInt(variationId) : null, 
      quantity
    );
    
    // Update stock in Typesense to keep it in sync
    await updateTypesenseStock(
      productId.toString(),
      quantity,
      quantity > 0 ? 'instock' : 'outofstock'
    );
    
    console.log(`Stock updated for product ${productId}${variationId ? `, variation ${variationId}` : ''} to ${quantity}`);
    console.log(`Order reference: ${orderReference || 'Not provided'}`);
    
    return NextResponse.json({
      success: true,
      product: updatedProduct
    });
  } catch (error) {
    console.error('Error handling stock update:', error);
    return NextResponse.json(
      { error: 'Failed to update stock' }, 
      { status: 500 }
    );
  }
}

// Handle OPTIONS requests (for CORS preflight)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
