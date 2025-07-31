// Script to refresh all WooCommerce product data in Typesense
// Including proper handling of variations and attributes

import dotenv from 'dotenv';
import fetch from 'node-fetch';
import Typesense from 'typesense';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Constants
const BATCH_SIZE = 25;
const LOG_FILE = './logs/typesense-refresh-log.txt';
const DEBUG_MODE = true;

// Ensure log directory exists
if (!fs.existsSync('./logs')) {
  fs.mkdirSync('./logs', { recursive: true });
}

// Initialize logger
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  
  console.log(logMessage);
  fs.appendFileSync(LOG_FILE, logMessage + '\n');
}

// Clear log file
fs.writeFileSync(LOG_FILE, '');
log('Starting Typesense data refresh...');

// Initialize Typesense client
const typesenseClient = new Typesense.Client({
  nodes: [
    {
      host: process.env.NEXT_PUBLIC_TYPESENSE_HOST,
      port: process.env.NEXT_PUBLIC_TYPESENSE_PORT,
      protocol: process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL,
    },
  ],
  apiKey: process.env.NEXT_PUBLIC_TYPESENSE_ADMIN_API_KEY,
  connectionTimeoutSeconds: 10,
});

// GraphQL endpoint
const WORDPRESS_API_URL = process.env.NEXT_PUBLIC_WORDPRESS_API_URL;

// Schema definition for Typesense collection
const productsSchema = {
  name: 'products',
  fields: [
    { name: 'id', type: 'string' },
    { name: 'name', type: 'string' },
    { name: 'slug', type: 'string' },
    { name: 'description', type: 'string', optional: true },
    { name: 'short_description', type: 'string', optional: true },
    { name: 'price', type: 'float' },
    { name: 'regular_price', type: 'float', optional: true },
    { name: 'sale_price', type: 'float', optional: true },
    { name: 'on_sale', type: 'bool', optional: true },
    { name: 'status', type: 'string', facet: true },
    { name: 'featured', type: 'bool', facet: true },
    { name: 'catalog_visibility', type: 'string', facet: true },
    { name: 'stock_status', type: 'string', facet: true },
    { name: 'stock_quantity', type: 'int32', optional: true },
    { name: 'categories', type: 'string[]', facet: true, optional: true },
    { name: 'tags', type: 'string[]', facet: true, optional: true },
    { name: 'image_url', type: 'string', optional: true },
    { name: 'image_alt', type: 'string', optional: true },
    { name: 'gallery_images', type: 'string[]', optional: true },
    { name: 'type', type: 'string', facet: true },
    { name: 'average_rating', type: 'float', optional: true },
    { name: 'review_count', type: 'int32', optional: true },
    { name: 'attributes_json', type: 'string', optional: true },
    { name: 'variations_json', type: 'string', optional: true },
    { name: 'related_products', type: 'string[]', optional: true },
  ],
  default_sorting_field: 'price',
};

// GraphQL Queries
const GET_PRODUCT_BY_ID = `
  query GetProductById($id: ID!) {
    product(id: $id, idType: DATABASE_ID) {
      id
      databaseId
      name
      description
      shortDescription
      slug
      productTypes {
        nodes {
          name
        }
      }
      status
      featured
      catalogVisibility
      reviewCount
      averageRating
      onSale
      stockStatus
      stockQuantity
      price(format: RAW)
      regularPrice(format: RAW)
      salePrice(format: RAW)
      image {
        sourceUrl
        altText
      }
      galleryImages {
        nodes {
          sourceUrl
          altText
        }
      }
      productCategories {
        nodes {
          name
          slug
        }
      }
      productTags {
        nodes {
          name
          slug
        }
      }
      related {
        nodes {
          id
          databaseId
          slug
        }
      }
      ... on VariableProduct {
        variations {
          nodes {
            id
            databaseId
            name
            price(format: RAW)
            regularPrice(format: RAW)
            salePrice(format: RAW)
            onSale
            stockStatus
            stockQuantity
            attributes {
              nodes {
                name
                label
                value
              }
            }
          }
        }
        attributes {
          nodes {
            name
            label
            options
            variation
            visible
          }
        }
      }
      ... on SimpleProduct {
        price(format: RAW)
        regularPrice(format: RAW)
        salePrice(format: RAW)
        onSale
        stockStatus
        stockQuantity
        attributes {
          nodes {
            name
            label
            options
            variation
            visible
          }
        }
      }
    }
  }
`;

