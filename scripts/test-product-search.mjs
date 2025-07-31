import { searchProducts } from '../utils/typesense-search.ts';

async function testProductSearch() {
  try {
    const slug = 'bj-boots';
    console.log('Searching for product with slug:', slug);
    
    const { products } = await searchProducts({
      q: slug,
      query_by: 'slug',
      per_page: 1
    });

    if (!products || products.length === 0) {
      console.log('No product found with slug:', slug);
      return;
    }

    console.log('Found product:', {
      slug: products[0].slug,
      name: products[0].name,
      price: products[0].price,
      stock_status: products[0].stock_status
    });
  } catch (error) {
    console.error('Error searching for product:', error);
  }
}

testProductSearch();
