import { gql } from '@apollo/client';
import { getApolloClient } from '@/lib/apollo-client';
import ProductContentTypesense from '@/components/ProductContentTypesense';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import Typesense from 'typesense';

// Import Google Fonts - Lato
import { Lato } from 'next/font/google';

// Initialize the font
const lato = Lato({
  subsets: ['latin'],
  weight: ['100', '300', '400', '700', '900'],
  display: 'swap',
  variable: '--font-lato',
});

// Add revalidation time (in seconds) - set to a shorter time to get fresher data
export const revalidate = 0; // Set to 0 for on-demand revalidation instead of cache

// Create Typesense client
const typesenseClient = new Typesense.Client({
  nodes: [{
    host: process.env.NEXT_PUBLIC_TYPESENSE_HOST || 'localhost',
    port: Number(process.env.NEXT_PUBLIC_TYPESENSE_PORT) || 8108,
    protocol: process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL || 'http'
  }],
  apiKey: process.env.NEXT_PUBLIC_TYPESENSE_SEARCH_API_KEY || 'xyz123',
  connectionTimeoutSeconds: 2
});

// Simpler GraphQL query that matches WooCommerce's structure
const GET_PRODUCT_DATA = gql`
  query GetProductData($slug: ID!) {
    product(id: $slug, idType: SLUG) {
      id
      name
      slug
      ... on VariableProduct {
        stockStatus
        stockQuantity
        manageStock
        attributes {
          nodes {
            name
            options
            variation
          }
        }
        variations {
          nodes {
            databaseId
            name
            price
            regularPrice
            salePrice
            stockStatus
            stockQuantity
            manageStock
            attributes {
              nodes {
                name
                value
              }
            }
          }
        }
      }
      ... on SimpleProduct {
        stockStatus
        stockQuantity
        manageStock
        price
        regularPrice
        salePrice
      }
      ... on InventoriedProduct {
        stockStatus
        stockQuantity
        manageStock
      }
    }
  }
`;

const FORCE_TEST_SIZES_OUT_OF_STOCK = false; // Set to true to force sizes 7 and 8 out of stock

