import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Typesense from 'typesense';
import fetch from 'node-fetch';
import fs from 'fs/promises';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env') });

// Create Typesense client
const typesenseClient = new Typesense.Client({
  nodes: [{
    host: process.env.NEXT_PUBLIC_TYPESENSE_HOST || 'localhost',
    port: Number(process.env.NEXT_PUBLIC_TYPESENSE_PORT) || 8108,
    protocol: process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL || 'http'
  }],
  apiKey: process.env.NEXT_PUBLIC_TYPESENSE_ADMIN_API_KEY || 'xyz123',
  connectionTimeoutSeconds: 5
});

// Schema for products collection
const productsSchema = {
  name: 'products',
  fields: [
    { name: 'name', type: 'string' },
    { name: 'description', type: 'string', optional: true },
    { name: 'short_description', type: 'string', optional: true },
    { name: 'price', type: 'float' },
    { name: 'sale_price', type: 'float', optional: true },
    { name: 'regular_price', type: 'float', optional: true },
    { name: 'stock_quantity', type: 'int32', optional: true },
    { name: 'stock_status', type: 'string', facet: true },
    { name: 'image_url', type: 'string', optional: true },
    { name: 'image_alt', type: 'string', optional: true },
    { name: 'slug', type: 'string' },
    { name: 'gallery_images', type: 'string[]', optional: true },
    // Store attributes and variations as JSON strings
    { name: 'attributes_json', type: 'string', optional: true },
    { name: 'variations_json', type: 'string', optional: true },
    // Extracted attributes for faceting
    { name: 'colors', type: 'string[]', facet: true, optional: true },
    { name: 'sizes', type: 'string[]', facet: true, optional: true },
    { name: 'categories', type: 'string[]', facet: true, optional: true },
    { name: 'tags', type: 'string[]', facet: true, optional: true }
  ],
  default_sorting_field: 'price'
};

// Helper function to validate and format image URL
function formatImageUrl(url) {
  if (!url) return '';
  try {
    // If it's already a full URL, return it
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    // If it's a relative URL, make it absolute
    if (url.startsWith('/')) {
      const baseUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://wp.exoticshoes.co.za';
      return `${baseUrl}${url}`;
    }
    return url;
  } catch (error) {
    console.error('Error formatting image URL:', error);
    return '';
  }
}

