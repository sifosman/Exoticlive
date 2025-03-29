// Script to check variations for a specific product
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import Typesense from 'typesense';

// Load environment variables
dotenv.config();

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

// WooCommerce REST API
const WC_API_URL = `${process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://wp.exoticshoes.co.za'}/wp-json/wc/v3`;
const WC_CONSUMER_KEY = process.env.WC_CONSUMER_KEY || 'ck_f5c50ee5a52dd7ca50e72eb0f5a65bb84f87be61'; 
const WC_CONSUMER_SECRET = process.env.WC_CONSUMER_SECRET || 'cs_db3fe06c6278cfe84ce4b6a63e6a7b1baedf5a98';

// Basic authentication for WooCommerce REST API
const AUTH_STRING = Buffer.from(`${WC_CONSUMER_KEY}:${WC_CONSUMER_SECRET}`).toString('base64');

async function checkVariations() {
  try {
    // Find a sample variable product with variations
    console.log('Looking for a variable product with variations...');
    
    // Fetch the most popular variable product
    const popularProducts = await typesenseClient
      .collections('products')
      .documents()
      .search({
        q: '*',
        filter_by: 'type:VARIABLE',
        sort_by: '_text_match:desc',
        per_page: 10
      });
    
    if (!popularProducts.hits || popularProducts.hits.length === 0) {
      console.log('No variable products found.');
      return;
    }
    
    // Try to find one with actual variations data
    let productWithVariations = null;
    for (const hit of popularProducts.hits) {
      const product = hit.document;
      if (product.variations_json && product.variations_json !== '[]') {
        productWithVariations = product;
        break;
      }
    }
    
    if (!productWithVariations) {
      // Get the first product and fetch variations from WooCommerce
      const firstProduct = popularProducts.hits[0].document;
      console.log(`No products with variations data found. Fetching from WooCommerce for product ${firstProduct.name} (ID: ${firstProduct.id})...`);
      
      // Fetch variations from WooCommerce
      const response = await fetch(`${WC_API_URL}/products/${firstProduct.id}/variations?per_page=100`, {
        headers: {
          'Authorization': `Basic ${AUTH_STRING}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${await response.text()}`);
      }
      
      const wcVariations = await response.json();
      console.log(`\nRetrieved ${wcVariations.length} variations from WooCommerce for product ${firstProduct.name}`);
      
      if (wcVariations.length > 0) {
        console.log('\n===== WOOCOMMERCE VARIATION SAMPLE =====');
        console.log(JSON.stringify(wcVariations[0], null, 2));
        
        // Update the product in Typesense
        const processedVariations = wcVariations.map(variation => {
          return {
            id: variation.id,
            sku: variation.sku || '',
            price: parseFloat(variation.price || '0'),
            regular_price: parseFloat(variation.regular_price || '0'),
            sale_price: variation.sale_price ? parseFloat(variation.sale_price) : null,
            on_sale: !!variation.on_sale,
            purchasable: !!variation.purchasable,
            stock_status: (variation.stock_status || 'outofstock').toLowerCase(),
            stock_quantity: variation.stock_quantity || 0,
            image: variation.image ? {
              src: variation.image.src || '',
              alt: variation.image.alt || ''
            } : null,
            attributes: (variation.attributes || []).map(attr => ({
              name: attr.name || '',
              option: attr.option || ''
            }))
          };
        });
        
        console.log('\nUpdating Typesense record with variations data...');
        
        await typesenseClient
          .collections('products')
          .documents(firstProduct.id)
          .update({
            variations_json: JSON.stringify(processedVariations)
          });
        
        console.log('Product updated successfully. Retrieving updated record...');
        
        // Get the updated product
        const updatedProduct = await typesenseClient
          .collections('products')
          .documents(firstProduct.id)
          .retrieve();
        
        productWithVariations = updatedProduct;
      }
    }
    
    if (productWithVariations) {
      console.log(`\n===== PRODUCT WITH VARIATIONS =====`);
      console.log(`Name: ${productWithVariations.name}`);
      console.log(`ID: ${productWithVariations.id}`);
      console.log(`Type: ${productWithVariations.type}`);
      console.log(`Stock Status: ${productWithVariations.stock_status}`);
      
      console.log('\n----- Attributes -----');
      try {
        const attributes = JSON.parse(productWithVariations.attributes_json || '[]');
        console.log(JSON.stringify(attributes, null, 2));
      } catch (error) {
        console.log(`Error parsing attributes: ${error.message}`);
      }
      
      console.log('\n----- Variations -----');
      try {
        const variations = JSON.parse(productWithVariations.variations_json || '[]');
        console.log(`Found ${variations.length} variations`);
        
        if (variations.length > 0) {
          variations.forEach((variation, index) => {
            console.log(`\nVariation #${index + 1}:`);
            console.log(`  ID: ${variation.id}`);
            console.log(`  Price: ${variation.price}`);
            console.log(`  Stock Status: ${variation.stock_status}`);
            console.log(`  Stock Quantity: ${variation.stock_quantity || 0}`);
            
            if (variation.attributes && Array.isArray(variation.attributes)) {
              console.log('  Attributes:');
              variation.attributes.forEach(attr => {
                console.log(`    ${attr.name}: ${attr.option}`);
              });
            }
          });
        }
      } catch (error) {
        console.log(`Error parsing variations: ${error.message}`);
        console.log('Raw variations_json:', productWithVariations.variations_json);
      }
    } else {
      console.log('Could not find or create a product with variations.');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkVariations();