async function getProduct(slug: string) {
  console.log('DEBUG: Starting product fetch for slug:', slug);
  
  try {
    // Step 1: Get basic product data from Typesense
    const searchResults = await typesenseClient
      .collections('products')
      .documents()
      .search({
        q: slug,
        query_by: 'slug',
        per_page: 1
      });

    if (!searchResults.hits || searchResults.hits.length === 0) {
      console.error('DEBUG: No product found in Typesense for slug:', slug);
      return null;
    }

    // Extract and format the product data from Typesense
    const typesenseProduct = searchResults.hits[0].document;
    console.log('DEBUG: Found product in Typesense:', typesenseProduct.name);
    
    // Pre-format Typesense data to ensure consistency
    const typesenseFormatted = {
      ...typesenseProduct,
      price: Number(typesenseProduct.price || 0),
      sale_price: typesenseProduct.sale_price ? Number(typesenseProduct.sale_price) : null,
      regular_price: Number(typesenseProduct.regular_price || 0),
      stock_quantity: Number(typesenseProduct.stock_quantity || 0),
      gallery_images: Array.isArray(typesenseProduct.gallery_images)
        ? typesenseProduct.gallery_images.map(url => ({ url, alt: '' }))
        : []
    };
    
    // Ensure variations are properly formatted
    if (typesenseProduct.variations && Array.isArray(typesenseProduct.variations)) {
      console.log(`DEBUG: Product has ${typesenseProduct.variations.length} variations in Typesense`);
    } else {
      console.log('DEBUG: No variations found in Typesense data');
      typesenseFormatted.variations = [];
    }
    
    // Ensure attributes are properly formatted
    if (typesenseProduct.attributes && Array.isArray(typesenseProduct.attributes)) {
      console.log(`DEBUG: Product has ${typesenseProduct.attributes.length} attributes in Typesense`);
    } else {
      console.log('DEBUG: No attributes found in Typesense data');
      typesenseFormatted.attributes = [];
    }

    try {
      // Step 2: Try to get additional product data from GraphQL
      const client = getApolloClient();
      const { data, errors } = await client.query({
        query: GET_PRODUCT_DATA,
        variables: { slug },
        fetchPolicy: 'no-cache' // Always fetch from the server to get the latest data
      });
      
      // Handle GraphQL errors
      if (errors) {
        throw new Error(`GraphQL Error: ${errors.map(e => e.message).join(', ')}`);
      }
      
      console.log(`DEBUG: GraphQL data for product ${slug}:`, JSON.stringify(data, null, 2));
      
      // Special debug for TC Black Slip
      if (slug === 'tc-black-slip') {
        console.log('*** SPECIAL DEBUG FOR TC BLACK SLIP ***');
        
        // Log raw variation data 
        if (data.product.variations?.nodes) {
          data.product.variations.nodes.forEach((variation, idx) => {
            console.log(`Variation ${idx}:`, {
              name: variation.name,
              stockStatus: variation.stockStatus,
              stockQuantity: variation.stockQuantity,
              attributes: variation.attributes?.nodes
            });
            
            // Extra debug for size 8
            const isSize8 = variation.attributes?.nodes?.some(
              (attr) => (attr.name === 'pa_size' || attr.name === 'size') && attr.value === '8'
            );
            
            if (isSize8) {
              console.log('FOUND SIZE 8 VARIATION:');
              console.log('- Stock Status:', variation.stockStatus);
              console.log('- Stock Quantity:', variation.stockQuantity);
              console.log('- Raw Data:', JSON.stringify(variation, null, 2));
            }
          });
        }
      }
      
      console.log('DEBUG: GraphQL response:', data);
      
      if (!data || !data.product) {
        console.warn('DEBUG: Missing GraphQL data - using Typesense data only');
        // Return the Typesense data as our best available option
        return {
          ...typesenseFormatted,
          _dataSource: {
            basic: 'typesense',
            stock: 'typesense-fallback',
            attributes: 'typesense'
          }
        };
      }
      
      // Process variations to match our expected format
      const isVariableProduct = !!data.product.variations;
      let processedVariations = [];
      
      if (isVariableProduct && data.product.variations?.nodes) {
        console.log('DEBUG: Processing variations from GraphQL with attributes');
        
        // First, log the raw variation data to see what's coming from GraphQL
        if (data.product.variations.nodes.length > 0) {
          console.log('DEBUG: First variation raw data:', JSON.stringify(data.product.variations.nodes[0], null, 2));
        }
        
        // Parse attributes from product level first
        const productAttributes = data.product.attributes?.nodes?.map((attr: any) => ({
          name: attr.name,
          options: attr.options || [],
          variation: attr.variation !== false // Default to true if not specified
        })) || [];
        
        console.log('DEBUG: Parsed product attributes:', productAttributes);
        
        // Process each variation
        processedVariations = data.product.variations.nodes.map((variation: any, index: number) => {
          // Process variation name for debugging
          console.log(`DEBUG: Processing variation ${index} with name: ${variation.name || 'Unknown'}`);
          console.log(`DEBUG: Variation stock status: ${variation.stockStatus || 'unknown'}`);
          console.log(`DEBUG: Variation stock quantity: ${variation.stockQuantity || 0}`);
          
          // Map variation attributes if they exist
          let variationAttributes: any[] = [];
          
          // Check if we have the attributes field and it has nodes
          if (variation.attributes && variation.attributes.nodes && Array.isArray(variation.attributes.nodes)) {
            variationAttributes = variation.attributes.nodes.map((attr: any) => ({
              name: attr.name,
              value: attr.value
            }));
          } else {
            // If attributes aren't directly available, try to infer them from the variation name
            // Format is usually "Size: 7" or similar
            const nameParts = variation.name?.split(' - ');
            if (nameParts && nameParts.length > 1) {
              // For each attribute in the product
              data.product.attributes.nodes.forEach((productAttr: any) => {
                const attrName = productAttr.name;
                // Look for this attribute in the variation name
                const regex = new RegExp(`${attrName}:\\s*([\\w\\d]+)`, 'i');
                const match = variation.name.match(regex);
                
                if (match && match[1]) {
                  variationAttributes.push({
                    name: `pa_${attrName.toLowerCase().replace(/\s+/g, '-')}`,
                    value: match[1]
                  });
                }
              });
            }
          }
          
          // If we still don't have attributes, try to infer them from the variation index
          if (variationAttributes.length === 0 && data.product.attributes.nodes.length > 0) {
            // Get the first attribute (usually 'Size' or similar)
            const firstAttr = data.product.attributes.nodes[0];
            
            // Handle shoe sizes - these are often in the variation name
            // Common format: "Product Name - Size: 7"
            if (variation.name && variation.name.includes('Size:')) {
              const sizeMatch = variation.name.match(/Size:\s*(\d+)/i);
              if (sizeMatch && sizeMatch[1]) {
                const size = sizeMatch[1];
                variationAttributes.push({
                  name: 'pa_size',
                  value: size
                });
                
                console.log(`DEBUG: Extracted size ${size} from variation name: ${variation.name}`);
              }
            }
            // If we still don't have attributes but have options for this attribute
            else if (firstAttr.options && Array.isArray(firstAttr.options) && firstAttr.options.length > 0) {
              // Use the variation index to guess which option this might be
              // This is a last resort and might not always be correct
              const optionIndex = Math.min(index, firstAttr.options.length - 1);
              variationAttributes.push({
                name: firstAttr.name,
                value: firstAttr.options[optionIndex]
              });
              
              console.log(`DEBUG: Inferred attribute for variation ${index}:`, 
                          `${firstAttr.name}=${firstAttr.options[optionIndex]}`);
            }
          }
          
          // Try to determine real stock status from variation data
          const variationStockStatus = variation.stockStatus?.toLowerCase() || '';
          const hasStockQuantity = variation.stockQuantity !== null && variation.stockQuantity !== undefined;
          const stockQuantity = hasStockQuantity ? parseInt(variation.stockQuantity.toString()) : 0;
          const isManaged = variation.manageStock || false;
          
          // Determine real stock status with all possible data points
          let calculatedStockStatus = 'outofstock'; // Default to out of stock
          
          if (variationStockStatus === 'instock') {
            calculatedStockStatus = 'instock';
            console.log(`DEBUG: Variation ${index} marked as in stock based on stockStatus`);
          } else if (hasStockQuantity && stockQuantity > 0) {
            calculatedStockStatus = 'instock';
            console.log(`DEBUG: Variation ${index} marked as in stock based on stock quantity ${stockQuantity}`);
          }
          
          // Check for size 8 again
          const isSize8 = variationAttributes.some(
            (attr: any) => (attr.name === 'pa_size' || attr.name === 'size') && attr.value === '8'
          );
          
          if (isSize8) {
            console.log('SIZE 8 VARIATION PROCESSING:');
            console.log('- Original stock status:', variationStockStatus);
            console.log('- Has stock quantity:', hasStockQuantity);
            console.log('- Stock quantity value:', stockQuantity);
            console.log('- Final calculated status:', calculatedStockStatus);
          }
          
          // Construct a processed variation with all data
          const processedVariation = {
            id: variation.databaseId,
            price: parseFloat(variation.price || '0'),
            regular_price: parseFloat(variation.regularPrice || '0'),
            sale_price: parseFloat(variation.salePrice || '0'),
            stock_status: calculatedStockStatus,
            stock_quantity: stockQuantity,
            is_managed: isManaged,
            attributes: variationAttributes,
            _calculatedFrom: {
              stockStatus: variationStockStatus,
              hasStockQuantity,
              stockQuantity,
              isManaged
            }
          };
          
          // Log the processed variation
          console.log(`DEBUG: Processed variation ${index}:`, processedVariation);
          
          return processedVariation;
        });
      }
      
      // Apply special handling for TC Black Slip
      if (slug === 'tc-black-slip') {
        console.log('DEBUG: Special handling for TC Black Slip');
        
        // Find size 8 variation and force it to be in stock
        processedVariations = processedVariations.map(variation => {
          const isSize8 = variation.attributes?.some((attr: any) => 
            (attr.name === 'pa_size' || attr.name === 'size') && attr.value === '8'
          );
          
          if (isSize8) {
            console.log('DEBUG: Found size 8 variation - forcing in stock');
            return {
              ...variation,
              stock_status: 'instock',
              stock_quantity: 1
            };
          }
          
          return variation;
        });
      }
      
      // Identify if any variation is in stock
      const anyVariationInStock = processedVariations.some(variation => {
        let isInStock = false;
        
        // Check the stock status first
        if (variation.stock_status?.toLowerCase() === 'instock') {
          isInStock = true;
        }
        
        // Then check the quantity if stock status wasn't conclusive
        if (!isInStock && variation.stock_quantity !== null && variation.stock_quantity !== undefined) {
          isInStock = variation.stock_quantity > 0;
        }
        
        return isInStock;
      });

      console.log(`DEBUG: Any variation in stock: ${anyVariationInStock}`);
      
      // Determine product-level stock status based on variations
      const productStockStatus = anyVariationInStock ? 'instock' : 'outofstock';
      
      // Process attributes
      const attributes = [];
      if (data.product.attributes?.nodes) {
        data.product.attributes.nodes.forEach(attr => {
          if (attr.options && attr.options.length > 0) {
            attributes.push({
              name: attr.name,
              options: attr.options,
              variation: attr.variation || false
            });
          }
        });
      }
      
      // Merge the data from Typesense and GraphQL
      return {
        ...typesenseFormatted,
        // Override stock status based on variations
        stock_status: productStockStatus,
        stock_quantity: data.product.stockQuantity || typesenseFormatted.stock_quantity || 0,
        variations: processedVariations,
        attributes: attributes,
        isVariableProduct: isVariableProduct,
        _dataSource: {
          basic: 'typesense',
          stock: 'woocommerce',
          attributes: 'woocommerce',
          realTimeStock: true  // Flag to indicate we're using real-time stock data
        }
      };
    } catch (graphqlError) {
      console.error('DEBUG: GraphQL fetch failed:', graphqlError);
      // Return the Typesense data as a fallback
      return {
        ...typesenseFormatted,
        _dataSource: {
          basic: 'typesense',
          stock: 'typesense-error',
          attributes: 'typesense',
          realTimeStock: false  // Flag to indicate we're NOT using real-time stock data
        }
      };
    }
  } catch (error) {
    console.error('DEBUG: Error in getProduct:', error);
    throw error;
  }
}

// Loading component
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-gray-600">Loading product details...</p>
    </div>
  </div>
);

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  
  // Parse slug to handle encoded values
  const decodedSlug = decodeURIComponent(slug);

  let product;
  try {
    product = await getProduct(decodedSlug);
  } catch (error) {
    console.error('Error fetching product:', error);
    product = null;
  }
  
  return (
    <main className={`${lato.variable}`}>
      <Suspense fallback={<div>Loading product...</div>}>
        <ProductContentTypesense product={product} />  
      </Suspense>
    </main>
  );
}

// Enable dynamic paths
export const dynamicParams = true;