// GraphQL query to fetch all products with attributes and variations
const GET_ALL_PRODUCTS = `
  query GetAllProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          databaseId
          name
          description
          shortDescription
          slug
          __typename
          productCategories {
            nodes {
              name
            }
          }
          productTags {
            nodes {
              name
            }
          }
          ... on SimpleProduct {
            price(format: RAW)
            regularPrice(format: RAW)
            salePrice(format: RAW)
            stockStatus
            stockQuantity
            image {
              id
              sourceUrl(size: LARGE)
              altText
            }
            galleryImages {
              nodes {
                id
                sourceUrl(size: LARGE)
                altText
              }
            }
            attributes {
              nodes {
                name
                options
                variation
              }
            }
          }
          ... on VariableProduct {
            price(format: RAW)
            regularPrice(format: RAW)
            salePrice(format: RAW)
            stockStatus
            stockQuantity
            image {
              id
              sourceUrl(size: LARGE)
              altText
            }
            galleryImages {
              nodes {
                id
                sourceUrl(size: LARGE)
                altText
              }
            }
            attributes {
              nodes {
                name
                options
                variation
              }
            }
            variations {
              nodes {
                id
                databaseId
                name
                price(format: RAW)
                regularPrice(format: RAW)
                salePrice(format: RAW)
                stockStatus
                stockQuantity
                attributes {
                  nodes {
                    name
                    value
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

async function fetchAllProducts() {
  const products = [];
  let hasNextPage = true;
  let after = null;
  const first = 100; // Number of products per request

  while (hasNextPage) {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_WORDPRESS_API_URL;
      await log(` Fetching products from ${apiUrl}`, { variables: { first, after } });
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: GET_ALL_PRODUCTS,
          variables: { first, after }
        })
      });

      if (!response.ok) {
        const text = await response.text();
        await log('Response not OK:', { status: response.status, text });
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      await log('GraphQL Response:', data);
      
      if (data.errors) {
        await log('GraphQL Errors:', data.errors);
        throw new Error('GraphQL query failed');
      }

      const edges = data.data.products.edges;
      products.push(...edges.map(edge => edge.node));

      hasNextPage = data.data.products.pageInfo.hasNextPage;
      after = data.data.products.pageInfo.endCursor;

      await log(` Fetched ${edges.length} products. Total: ${products.length}`, {
        hasNextPage,
        after
      });

      // Wait a bit between requests to avoid overwhelming the server
      if (hasNextPage) {
        await wait(1000);
      }
    } catch (error) {
      await log('Error fetching products:', {
        message: error.message,
        stack: error.stack,
        response: error.response ? await error.response.text() : null
      });
      throw error;
    }
  }

  // Remove duplicates based on databaseId
  const uniqueProducts = products.reduce((acc, current) => {
    const x = acc.find(item => item.databaseId === current.databaseId);
    if (!x) {
      return acc.concat([current]);
    } else {
      return acc;
    }
  }, []);

  await log(` Removed ${products.length - uniqueProducts.length} duplicate products`);
  return uniqueProducts;
}

function getProductPrice(product) {
  let price = 0;
  let salePrice = null;
  let regularPrice = 0;

  if (product.__typename === 'VariableProduct' && product.variations?.nodes?.length > 0) {
    // For variable products, get the lowest price from variations
    const prices = product.variations.nodes.map(v => parseFloat(v.price || '0'));
    const salePrices = product.variations.nodes
      .map(v => v.salePrice ? parseFloat(v.salePrice) : null)
      .filter(p => p !== null);
    const regularPrices = product.variations.nodes.map(v => parseFloat(v.regularPrice || '0'));

    price = Math.min(...prices);
    salePrice = salePrices.length > 0 ? Math.min(...salePrices) : null;
    regularPrice = Math.min(...regularPrices);
  } else {
    // For simple products
    price = parseFloat(product.price || '0');
    salePrice = product.salePrice ? parseFloat(product.salePrice) : null;
    regularPrice = parseFloat(product.regularPrice || '0');
  }

  return { price, salePrice, regularPrice };
}

function getStockStatus(product) {
  try {
    if (product.__typename === 'VariableProduct' && product.variations?.nodes?.length > 0) {
      const hasInStockVariation = product.variations.nodes.some(v => {
        const status = (v.stockStatus || '').toLowerCase();
        return status === 'instock' || status === 'in_stock' || status === 'in stock';
      });
      const finalStatus = hasInStockVariation ? 'instock' : 'outofstock';
      console.log(`Stock status for ${product.id}: ${finalStatus}`);
      return finalStatus;
    }

    const status = (product.stockStatus || 'outofstock').toLowerCase();
    if (['instock', 'in_stock', 'in stock'].includes(status)) {
      return 'instock';
    }
    return 'outofstock';
  } catch (error) {
    console.error('Error processing stock status for product:', product?.name);
    return 'outofstock';
  }
}

// Extract facet values from product attributes
function extractAttributeValues(product) {
  const colors = [];
  const sizes = [];
  
  // Extract from product attributes
  if (product.attributes?.nodes) {
    product.attributes.nodes.forEach(attr => {
      const name = (attr.name || '').toLowerCase();
      if (name === 'color' || name === 'colour') {
        if (Array.isArray(attr.options)) {
          colors.push(...attr.options);
        }
      } else if (name === 'size') {
        if (Array.isArray(attr.options)) {
          sizes.push(...attr.options);
        }
      }
    });
  }
  
  // Extract from variations
  if (product.__typename === 'VariableProduct' && product.variations?.nodes) {
    product.variations.nodes.forEach(variation => {
      if (variation.attributes?.nodes) {
        variation.attributes.nodes.forEach(attr => {
          const name = (attr.name || '').toLowerCase();
          const value = attr.value;
          
          if (name === 'color' || name === 'colour') {
            if (value && !colors.includes(value)) {
              colors.push(value);
            }
          } else if (name === 'size') {
            if (value && !sizes.includes(value)) {
              sizes.push(value);
            }
          }
        });
      }
    });
  }
  
  return { colors, sizes };
}

// Helper function to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to log
async function log(message, data = null) {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp}: ${message}\n${data ? JSON.stringify(data, null, 2) + '\n' : ''}\n`;
  await fs.appendFile('import-products-log.txt', logMessage);
  console.log(message);
}

async function recreateCollection() {
  try {
    // Try to delete if exists
    try {
      await log(' Attempting to delete existing collection...');
      const exists = await typesenseClient.collections('products').exists();
      if (exists) {
        await typesenseClient.collections('products').delete();
        await log(' Existing collection deleted');
      } else {
        await log(' No existing collection found');
      }
    } catch (error) {
      await log(' Error checking/deleting collection:', error);
      if (error.httpStatus !== 404 && error.httpStatus !== 400) {
        throw error;
      }
    }

    // Wait a bit before creating new collection
    await wait(1000);

    // Create new collection
    await log(' Creating new collection with schema:', productsSchema);
    const result = await typesenseClient.collections().create(productsSchema);
    await log(' Collection created successfully:', result);

    // Wait a bit after creating collection
    await wait(1000);
  } catch (error) {
    await log(' Error managing collection:', error);
    if (error.response) {
      const text = await error.response.text();
      await log('Response:', text);
    }
    throw error;
  }
}

