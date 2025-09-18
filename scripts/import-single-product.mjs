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
const client = new Typesense.Client({
  nodes: [{
    host: process.env.NEXT_PUBLIC_TYPESENSE_HOST || 'localhost',
    port: Number(process.env.NEXT_PUBLIC_TYPESENSE_PORT) || 8108,
    protocol: process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL || 'http'
  }],
  apiKey: process.env.NEXT_PUBLIC_TYPESENSE_ADMIN_API_KEY || 'xyz123',
  connectionTimeoutSeconds: 5
});

// Schema for products collection
const schema = {
  name: 'products',
  fields: [
    { name: 'name', type: 'string' },
    { name: 'description', type: 'string', optional: true },
    { name: 'short_description', type: 'string', optional: true },
    { name: 'price', type: 'float' },
    { name: 'sale_price', type: 'float', optional: true },
    { name: 'regular_price', type: 'float', optional: true },
    { name: 'stock_quantity', type: 'int32', optional: true },
    { name: 'stock_status', type: 'string' },
    { name: 'image_url', type: 'string', optional: true },
    { name: 'image_alt', type: 'string', optional: true },
    { name: 'slug', type: 'string' },
    { name: 'gallery_images', type: 'string[]', optional: true }
  ],
  default_sorting_field: 'price'
};

const query = `
  query {
    product(id: "oxford-elastic-ankle-boots", idType: SLUG) {
      id
      databaseId
      name
      description
      shortDescription
      slug
      ... on SimpleProduct {
        price(format: RAW)
        regularPrice(format: RAW)
        salePrice(format: RAW)
        stockStatus
        stockQuantity
      }
      image {
        sourceUrl(size: LARGE)
        altText
      }
      galleryImages {
        nodes {
          sourceUrl(size: LARGE)
          altText
        }
      }
    }
  }
`;

async function writeLog(message, data) {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp}: ${message}\n${JSON.stringify(data, null, 2)}\n\n`;
  await fs.appendFile('import-log.txt', logMessage);
}

async function importSingleProduct() {
  try {
    // Create or recreate collection
    await writeLog('Managing Typesense collection...', null);
    try {
      const exists = await client.collections('products').exists();
      if (exists) {
        await client.collections('products').delete();
        await writeLog('Deleted existing collection', null);
      }
    } catch (error) {
      if (error.httpStatus !== 404) {
        throw error;
      }
    }

    await client.collections().create(schema);
    await writeLog('Created new collection with schema', schema);

    // Fetch product from WordPress
    await writeLog('Fetching product from WordPress...', { url: process.env.NEXT_PUBLIC_WORDPRESS_API_URL });
    const response = await fetch(process.env.NEXT_PUBLIC_WORDPRESS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    await writeLog('WordPress Response:', data);

    if (!data.data.product) {
      throw new Error('Product not found');
    }

    const product = data.data.product;

    // Prepare product for Typesense
    const typesenseDocument = {
      id: product.databaseId.toString(),
      name: product.name,
      description: product.description || '',
      short_description: product.shortDescription || '',
      price: parseFloat(product.price || '0'),
      sale_price: parseFloat(product.salePrice || '0'),
      regular_price: parseFloat(product.regularPrice || '0'),
      stock_quantity: product.stockQuantity || 0,
      stock_status: product.stockStatus?.toLowerCase() || 'outofstock',
      image_url: product.image?.sourceUrl || '',
      image_alt: product.image?.altText || '',
      slug: product.slug,
      gallery_images: product.galleryImages?.nodes?.map(img => img.sourceUrl) || []
    };

    await writeLog('Typesense Document:', typesenseDocument);

    // Import to Typesense
    await writeLog('Importing to Typesense...', null);
    const importResponse = await client
      .collections('products')
      .documents()
      .create(typesenseDocument);

    await writeLog('Import successful:', importResponse);

  } catch (error) {
    await writeLog('Import failed:', {
      error: error.message,
      stack: error.stack,
      response: error.response ? await error.response.text() : null
    });
    throw error;
  }
}

// Run import
importSingleProduct();