const GET_ALL_PRODUCTS = `
  query GetAllProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        databaseId
        slug
        type
      }
    }
  }
`;

// Function to fetch GraphQL data
async function fetchGraphQL(query, variables) {
  try {
    const response = await fetch(WORDPRESS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    const json = await response.json();

    if (json.errors) {
      throw new Error(JSON.stringify(json.errors));
    }

    return json.data;
  } catch (error) {
    log(`GraphQL Error: ${error.message}`);
    throw error;
  }
}

// Function to initialize or reset the Typesense collection
async function resetTypesenseCollection() {
  log('Initializing Typesense collection...');
  
  try {
    // Delete collection if it exists
    try {
      await typesenseClient.collections('products').delete();
      log('Existing products collection deleted.');
    } catch (error) {
      log('No existing products collection found or could not delete.');
    }

    // Create collection
    await typesenseClient.collections().create(productsSchema);
    log('Products collection created successfully.');
  } catch (error) {
    log(`Error initializing Typesense collection: ${error.message}`);
    throw error;
  }
}

// Function to format product data for Typesense
function formatProductForTypesense(product) {
  if (!product) return null;

  try {
    // Get product type
    const productType = product.productTypes?.nodes?.length > 0 
      ? product.productTypes.nodes[0].name.toUpperCase() 
      : 'SIMPLE';

    // Handle gallery images
    const galleryImages = product.galleryImages?.nodes?.map(image => ({
      url: image.sourceUrl,
      alt: image.altText || product.name
    })) || [];

    // Handle categories
    const categories = product.productCategories?.nodes?.map(cat => cat.name) || [];

    // Handle tags
    const tags = product.productTags?.nodes?.map(tag => tag.name) || [];

    // Handle related products
    const relatedProducts = product.related?.nodes?.map(related => related.slug) || [];

    // Handle variable product attributes
    let attributes = product.attributes?.nodes || [];
    
    // Format attributes with options
    attributes = attributes.map(attr => ({
      name: attr.name,
      label: attr.label,
      options: attr.options || [],
      variation: attr.variation !== false, // Default to true if not specified
      visible: attr.visible !== false // Default to true if not specified
    }));

    // Format variations with attributes
    let variations = [];
    if (productType === 'VARIABLE' && product.variations?.nodes) {
      variations = product.variations.nodes.map(variation => {
        // Format variation attributes
        const variationAttributes = variation.attributes?.nodes?.map(attr => ({
          name: attr.name,
          label: attr.label,
          option: attr.value
        })) || [];

        return {
          id: variation.databaseId,
          name: variation.name,
          price: parseFloat(variation.price || '0'),
          regular_price: parseFloat(variation.regularPrice || '0'),
          sale_price: variation.salePrice ? parseFloat(variation.salePrice) : null,
          on_sale: variation.onSale || false,
          stock_status: variation.stockStatus?.toLowerCase() || 'outofstock',
          stock_quantity: variation.stockQuantity || 0,
          attributes: variationAttributes
        };
      });
    }

    // Create formatted product data
    const formattedProduct = {
      id: product.databaseId.toString(),
      name: product.name,
      slug: product.slug,
      description: product.description || '',
      short_description: product.shortDescription || '',
      price: parseFloat(product.price || '0'),
      regular_price: parseFloat(product.regularPrice || '0'),
      sale_price: product.salePrice ? parseFloat(product.salePrice) : null,
      on_sale: product.onSale || false,
      status: product.status || 'publish',
      featured: product.featured || false,
      catalog_visibility: product.catalogVisibility || 'visible',
      stock_status: (product.stockStatus || 'outofstock').toLowerCase(),
      stock_quantity: product.stockQuantity || 0,
      categories,
      tags,
      image_url: product.image?.sourceUrl || '',
      image_alt: product.image?.altText || product.name,
      gallery_images: galleryImages.map(img => img.url),
      type: productType,
      average_rating: parseFloat(product.averageRating || '0'),
      review_count: product.reviewCount || 0,
      attributes_json: JSON.stringify(attributes),
      variations_json: JSON.stringify(variations),
      related_products: relatedProducts,
    };

    return formattedProduct;
  } catch (error) {
    log(`Error formatting product ${product.name}: ${error.message}`);
    return null;
  }
}

// Function to fetch one product by ID and index it in Typesense
async function fetchAndIndexProduct(productId) {
  try {
    log(`Fetching product with ID: ${productId}...`);
    
    const data = await fetchGraphQL(GET_PRODUCT_BY_ID, { id: productId });
    
    if (!data || !data.product) {
      log(`No product found with ID: ${productId}`);
      return null;
    }
    
    const formattedProduct = formatProductForTypesense(data.product);
    
    if (!formattedProduct) {
      log(`Could not format product with ID: ${productId}`);
      return null;
    }
    
    // Debug: Log variable product info
    if (formattedProduct.type === 'VARIABLE' && DEBUG_MODE) {
      log(`Product is variable: ${formattedProduct.name}`);
      log(`Attributes: ${formattedProduct.attributes_json}`);
      log(`Variations: ${formattedProduct.variations_json}`);
    }
    
    // Add to Typesense
    await typesenseClient.collections('products').documents().upsert(formattedProduct);
    
    log(`Successfully indexed product: ${formattedProduct.name} (${formattedProduct.id})`);
    return formattedProduct;
  } catch (error) {
    log(`Error processing product ID ${productId}: ${error.message}`);
    return null;
  }
}

// Main function to process all products
async function refreshAllProducts() {
  try {
    // Reset Typesense collection
    await resetTypesenseCollection();
    
    let hasNextPage = true;
    let after = null;
    let totalProducts = 0;
    let failedProducts = 0;
    let successfulProducts = 0;

    // Fetch products in batches
    while (hasNextPage) {
      log(`Fetching batch of products after cursor: ${after || 'START'}`);
      
      const data = await fetchGraphQL(GET_ALL_PRODUCTS, {
        first: BATCH_SIZE,
        after,
      });

      if (!data || !data.products || !data.products.nodes) {
        log('No products found or invalid response. Stopping.');
        break;
      }

      const products = data.products.nodes;
      log(`Processing batch of ${products.length} products...`);
      
      // Process products sequentially to avoid overwhelming the GraphQL endpoint
      for (const product of products) {
        totalProducts++;
        const result = await fetchAndIndexProduct(product.databaseId);
        
        if (result) {
          successfulProducts++;
        } else {
          failedProducts++;
        }
      }

      // Update pagination information
      hasNextPage = data.products.pageInfo.hasNextPage;
      after = data.products.pageInfo.endCursor;
      
      log(`Batch complete. Processed ${products.length} products.`);
      log(`Progress: ${totalProducts} total, ${successfulProducts} succeeded, ${failedProducts} failed.`);
    }

    log('===== REFRESH SUMMARY =====');
    log(`Total products processed: ${totalProducts}`);
    log(`Successfully indexed: ${successfulProducts}`);
    log(`Failed to index: ${failedProducts}`);
    log('===========================');
    
    log('Refresh completed successfully.');
  } catch (error) {
    log(`Fatal error during refresh: ${error.message}`);
    process.exit(1);
  }
}

// Run the main function
refreshAllProducts()
  .then(() => {
    log('Script execution completed.');
  })
  .catch((error) => {
    log(`Unhandled error: ${error.message}`);
    process.exit(1);
  });