async function importProducts() {
  try {
    // First recreate the collection
    await recreateCollection();

    await log(' Fetching products from WooCommerce...');
    const products = await fetchAllProducts();
    await log(` Fetched ${products.length} products successfully!`);

    if (products.length === 0) {
      await log(' No products found to import');
      return;
    }

    await log(' Preparing products for Typesense...');
    const typesenseDocuments = products.map(product => {
      const { price, salePrice, regularPrice } = getProductPrice(product);
      const stockStatus = getStockStatus(product);
      const { colors, sizes } = extractAttributeValues(product);

      // Handle image URLs
      const imageUrl = formatImageUrl(product.image?.sourceUrl);
      
      // Extract categories
      const categories = product.productCategories?.nodes?.map(cat => cat.name) || [];
      
      // Extract tags
      const tags = product.productTags?.nodes?.map(tag => tag.name) || [];

      // Process product attributes
      const attributes = product.attributes?.nodes?.map(attr => ({
        name: attr.name,
        options: attr.options || [],
        variation: attr.variation || false
      })) || [];

      // Process variations
      const variations = product.__typename === 'VariableProduct' 
        ? (product.variations?.nodes?.map(variation => ({
            id: variation.databaseId?.toString() || '',
            name: variation.name || '',
            price: parseFloat(variation.price || '0'),
            sale_price: variation.salePrice ? parseFloat(variation.salePrice) : null,
            regular_price: parseFloat(variation.regularPrice || '0'),
            stock_status: (variation.stockStatus || '').toLowerCase(),
            stock_quantity: variation.stockQuantity || 0,
            manage_stock: variation.stockQuantity !== null && variation.stockQuantity !== undefined,
            attributes: variation.attributes?.nodes?.map(attr => ({
              name: attr.name,
              option: attr.value
            })) || []
          })) || [])
        : [];

      return {
        id: product.databaseId.toString(),
        name: product.name,
        description: product.description || '',
        short_description: product.shortDescription || '',
        price: price,
        sale_price: salePrice || 0,
        regular_price: regularPrice,
        stock_quantity: product.stockQuantity || 0,
        stock_status: stockStatus,
        image_url: imageUrl,
        image_alt: product.image?.altText || '',
        slug: product.slug,
        gallery_images: product.galleryImages?.nodes?.map(img => formatImageUrl(img.sourceUrl)) || [],
        // Store complex objects as JSON strings
        attributes_json: JSON.stringify(attributes),
        variations_json: JSON.stringify(variations),
        colors: colors,
        sizes: sizes,
        categories: categories,
        tags: tags
      };
    });

    // Log a sample product with attributes and variations
    if (typesenseDocuments.length > 0) {
      const sampleProduct = typesenseDocuments.find(p => 
        p.variations_json && p.variations_json.length > 0 && 
        JSON.parse(p.variations_json).some(v => v.attributes && v.attributes.length > 0)
      ) || typesenseDocuments[0];
      
      await log('Sample product data:', {
        id: sampleProduct.id,
        name: sampleProduct.name,
        attributes_json: sampleProduct.attributes_json,
        variationsCount: JSON.parse(sampleProduct.variations_json).length,
        sampleVariation: JSON.parse(sampleProduct.variations_json)[0]
      });
    }

    // Import products in batches
    const batchSize = 50;
    await log(` Importing products to Typesense in batches of ${batchSize}...`);
    
    let totalFailedItems = 0;
    for (let i = 0; i < typesenseDocuments.length; i += batchSize) {
      const batch = typesenseDocuments.slice(i, i + batchSize);
      await log(`Importing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(typesenseDocuments.length/batchSize)}`);
      
      const importResponse = await typesenseClient
        .collections('products')
        .documents()
        .import(batch, { action: 'create' });

      // Check for any import failures
      const failedItems = importResponse.filter(item => item.success === false);
      if (failedItems.length > 0) {
        totalFailedItems += failedItems.length;
        await log(` ${failedItems.length} items in this batch failed to import:`, failedItems);
      }

      // Wait a bit between batches
      if (i + batchSize < typesenseDocuments.length) {
        await wait(1000);
      }
    }

    if (totalFailedItems > 0) {
      await log(` Total ${totalFailedItems} items failed to import`);
    }

    await log(` Successfully imported ${products.length - totalFailedItems} products`);

  } catch (error) {
    await log(' Import failed:', error);
    throw error;
  }
}

// Run import
importProducts().catch(async error => {
  await log(' Fatal error:', error);
  process.exit(1);
});
