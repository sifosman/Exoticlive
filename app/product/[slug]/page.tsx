import { gql } from '@apollo/client';
import { getClient } from '@/lib/apollo-client';
import ProductContent from '@/components/ProductContent';
import { notFound } from 'next/navigation';

const GET_PRODUCT = gql`
  query GetProduct($slug: ID!) {
    product(id: $slug, idType: SLUG) {
      id
      name
      description
      shortDescription
      sku
      status
      reviewCount
      averageRating
      ... on SimpleProduct {
        price
        regularPrice
        salePrice
        # Remove categories if not available
      }
      ... on VariableProduct {
        price
        regularPrice
        salePrice
        variations {
          nodes {
            id
            name
            price
            regularPrice
            salePrice
            attributes {
              nodes {
                name
                value
              }
            }
          }
        }
        # Remove categories if not available
      }
      image {
        sourceUrl
        altText
      }
      galleryImages {
        nodes {
          sourceUrl
          altText
        }
      }
      attributes {
        nodes {
          name
          options
        }
      }
    }
  }
`;

const GET_ALL_PRODUCT_SLUGS = gql`
  query GetAllProductSlugs {
    products(first: 1000) {
      nodes {
        slug
      }
    }
  }
`;

export async function generateStaticParams() {
  try {
    const { data } = await getClient().query({ 
      query: GET_ALL_PRODUCT_SLUGS,
      fetchPolicy: 'no-cache' // Ensure fresh data during build
    });

    if (!data?.products?.nodes) {
      console.error('No products found during static generation');
      return [];
    }

    return data.products.nodes.map((product: { slug: string }) => ({
      slug: product.slug,
    }));
  } catch (error) {
    console.error('Error generating static params:', error);
    return [];
  }
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  try {
    const { data } = await getClient().query({
      query: GET_PRODUCT,
      variables: { slug: params.slug },
      fetchPolicy: 'no-cache' // Ensure fresh data during build
    });

    if (!data?.product) {
      notFound();
    }

    return (
      <div className="container mx-auto px-4 py-8">
        <ProductContent product={data.product} />
      </div>
    );
  } catch (error) {
    console.error(`Error fetching product ${params.slug}:`, error);
    notFound();
  }
}

// Add this to handle 404 cases
export const dynamicParams = false; // Ensure only pre-rendered pages are served
