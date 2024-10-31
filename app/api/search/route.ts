import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ products: [] });
  }

  try {
    // Replace this with your actual GraphQL query to your WooCommerce/WordPress backend
    const response = await fetch('YOUR_GRAPHQL_ENDPOINT', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query SearchProducts($search: String!) {
            products(where: { search: $search }, first: 10) {
              nodes {
                id
                name
                slug
                ... on SimpleProduct {
                  price
                }
                image {
                  sourceUrl
                }
              }
            }
          }
        `,
        variables: {
          search: query
        }
      })
    });

    const data = await response.json();
    
    return NextResponse.json({
      products: data.data.products.nodes.map((product: any) => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        images: [{ sourceUrl: product.image.sourceUrl }]
      }))
    });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ products: [] }, { status: 500 });
  }
} 