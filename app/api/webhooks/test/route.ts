import { NextRequest, NextResponse } from 'next/server';
import { Client as TypesenseClient } from 'typesense';

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

// Handle POST requests for testing
export async function POST(request: NextRequest) {
  try {
    console.log('=== TEST WEBHOOK: Received test webhook ===');

    // Get the request body
    const body = await request.text();
    console.log('Request body:', body);

    let data;
    try {
      data = JSON.parse(body);
    } catch (error) {
      console.error('Error parsing webhook payload:', error);
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    // Check if this is a variation update
    if (data.parent_id) {
      console.log('=== TEST WEBHOOK: Processing variation update ===');
      console.log('Variation ID:', data.id);
      console.log('Parent ID:', data.parent_id);
      console.log('Stock status:', data.stock_status);
      console.log('Stock quantity:', data.stock_quantity);

      // Get the product from Typesense
      try {
        const product = await typesenseClient
          .collections('products')
          .documents(data.parent_id.toString())
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
          console.error(`Variation ${data.id} not found in product ${data.parent_id}`);
          return NextResponse.json({
            error: 'Variation not found',
            message: `Variation ${data.id} not found in product ${data.parent_id}`
          }, { status: 404 });
        }

        console.log('Found variation at index:', variationIndex);
        console.log('Current stock status:', variations[variationIndex].stock_status);
        console.log('Current stock quantity:', variations[variationIndex].stock_quantity);

        // Update the variation
        console.log('Updating variation stock status from', variations[variationIndex].stock_status, 'to', data.stock_status);
        console.log('Updating variation stock quantity from', variations[variationIndex].stock_quantity, 'to', data.stock_quantity);

        variations[variationIndex].stock_status = data.stock_status;
        variations[variationIndex].stock_quantity = parseInt(data.stock_quantity); // Ensure it's a number

        // Log the updated variation
        console.log('Updated variation:', JSON.stringify(variations[variationIndex], null, 2));

        // Update the product in Typesense using direct fetch API
        console.log('Updating product in Typesense with new variations data using direct fetch API...');

        const updateData = {
          variations: variations,
          variations_json: JSON.stringify(variations),
          variations_count: variations.length,
          in_stock_variations_count: variations.filter(v => v.stock_status === 'instock').length
        };

        console.log('Update data:', JSON.stringify(updateData, null, 2));

        // Typesense configuration
        const typesenseHost = process.env.TYPESENSE_HOST || process.env.NEXT_PUBLIC_TYPESENSE_HOST || 'localhost';
        const typesensePort = process.env.TYPESENSE_PORT || process.env.NEXT_PUBLIC_TYPESENSE_PORT || '443';
        const typesenseProtocol = process.env.TYPESENSE_PROTOCOL || process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL || 'https';
        const typesenseApiKey = process.env.TYPESENSE_API_KEY || process.env.NEXT_PUBLIC_TYPESENSE_ADMIN_API_KEY || '';
        const typesenseCollection = 'products';

        // Send PATCH request to update the document
        const patchUrl = `${typesenseProtocol}://${typesenseHost}:${typesensePort}/collections/${typesenseCollection}/documents/${data.parent_id}`;
        console.log(`Sending PATCH request to: ${patchUrl}`);

        try {
          const patchResponse = await fetch(patchUrl, {
            method: 'PATCH',
            headers: {
              'X-TYPESENSE-API-KEY': typesenseApiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
          });

          if (!patchResponse.ok) {
            const errorText = await patchResponse.text();
            throw new Error(`Failed to update product: ${patchResponse.status} ${patchResponse.statusText} - ${errorText}`);
          }

          const updateResult = await patchResponse.json();
          console.log('Typesense update result:', JSON.stringify(updateResult, null, 2));
          console.log('Updated variation in Typesense using direct fetch API');
        } catch (error) {
          console.error('Error sending PATCH request to Typesense:', error);
          throw error;
        }

        return NextResponse.json({
          success: true,
          message: `Updated variation ${data.id} in product ${data.parent_id}`
        });
      } catch (error) {
        console.error('Error updating variation:', error);
        return NextResponse.json({
          error: 'Error updating variation',
          message: error.message
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Test webhook received'
    });
  } catch (error) {
    console.error('Error processing test webhook:', error);
    return NextResponse.json({
      error: 'Error processing test webhook',
      message: error.message
    }, { status: 500 });
  }
}
