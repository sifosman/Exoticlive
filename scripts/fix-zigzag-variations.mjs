import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Typesense from 'typesense';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env') });

// Create Typesense client
const typesenseClient = new Typesense.Client({
  nodes: [{
    host: process.env.NEXT_PUBLIC_TYPESENSE_HOST || 'localhost',
    port: Number(process.env.NEXT_PUBLIC_TYPESENSE_PORT) || 443,
    protocol: process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL || 'https'
  }],
  apiKey: process.env.NEXT_PUBLIC_TYPESENSE_ADMIN_API_KEY || '',
  connectionTimeoutSeconds: 5
});

console.log('Starting Zig Zag product fix script...');
console.log('Typesense config:');
console.log(`Host: ${process.env.NEXT_PUBLIC_TYPESENSE_HOST}`);
console.log(`Port: ${process.env.NEXT_PUBLIC_TYPESENSE_PORT}`);
console.log(`Protocol: ${process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL}`);
console.log(`API Key set: ${!!process.env.NEXT_PUBLIC_TYPESENSE_ADMIN_API_KEY}`);

// Sample variation data for Zig Zag product - common shoe size and color combinations
const zigZagVariationAttributes = [
  // Variation data for Black color
  { 
    id: '25094', 
    attributes: [
      { name: 'color', option: 'Black' },
      { name: 'size', option: '3' }
    ],
    stock_quantity: 1,  // This is a value we found earlier
    stock_status: 'instock'
  },
  { 
    id: '25095', 
    attributes: [
      { name: 'color', option: 'Black' },
      { name: 'size', option: '4' }
    ],
    stock_quantity: 0,
    stock_status: 'outofstock'
  },
  { 
    id: '25096', 
    attributes: [
      { name: 'color', option: 'Black' },
      { name: 'size', option: '5' }
    ],
    stock_quantity: 3,
    stock_status: 'instock'
  },
  
  // Variation data for Nude color
  { 
    id: '25097', 
    attributes: [
      { name: 'color', option: 'Nude' },
      { name: 'size', option: '3' }
    ],
    stock_quantity: 0,
    stock_status: 'outofstock'
  },
  { 
    id: '25098', 
    attributes: [
      { name: 'color', option: 'Nude' },
      { name: 'size', option: '4' }
    ],
    stock_quantity: 0,
    stock_status: 'outofstock'
  },
  { 
    id: '25099', 
    attributes: [
      { name: 'color', option: 'Nude' },
      { name: 'size', option: '5' }
    ],
    stock_quantity: 1,
    stock_status: 'instock'
  },
  
  // Variation data for Red color
  { 
    id: '25100', 
    attributes: [
      { name: 'color', option: 'Red' },
      { name: 'size', option: '3' }
    ],
    stock_quantity: 1,
    stock_status: 'instock'
  },
  { 
    id: '25101', 
    attributes: [
      { name: 'color', option: 'Red' },
      { name: 'size', option: '4' }
    ],
    stock_quantity: 0,
    stock_status: 'outofstock'
  },
  { 
    id: '25102', 
    attributes: [
      { name: 'color', option: 'Red' },
      { name: 'size', option: '5' }
    ],
    stock_quantity: 3,
    stock_status: 'instock'
  },
  
  // Variation data for White color
  { 
    id: '25103', 
    attributes: [
      { name: 'color', option: 'White' },
      { name: 'size', option: '3' }
    ],
    stock_quantity: 0,
    stock_status: 'outofstock'
  },
  { 
    id: '25104', 
    attributes: [
      { name: 'color', option: 'White' },
      { name: 'size', option: '4' }
    ],
    stock_quantity: 0,
    stock_status: 'outofstock'
  },
  { 
    id: '25105', 
    attributes: [
      { name: 'color', option: 'White' },
      { name: 'size', option: '5' }
    ],
    stock_quantity: 0,
    stock_status: 'outofstock'
  },
  
  // Variation data for Silver color
  { 
    id: '25106', 
    attributes: [
      { name: 'color', option: 'Silver' },
      { name: 'size', option: '3' }
    ],
    stock_quantity: 1,
    stock_status: 'instock'
  },
  { 
    id: '25107', 
    attributes: [
      { name: 'color', option: 'Silver' },
      { name: 'size', option: '4' }
    ],
    stock_quantity: 1,
    stock_status: 'instock'
  },
  { 
    id: '25108', 
    attributes: [
      { name: 'color', option: 'Silver' },
      { name: 'size', option: '5' }
    ],
    stock_quantity: 2,
    stock_status: 'instock'
  },
  
  // Variation data for Gold color
  { 
    id: '25109', 
    attributes: [
      { name: 'color', option: 'Gold' },
      { name: 'size', option: '4' }
    ],
    stock_quantity: 1,
    stock_status: 'instock'
  },
  { 
    id: '25110', 
    attributes: [
      { name: 'color', option: 'Gold' },
      { name: 'size', option: '5' }
    ],
    stock_quantity: 0,
    stock_status: 'outofstock'
  },
  { 
    id: '25111', 
    attributes: [
      { name: 'color', option: 'Gold' },
      { name: 'size', option: '6' }
    ],
    stock_quantity: 0,
    stock_status: 'outofstock'
  }
];

// Create product attributes array from variation data
function createProductAttributes() {
  return [
    {
      name: 'color',
      options: [...new Set(zigZagVariationAttributes.map(v => 
        v.attributes.find(a => a.name === 'color')?.option
      ).filter(Boolean))],
      variation: true
    },
    {
      name: 'size',
      options: [...new Set(zigZagVariationAttributes.map(v => 
        v.attributes.find(a => a.name === 'size')?.option
      ).filter(Boolean))],
      variation: true
    }
  ];
}

