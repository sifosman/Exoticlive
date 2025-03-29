// Test WooCommerce connection
import dotenv from 'dotenv';
import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';

// Load environment variables
dotenv.config();

console.log('Testing WooCommerce connection...');

// Initialize WooCommerce API
const WooCommerce = new WooCommerceRestApi.default({
  url: process.env.NEXT_PUBLIC_WORDPRESS_URL,
  consumerKey: process.env.WC_CONSUMER_KEY,
  consumerSecret: process.env.WC_CONSUMER_SECRET,
  version: 'wc/v3',
  queryStringAuth: true,
});

// Test connection by fetching a single product
async function testConnection() {
  try {
    const response = await WooCommerce.get('products', {
      per_page: 1,
    });
    
    console.log('Connection successful!');
    console.log(`Retrieved product: ${response.data[0]?.name || 'No products found'}`);
    
    return true;
  } catch (error) {
    console.error('Connection failed:', error.message);
    return false;
  }
}

testConnection();
