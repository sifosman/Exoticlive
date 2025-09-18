import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProductContentSimplified from '@/components/ProductContentSimplified';
import { SITE_NAME } from '@/lib/constants';

// Add revalidation time (in seconds) - set to a shorter time to get fresher data
export const revalidate = 60; // Default ISR for fresher data without hammering APIs

// Generate dynamic metadata for the page
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProduct(params.slug);

  if (!product) {
    return {
      title: 'Product Not Found',
      description: 'The requested product could not be found.'
    };
  }

  return {
    title: `${product.name} | ${SITE_NAME}`,
    description: product.description || `${product.name} - Shop now at ${SITE_NAME}`
  };
}

// Fetch product data from our API endpoint
async function getProduct(slug: string) {
  console.log('DEBUG: Starting product fetch for slug:', slug);

  try {
    // Use our API endpoint to get product data from both WooCommerce and Typesense
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/product/${slug}`, {
      next: { revalidate: 60 }
    });

    if (!response.ok) {
      console.error(`DEBUG: Error fetching product from API: ${response.statusText}`);
      return null;
    }

    const data = await response.json();

    if (!data.success) {
      console.error('DEBUG: API returned error:', data.message);
      return null;
    }

    // Extract the product data
    const mergedProduct = data.product;
    console.log('DEBUG: Found product via API:', mergedProduct.name);
    console.log('DEBUG: Data sources:', data.sources);

    // Process the merged product data
    const processedProduct = {
      ...mergedProduct,
      price: Number(mergedProduct.price || 0),
      sale_price: mergedProduct.sale_price ? Number(mergedProduct.sale_price) : null,
      regular_price: Number(mergedProduct.regular_price || 0),
      stock_quantity: Number(mergedProduct.stock_quantity || 0),
      gallery_images: Array.isArray(mergedProduct.gallery_images)
        ? mergedProduct.gallery_images.map(url => ({ url, alt: '' }))
        : []
    };

    // Parse variations and attributes if needed
    let variations = [];
    let attributes = [];

    // Process variations if available
    if (mergedProduct.variations && Array.isArray(mergedProduct.variations)) {
      variations = mergedProduct.variations;
      console.log(`DEBUG: Using ${variations.length} pre-parsed variations`);
    } else if (mergedProduct.variations_json) {
      try {
        variations = JSON.parse(mergedProduct.variations_json);
        console.log(`DEBUG: Parsed ${variations.length} variations from JSON`);
      } catch (error) {
        console.error('DEBUG: Error parsing variations_json:', error);
      }
    }

    // Convert variations to expected format if needed
    variations = variations.map(variation => {
      // Ensure attributes is properly formatted
      const processedAttributes = variation.attributes || [];

      return {
        ...variation,
        id: variation.id,
        price: Number(variation.price || processedProduct.price || 0),
        regular_price: Number(variation.regular_price || processedProduct.regular_price || 0),
        sale_price: variation.sale_price ? Number(variation.sale_price) : null,
        stock_status: variation.stock_status || 'outofstock',
        stock_quantity: Number(variation.stock_quantity || 0),
        attributes: processedAttributes
      };
    });

    // Process attributes if available
    if (mergedProduct.attributes && Array.isArray(mergedProduct.attributes)) {
      attributes = mergedProduct.attributes;
      console.log(`DEBUG: Using ${attributes.length} pre-parsed attributes`);
    } else if (mergedProduct.attributes_json) {
      try {
        attributes = JSON.parse(mergedProduct.attributes_json);
        console.log(`DEBUG: Parsed ${attributes.length} attributes from JSON`);
      } catch (error) {
        console.error('DEBUG: Error parsing attributes_json:', error);
      }
    }

    // Return the processed product with variations and attributes
    return {
      ...processedProduct,
      variations,
      attributes,
      _dataSource: {
        basic: 'api',
        stock: data.sources.wooCommerce ? 'woocommerce' : 'typesense',
        attributes: 'api',
        realTimeStock: data.sources.wooCommerce // Flag to indicate if we're using real-time stock data
      }
    };
  } catch (error) {
    console.error('DEBUG: Error in getProduct:', error);
    return null;
  }
}

// Main product page component
export default async function ProductPage({
  params
}: {
  params: { slug: string };
}) {
  // Get the product data
  const product = await getProduct(params.slug);

  // If the product doesn't exist, show a 404 page
  if (!product) {
    console.error('DEBUG: Product not found, returning 404');
    notFound();
  }

  // Use the ProductContentSimplified component for all products
  console.log(`DEBUG: Rendering product ${product.name} with ProductContentSimplified`);
  return <ProductContentSimplified product={product} />;
}
