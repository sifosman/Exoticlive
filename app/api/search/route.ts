import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ products: [] });
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_WORDPRESS_URL}/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 60 }, // Cache for 60 seconds
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

    if (!response.ok) {
      throw new Error(`Search request failed with status ${response.status}`);
    }

    const data = await response.json();
    
    if (!data?.data?.products?.nodes) {
      return NextResponse.json({ products: [] });
    }

    return NextResponse.json(
      {
        products: data.data.products.nodes.map((product: any) => ({
          id: product.id,
          name: product.name,
          slug: product.slug,
          price: product.price,
          images: [{ sourceUrl: product?.image?.sourceUrl }]
        }))
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      }
    );
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { 
        products: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
} 