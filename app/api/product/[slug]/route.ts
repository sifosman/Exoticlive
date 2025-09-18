import { NextRequest, NextResponse } from 'next/server';
import Typesense from 'typesense';
import { fetchWooProductBySlug } from '@/lib/woo';

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

// Fetch a product from Typesense by slug
async function fetchProductFromTypesense(slug: string) {
  try {
    console.log(`Fetching product with slug "${slug}" from Typesense...`);
    
    // Search for the product by slug
    const searchResponse = await typesenseClient
      .collections('products')
      .documents()
      .search({
        q: '*',
        filter_by: `slug:=${slug}`,
        per_page: 1
      });
    
    if (searchResponse.found === 0 || searchResponse.hits.length === 0) {
      throw new Error(`Product with slug "${slug}" not found in Typesense`);
    }
    
    const product = searchResponse.hits[0].document;
    console.log(`Found product in Typesense: ${product.name} (ID: ${product.id})`);
    
    return product;
  } catch (error) {
    console.error(`Error fetching product from Typesense:`, error);
    throw error;
  }
}

// Handle GET requests to fetch a product
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug;
    
    if (!slug) {
      return NextResponse.json(
        { success: false, message: 'Product slug is required' },
        { status: 400 }
      );
    }
    
    console.log(`Fetching product with slug "${slug}" from Typesense...`);
    
    // Fetch from Typesense for base product data
    let typesenseProduct = null;
    
    try {
      typesenseProduct = await fetchProductFromTypesense(slug);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error fetching from Typesense:`, errorMessage);
      
      return NextResponse.json(
        { 
          success: false, 
          message: 'Product not found in Typesense',
          error: errorMessage
        },
        { status: 404 }
      );
    }

    // Attempt to fetch WooCommerce product + variations by slug (server-side, keeps secrets safe)
    let wooData: Awaited<ReturnType<typeof fetchWooProductBySlug>> | null = null;
    try {
      wooData = await fetchWooProductBySlug(slug);
    } catch (e) {
      console.warn('WooCommerce fetch by slug failed, proceeding with Typesense-only data');
    }

    // Merge logic: prefer Woo variations (authoritative for stock/pricing), fall back to Typesense fields for UI
    const merged = { ...typesenseProduct } as any;

    if (wooData && wooData.product) {
      const wp = wooData.product as any;
      // Ensure primary price fields present on parent
      merged.price = Number(wp.price ?? merged.price ?? 0);
      merged.regular_price = Number(wp.regular_price ?? merged.regular_price ?? merged.price ?? 0);
      merged.sale_price = wp.sale_price ? Number(wp.sale_price) : (merged.sale_price ?? null);
    }

    if (wooData && Array.isArray(wooData.variations)) {
      // Map Woo variations to a consistent shape used by the UI
      merged.variations = wooData.variations.map(v => ({
        id: v.id,
        price: v.price ? Number(v.price) : undefined,
        regular_price: v.regular_price ? Number(v.regular_price) : undefined,
        sale_price: v.sale_price ? Number(v.sale_price) : null,
        stock_status: v.stock_status ?? 'outofstock',
        manage_stock: v.manage_stock ?? false,
        stock_quantity: typeof v.stock_quantity === 'number' ? v.stock_quantity : (v.stock_quantity == null ? null : Number(v.stock_quantity)),
        image: v.image?.src ? { url: v.image.src, alt: v.image.alt ?? '' } : null,
        attributes: Array.isArray(v.attributes) ? v.attributes.map(a => ({ name: a.name, option: a.option })) : []
      }));
      merged._dataSource = { ...(merged._dataSource || {}), stock: 'woocommerce', realTimeStock: true };
    }

    return NextResponse.json({
      success: true,
      product: merged,
      sources: {
        wooCommerce: !!wooData,
        typesense: true
      }
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch product',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
