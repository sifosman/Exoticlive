import { NextRequest, NextResponse } from 'next/server';
import Typesense from 'typesense';

// Initialize Typesense client
const typesenseClient = new Typesense.Client({
  nodes: [{
    host: process.env.TYPESENSE_HOST || process.env.NEXT_PUBLIC_TYPESENSE_HOST || '',
    port: parseInt(process.env.TYPESENSE_PORT || process.env.NEXT_PUBLIC_TYPESENSE_PORT || '443'),
    protocol: process.env.TYPESENSE_PROTOCOL || process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL || 'https'
  }],
  apiKey: process.env.TYPESENSE_API_KEY || process.env.NEXT_PUBLIC_TYPESENSE_ADMIN_API_KEY || '',
  connectionTimeoutSeconds: 10
});

// Fetch a variation from WooCommerce
async function fetchVariationFromWooCommerce(variationId: string) {
  try {
    console.log(`Fetching variation ${variationId} from WooCommerce...`);

    // WooCommerce API credentials
    const wcKey = process.env.WC_CONSUMER_KEY || '';
    const wcSecret = process.env.WC_CONSUMER_SECRET || '';
    const wpUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL || '';

    if (!wcKey || !wcSecret || !wpUrl) {
      throw new Error('WooCommerce API credentials not configured');
    }

    // Create authentication header
    const authString = Buffer.from(`${wcKey}:${wcSecret}`).toString('base64');

    // First, we need to find which product this variation belongs to
    const response = await fetch(`${wpUrl}/wp-json/wc/v3/products?per_page=100`, {
      headers: {
        'Authorization': `Basic ${authString}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.statusText}`);
    }

    const products = await response.json();

    // Find the parent product
    let parentProduct = null;
    let variation = null;

    for (const product of products) {
      if (product.type === 'variable') {
        // Fetch variations for this product
        const variationsResponse = await fetch(`${wpUrl}/wp-json/wc/v3/products/${product.id}/variations?per_page=100`, {
          headers: {
            'Authorization': `Basic ${authString}`
          }
        });

        if (variationsResponse.ok) {
          const variations = await variationsResponse.json();

          // Check if this variation belongs to this product
          const foundVariation = variations.find(v => v.id.toString() === variationId);

          if (foundVariation) {
            parentProduct = product;
            variation = foundVariation;
            console.log(`Found variation ${variationId} in product ${product.id}`);
            break;
          }
        }
      }
    }

    if (!variation) {
      throw new Error(`Variation ${variationId} not found`);
    }

    return { variation, parentProduct };
  } catch (error) {
    console.error(`Error fetching variation from WooCommerce:`, error);
    throw error;
  }
}

// Handle GET requests to fetch a variation
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const variationId = params.id;

    if (!variationId) {
      return NextResponse.json(
        { success: false, message: 'Variation ID is required' },
        { status: 400 }
      );
    }

    console.log(`Fetching variation ${variationId}...`);

    // Try to fetch from WooCommerce first for the most up-to-date data
    try {
      const { variation, parentProduct } = await fetchVariationFromWooCommerce(variationId);

      // Format the variation data
      const formattedVariation = {
        id: variation.id.toString(),
        parent_id: parentProduct.id.toString(),
        name: variation.name || parentProduct.name,
        stock_status: variation.stock_status || 'outofstock',
        stock_quantity: variation.stock_quantity || 0,
        price: variation.price,
        regular_price: variation.regular_price,
        sale_price: variation.sale_price,
        attributes: variation.attributes.map((attr: any) => ({
          name: attr.name,
          option: attr.option
        }))
      };

      // Try to update Typesense with the latest stock information
      try {
        // Find the product in Typesense
        const searchResponse = await typesenseClient
          .collections('products')
          .documents()
          .search({
            q: '*',
            filter_by: `id:=${parentProduct.id}`,
            per_page: 1
          });

        if (searchResponse.hits && searchResponse.hits.length > 0) {
          const product = searchResponse.hits[0].document;

          // Get variations from either the array or the JSON string
          let variations = [];
          if (product.variations && Array.isArray(product.variations)) {
            variations = [...product.variations];
          } else if (product.variations_json) {
            try {
              variations = JSON.parse(product.variations_json);
            } catch (error) {
              console.error('Error parsing variations_json:', error);
              variations = [];
            }
          }

          // Find and update the variation
          const variationIndex = variations.findIndex(v => v.id === variationId);

          if (variationIndex !== -1) {
            variations[variationIndex] = {
              ...variations[variationIndex],
              stock_status: variation.stock_status,
              stock_quantity: variation.stock_quantity
            };

            // Update the product in Typesense
            await typesenseClient
              .collections('products')
              .documents(parentProduct.id.toString())
              .update({
                variations: variations,
                variations_json: JSON.stringify(variations)
              });

            console.log(`Updated variation ${variationId} in Typesense`);
          }
        }
      } catch (error) {
        console.error('Error updating Typesense:', error);
        // Continue even if Typesense update fails
      }

      return NextResponse.json({
        success: true,
        variation: formattedVariation,
        sources: {
          wooCommerce: true,
          typesense: false
        }
      });
    } catch (wooError) {
      console.error('Error fetching from WooCommerce, falling back to Typesense:', wooError);

      // Fall back to Typesense
      // Find the variation in Typesense
      const searchResponse = await typesenseClient
        .collections('products')
        .documents()
        .search({
          q: '*',
          filter_by: `variations.id:=${variationId}`,
          per_page: 1
        });

      if (searchResponse.hits && searchResponse.hits.length > 0) {
        const product = searchResponse.hits[0].document;
        const variation = product.variations.find((v: any) => v.id === variationId);

        if (variation) {
          return NextResponse.json({
            success: true,
            variation: {
              ...variation,
              parent_id: product.id
            },
            sources: {
              wooCommerce: false,
              typesense: true
            }
          });
        }
      }

      throw new Error(`Variation ${variationId} not found in Typesense`);
    }
  } catch (error) {
    console.error('Error fetching variation:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