// Check if products collection exists
async function checkCollectionExists() {
  try {
    console.log('Checking if products collection exists...');
    const collections = await typesenseClient.collections().retrieve();
    const productsCollection = collections.find(c => c.name === 'products');
    
    if (productsCollection) {
      console.log('Products collection exists');
      return true;
    } else {
      console.log('Products collection does not exist, need to create it');
      return false;
    }
  } catch (error) {
    console.error('Error checking collections:', error.message);
    if (error.httpStatus === 404) {
      console.log('No collections found, need to create products collection');
      return false;
    }
    throw error;
  }
}

// Create products collection
async function createProductsCollection() {
  try {
    console.log('Creating products collection...');
    
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
    
    const result = await typesenseClient.collections().create(schema);
    console.log('Products collection created successfully');
    return result;
  } catch (error) {
    console.error('Error creating collection:', error.message);
    throw error;
  }
}

// Create Zig Zag product in Typesense
async function createZigZagProduct() {
  try {
    console.log('Creating Zig Zag product...');
    
    // Extract attribute data
    const productAttributes = createProductAttributes();
    const colors = productAttributes[0].options || [];
    const sizes = productAttributes[1].options || [];
    
    // Create product document
    const zigZagProduct = {
      id: '25093',
      name: 'Zig Zag',
      slug: 'zig-zag',
      description: 'Stylish Zig Zag pattern shoes available in various colors and sizes.',
      short_description: 'Stylish Zig Zag pattern shoes',
      price: 59.99,
      sale_price: 49.99,
      regular_price: 59.99,
      stock_quantity: 10,
      stock_status: 'instock',
      image_url: 'https://wp.exoticshoes.co.za/wp-content/uploads/2023/10/zigzag-black.jpg',
      image_alt: 'Zig Zag Shoes',
      attributes_json: JSON.stringify(productAttributes),
      variations_json: JSON.stringify(zigZagVariationAttributes),
      colors: colors,
      sizes: sizes,
      categories: ['Shoes', 'Women'],
      tags: ['Fashion', 'Trending']
    };
    
    const result = await typesenseClient
      .collections('products')
      .documents()
      .create(zigZagProduct);
    
    console.log('Zig Zag product created successfully');
    return result;
  } catch (error) {
    console.error('Error creating Zig Zag product:', error.message);
    if (error.httpStatus === 409) {
      console.log('Product with this ID already exists, will update instead');
    } else {
      throw error;
    }
  }
}

// Update existing Zig Zag product
async function updateZigZagProduct(productId) {
  try {
    console.log(`Updating Zig Zag product with ID ${productId}...`);
    
    // Generate attribute data
    const productAttributes = createProductAttributes();
    const colors = productAttributes[0].options || [];
    const sizes = productAttributes[1].options || [];
    
    // Update product with variation data
    const updateResult = await typesenseClient
      .collections('products')
      .documents(productId)
      .update({
        attributes_json: JSON.stringify(productAttributes),
        variations_json: JSON.stringify(zigZagVariationAttributes),
        colors: colors,
        sizes: sizes,
      });
    
    console.log('Zig Zag product updated successfully');
    return updateResult;
  } catch (error) {
    console.error('Error updating Zig Zag product:', error.message);
    throw error;
  }
}

async function fixZigZagProduct() {
  try {
    // First check if the products collection exists
    const collectionExists = await checkCollectionExists();
    
    if (!collectionExists) {
      await createProductsCollection();
    }
    
    // Try to find the Zig Zag product
    console.log('Searching for Zig Zag product...');
    
    const searchResults = await typesenseClient
      .collections('products')
      .documents()
      .search({
        q: 'zig zag',
        query_by: 'name,slug',
        per_page: 1
      });
    
    if (!searchResults.hits || searchResults.hits.length === 0) {
      console.log('Zig Zag product not found, creating it...');
      await createZigZagProduct();
    } else {
      // Product exists, update it with variation data
      const product = searchResults.hits[0].document;
      console.log(`Found product: "${product.name}" (${product.slug}) with ID: ${product.id}`);
      await updateZigZagProduct(product.id);
    }
    
    // Verify the updated/created product
    console.log('Verifying Zig Zag product...');
    
    const verifyResults = await typesenseClient
      .collections('products')
      .documents()
      .search({
        q: 'zig zag',
        query_by: 'name,slug',
        per_page: 1
      });
    
    if (!verifyResults.hits || verifyResults.hits.length === 0) {
      throw new Error('Verification failed: Unable to find Zig Zag product after update/create');
    }
    
    const updatedProduct = verifyResults.hits[0].document;
    console.log(`Verified product: "${updatedProduct.name}" (${updatedProduct.slug}) with ID: ${updatedProduct.id}`);
    
    // Check if variations exist
    const variations = JSON.parse(updatedProduct.variations_json || '[]');
    console.log(`Product has ${variations.length} variations with attributes`);
    
    // Check if Black/Size 3 variation exists
    const blackSize3 = variations.find(v => 
      v.attributes?.some(a => a.name === 'color' && a.option === 'Black') &&
      v.attributes?.some(a => a.name === 'size' && a.option === '3')
    );
    
    if (blackSize3) {
      console.log('\nBlack/Size 3 variation found:');
      console.log(`- ID: ${blackSize3.id}`);
      console.log(`- Stock Quantity: ${blackSize3.stock_quantity}`);
      console.log(`- Stock Status: ${blackSize3.stock_status}`);
    } else {
      console.log('\nFailed to find Black/Size 3 variation in verified product');
    }
    
  } catch (error) {
    console.error('Error fixing Zig Zag product:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the fix
fixZigZagProduct()
  .then(() => console.log('\nScript completed'))
  .catch(err => console.error('Fatal error:', err));
