// scripts/sync-products-to-typesense.cjs
const dotenv = require('dotenv');
const path = require('path');
const Typesense = require('typesense');
const WooCommerceRestApi = require('@woocommerce/woocommerce-rest-api').default;

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Initialize WooCommerce API
const WooCommerce = new WooCommerceRestApi({
  url: process.env.NEXT_PUBLIC_WORDPRESS_URL,
  consumerKey: process.env.WC_CONSUMER_KEY,
  consumerSecret: process.env.WC_CONSUMER_SECRET,
  version: 'wc/v3'
});

// Initialize Typesense client
const client = new Typesense.Client({
  nodes: [{
    host: process.env.NEXT_PUBLIC_TYPESENSE_HOST,
    port: Number(process.env.NEXT_PUBLIC_TYPESENSE_PORT),
    protocol: process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL || 'http'
  }],
  apiKey: process.env.NEXT_PUBLIC_TYPESENSE_SEARCH_API_KEY,
  connectionTimeoutSeconds: 5
});

async function fetchAllProducts() {
  let page = 1;
  const perPage = 100;
  let allProducts = [];
  
  while (true) {
    try {
      console.log(`📦 Fetching products page ${page}...`);
      const response = await WooCommerce.get('products', {
        per_page: perPage,
        page: page,
        status: 'publish'
      });
      
      const products = response.data;
      if (products.length === 0) break;
      
      allProducts = allProducts.concat(products);
      page++;
      
      if (products.length < perPage) break;
    } catch (error) {
      console.error('❌ Error fetching products:', error.message);
      throw error;
    }
  }
  
  return allProducts;
}

function transformProduct(product) {
  // Extract categories
  const categories = product.categories.map(cat => cat.name);
  
  // Parse prices, removing currency symbols and converting to numbers
  const parsePrice = (price) => {
    if (!price) return 0;
    // Remove currency symbols and convert to number
    const numericPrice = parseFloat(price.replace(/[^0-9.]/g, ''));
    return isNaN(numericPrice) ? 0 : numericPrice;
  };

  const price = parsePrice(product.price);
  const regular_price = parsePrice(product.regular_price);
  const sale_price = product.sale_price ? parsePrice(product.sale_price) : null;

  // Skip products with no prices
  if (price === 0 && regular_price === 0) {
    console.log(`Skipping product ${product.id} (${product.name}) - No price data`);
    return null;
  }

  const transformed = {
    id: product.id.toString(),
    name: product.name,
    description: product.description,
    short_description: product.short_description,
    price: price,
    sale_price: sale_price,
    regular_price: regular_price,
    stock_quantity: product.stock_quantity,
    stock_status: product.stock_status,
    categories: categories,
    image_url: product.images[0]?.src || '',
    image_alt: product.images[0]?.alt || '',
    slug: product.slug,
    gallery_images: product.images.map(img => img.src),
    color: product.attributes.find(attr => attr.name.toLowerCase() === 'color')?.options?.[0] || null,
    size: product.attributes.find(attr => attr.name.toLowerCase() === 'size')?.options?.[0] || null,
    attributes: product.attributes.map(attr => ({
      name: attr.name,
      value: attr.options?.[0] || ''
    }))
  };

  console.log('Price transformation:', {
    original: {
      price: product.price,
      sale_price: product.sale_price,
      regular_price: product.regular_price
    },
    transformed: {
      price: transformed.price,
      sale_price: transformed.sale_price,
      regular_price: transformed.regular_price
    }
  });

  return transformed;
}

const importWithRetry = async (products, batchNumber, retries = 3) => {
  try {
    return await client.collections('products').documents().import(products);
  } catch (error) {
    if (retries > 0) {
      console.log(`Retrying batch ${batchNumber} (${retries} left)...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return importWithRetry(products, batchNumber, retries - 1);
    }
    throw error;
  }
};

async function syncProducts() {
  try {
    console.log('🔄 Starting product sync...');
    
    // Delete existing collection if it exists
    try {
      await client.collections('products').delete();
      console.log('🗑️ Deleted existing collection');
    } catch (error) {
      if (error.httpStatus !== 404) {
        throw error;
      }
    }

    // Create schema
    const schema = {
      name: 'products',
      fields: [
        { name: 'id', type: 'string' },
        { name: 'name', type: 'string' },
        { name: 'description', type: 'string', optional: true },
        { name: 'short_description', type: 'string', optional: true },
        { name: 'price', type: 'float' },
        { name: 'sale_price', type: 'float', optional: true },
        { name: 'regular_price', type: 'float' },
        { name: 'stock_quantity', type: 'int32', optional: true },
        { name: 'stock_status', type: 'string' },
        { name: 'categories', type: 'string[]' },
        { name: 'image_url', type: 'string', optional: true },
        { name: 'image_alt', type: 'string', optional: true },
        { name: 'slug', type: 'string' },
        { name: 'gallery_images', type: 'string[]', optional: true },
        { name: 'color', type: 'string', optional: true, facet: true },
        { name: 'size', type: 'string', optional: true, facet: true },
        { name: 'attributes', type: 'object[]', optional: true }
      ]
    };

    await client.collections().create(schema);
    console.log('✨ Created new collection with updated schema');
    
    // Fetch all products from WooCommerce
    const products = await fetchAllProducts();
    console.log(`✅ Fetched ${products.length} products from WooCommerce`);
    
    // Transform products for Typesense
    const typesenseDocuments = products.map(transformProduct).filter(doc => doc !== null);
    console.log(`📝 Transformed ${typesenseDocuments.length} valid products`);
    
    // Split into batches of 100
    const batches = [];
    for (let i = 0; i < typesenseDocuments.length; i += 100) {
      batches.push(typesenseDocuments.slice(i, i + 100));
    }
    
    // Import to Typesense with retry logic
    console.log('📥 Importing products to Typesense...');
    const importResponses = await Promise.all(batches.map((batch, index) => importWithRetry(batch, index + 1)));
    
    console.log('✅ Import complete!');
    console.log('📊 Import results:', {
      success: importResponses.reduce((acc, curr) => acc + curr.filter(r => r.success).length, 0),
      failed: importResponses.reduce((acc, curr) => acc + curr.filter(r => !r.success).length, 0)
    });
    
    // Log any errors
    const errors = importResponses.reduce((acc, curr) => acc.concat(curr.filter(r => !r.success)), []);
    if (errors.length > 0) {
      console.log('⚠️ Import errors:', errors);
    }
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

// Run sync
syncProducts().catch(console.error);
