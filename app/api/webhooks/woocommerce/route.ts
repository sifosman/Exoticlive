// app/api/webhooks/woocommerce/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Typesense from 'typesense';
import crypto from 'crypto';

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

// Helper to verify WooCommerce webhook signature
function verifyWooCommerceWebhook(request: Request, signature: string, body: string): boolean {
  if (!process.env.WEBHOOK_SECRET) {
    console.error('WEBHOOK_SECRET not configured');
    return false;
  }

  const hmac = crypto.createHmac('sha256', process.env.WEBHOOK_SECRET);
  const digest = hmac.update(body).digest('base64');
  
  return signature === digest;
}

// Transform a WooCommerce product to Typesense format
function transformProduct(product: any) {
  // Extract categories
  const categories = product.categories ? 
    product.categories.map((cat: any) => cat.name) : [];

  // Extract tags
  const tags = product.tags ?
    product.tags.map((tag: any) => tag.name) : [];
    
  // Extract attributes for faceting
  const attributes = product.attributes || [];
  
  // Extract colors and sizes specifically for faceting
  const colors: string[] = [];
  const sizes: string[] = [];
  
  attributes.forEach((attr: any) => {
    if (attr.name && attr.name.toLowerCase() === 'color') {
      colors.push(...attr.options);
    }
    if (attr.name && attr.name.toLowerCase() === 'size') {
      sizes.push(...attr.options);
    }
  });
  
  // Calculate dates as timestamps for sorting
  const dateCreated = product.date_created ? 
    new Date(product.date_created).getTime() : 
    Date.now();
  
  // Check if product is on sale
  const isOnSale = product.sale_price && 
    parseFloat(product.sale_price) > 0 && 
    parseFloat(product.sale_price) < parseFloat(product.regular_price);
  
  // Get gallery images
  const galleryImages = product.images && product.images.length > 1 ?
    product.images.slice(1).map((img: any) => img.src) : [];
    
  // Extract variation information
  const variationsCount = product.variations ? product.variations.length : 0;
  const inStockVariationsCount = 0; // Would need additional API calls to determine this
    
  return {
    id: product.id.toString(),
    name: product.name,
    description: product.description ? 
      product.description.replace(/<[^>]*>?/gm, '') : '', // Strip HTML
    price: parseFloat(product.price || 0),
    sale_price: product.sale_price ? parseFloat(product.sale_price) : null,
    regular_price: product.regular_price ? parseFloat(product.regular_price) : null,
    categories,
    tags,
    attributes,
    colors,
    sizes,
    image_url: product.images && product.images.length > 0 ? 
      product.images[0].src : '',
    gallery_images: galleryImages,
    slug: product.slug,
    stock_status: product.stock_status || 'outofstock',
    stock_quantity: product.stock_quantity || 0,
    variations_count: variationsCount,
    in_stock_variations_count: inStockVariationsCount,
    is_featured: !!product.featured,
    is_on_sale: isOnSale,
    average_rating: parseFloat(product.average_rating || 0),
    date_created: dateCreated
  };
}

// Handle POST requests (when a product is created or updated)
export async function POST(request: NextRequest) {
  try {
    // Get the request body as text
    const body = await request.text();
    
    // Get the signature from the headers
    const signature = request.headers.get('X-WC-Webhook-Signature') || '';
    
    // Verify the webhook
    if (!verifyWooCommerceWebhook(request, signature, body)) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    
    const data = JSON.parse(body);
    const topic = request.headers.get('X-WC-Webhook-Topic') || '';
    
    console.log(`Received webhook: ${topic}`);
    
    // Handle product creation/update
    if (topic === 'product.created' || topic === 'product.updated') {
      const transformedProduct = transformProduct(data);
      
      // Upsert the product to Typesense
      await typesenseClient.collections('products').documents().upsert(transformedProduct);
      
      console.log(`Product ${data.id} ${topic === 'product.created' ? 'created' : 'updated'} in Typesense`);
      return NextResponse.json({ success: true });
    }
    
    // Handle product deletion
    if (topic === 'product.deleted') {
      // Delete the product from Typesense
      await typesenseClient.collections('products').documents(data.id.toString()).delete();
      
      console.log(`Product ${data.id} deleted from Typesense`);
      return NextResponse.json({ success: true });
    }
    
    // Handle other events
    return NextResponse.json({ success: true, message: 'Webhook received but no action taken' });
  } catch (error) {
    console.error('Error handling webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Handle OPTIONS requests (for CORS preflight)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type, X-WC-Webhook-Signature, X-WC-Webhook-Topic',
    },
  });
}
