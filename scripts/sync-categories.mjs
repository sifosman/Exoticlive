#!/usr/bin/env node

/**
 * This script syncs product categories from WooCommerce to Typesense.
 * It's useful when you've added new categories in WooCommerce and need to update Typesense.
 */

import dotenv from 'dotenv';
import { default as WooCommerceRestApi } from '@woocommerce/woocommerce-rest-api';

// Alternative import if the above doesn't work
// const WooCommerceRestApi = (await import('@woocommerce/woocommerce-rest-api')).default;
import { Client as TypesenseClient } from 'typesense';

// Load environment variables
dotenv.config();

// Initialize WooCommerce API client
const WooCommerce = new WooCommerceRestApi({
  url: process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://wp.exoticshoes.co.za',
  consumerKey: process.env.WC_CONSUMER_KEY || 'ck_266d630c64bfc03268cb471bdd86250b7a0b13f1',
  consumerSecret: process.env.WC_CONSUMER_SECRET || 'cs_d9da89b71742f6404027107dcc42b52926f7cb89',
  version: 'wc/v3'
});

// Initialize Typesense client
const typesenseClient = new TypesenseClient({
  nodes: [
    {
      host: process.env.TYPESENSE_HOST || 'localhost',
      port: parseInt(process.env.TYPESENSE_PORT || '8108'),
      protocol: process.env.TYPESENSE_PROTOCOL || 'http'
    }
  ],
  apiKey: process.env.TYPESENSE_API_KEY || '',
  connectionTimeoutSeconds: 10
});

// Helper function to fetch all products from WooCommerce
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
      console.log(`✅ Fetched ${products.length} products`);

      if (products.length < perPage) break;
      page++;
    } catch (error) {
      console.error('❌ Error fetching products:', error.message);
      break;
    }
  }

  console.log(`🔢 Total products fetched: ${allProducts.length}`);
  return allProducts;
}

// Helper function to transform a WooCommerce product to Typesense format
function transformProduct(product) {
  // Extract categories
  const categories = product.categories ?
    product.categories.map(cat => cat.name) : [];

  // Extract tags
  const tags = product.tags ?
    product.tags.map(tag => tag.name) : [];

  // Extract attributes for faceting
  const attributes = product.attributes || [];

  // Extract colors and sizes specifically for faceting
  const colors = [];
  const sizes = [];

  attributes.forEach(attr => {
    if (attr.name && attr.name.toLowerCase() === 'color') {
      colors.push(...attr.options);
    }
    if (attr.name && attr.name.toLowerCase() === 'size') {
      sizes.push(...attr.options);
    }
  });

  // Get the main image URL
  const image_url = product.images && product.images.length > 0 ?
    product.images[0].src : '';

  // Get gallery images
  const galleryImages = product.images ?
    product.images.map(img => img.src) : [];

  // Count variations
  const variationsCount = product.variations ? product.variations.length : 0;

  // Check if product is on sale
  const isOnSale = product.on_sale || false;

  // Get date created
  const dateCreated = product.date_created || '';

  return {
    id: product.id.toString(),
    name: product.name,
    description: product.description ?
      product.description.replace(/<[^>]*>?/gm, '') : '', // Strip HTML
    price: parseFloat(product.price || 0),
    sale_price: product.sale_price ? parseFloat(product.sale_price) : null,
    regular_price: product.regular_price ? parseFloat(product.regular_price) : null,
    categories,
    tags,
    colors,
    sizes,
    image_url,
    gallery_images: galleryImages,
    slug: product.slug,
    stock_status: product.stock_status || 'outofstock',
    stock_quantity: product.stock_quantity || 0,
    is_featured: !!product.featured,
    is_on_sale: isOnSale,
    average_rating: parseFloat(product.average_rating || 0),
    date_created: dateCreated
  };
}

// Main function to sync products
async function syncProducts() {
  try {
    console.log('🔄 Starting product sync...');

    // Fetch all products from WooCommerce
    const products = await fetchAllProducts();
    console.log(`✅ Fetched ${products.length} products from WooCommerce`);

    // Process products
    let successCount = 0;
    let errorCount = 0;

    // Log all categories found
    const allCategories = new Set();
    products.forEach(product => {
      if (product.categories) {
        product.categories.forEach(cat => {
          allCategories.add(cat.name);
        });
      }
    });
    console.log('📋 All categories found in WooCommerce:', [...allCategories]);

    // Check if FastSellingProducts category exists
    const hasFastSellingCategory = [...allCategories].some(cat =>
      cat === 'FastSellingProducts' || cat === 'fastsellingproducts'
    );
    console.log('🔍 FastSellingProducts category exists:', hasFastSellingCategory);

    // Count products in FastSellingProducts category
    const fastSellingProducts = products.filter(product =>
      product.categories && product.categories.some(cat =>
        cat.name === 'FastSellingProducts' || cat.name === 'fastsellingproducts'
      )
    );
    console.log(`📊 Products in FastSellingProducts category: ${fastSellingProducts.length}`);

    // List the products in FastSellingProducts category
    if (fastSellingProducts.length > 0) {
      console.log('📋 Products in FastSellingProducts category:');
      fastSellingProducts.forEach(product => {
        console.log(`- ${product.id}: ${product.name}`);
      });
    }

    // Process each product
    for (const product of products) {
      try {
        // Transform WooCommerce product to Typesense format
        const typesenseProduct = transformProduct(product);

        // Upsert the product to Typesense
        await typesenseClient.collections('products').documents().upsert(typesenseProduct);

        successCount++;
        if (successCount % 10 === 0 || successCount === products.length) {
          console.log(`✅ Processed ${successCount}/${products.length} products`);
        }
      } catch (error) {
        console.error(`❌ Error processing product ${product.id}:`, error.message);
        errorCount++;
      }
    }

    console.log('🎉 Sync complete!');
    console.log(`✅ Successfully processed: ${successCount} products`);
    console.log(`❌ Failed to process: ${errorCount} products`);

    // Check Typesense for FastSellingProducts category
    try {
      const searchResults = await typesenseClient
        .collections('products')
        .documents()
        .search({
          q: '*',
          query_by: 'name',
          filter_by: 'categories:=[FastSellingProducts, fastsellingproducts]',
          per_page: 100
        });

      console.log(`🔍 Products found in Typesense with FastSellingProducts category: ${searchResults.found}`);

      if (searchResults.found > 0) {
        console.log('📋 Products in Typesense with FastSellingProducts category:');
        searchResults.hits.forEach(hit => {
          console.log(`- ${hit.document.id}: ${hit.document.name} (Categories: ${hit.document.categories.join(', ')})`);
        });
      }
    } catch (error) {
      console.error('❌ Error searching Typesense:', error.message);
    }

  } catch (error) {
    console.error('❌ Sync failed:', error.message);
  }
}

// Run the sync
syncProducts().catch(console.error);
