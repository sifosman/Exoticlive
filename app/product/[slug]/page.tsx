import { gql } from '@apollo/client';
import { getApolloClient } from '@/lib/apollo-client';
import ProductContent from '@/components/ProductContent';
import { notFound } from 'next/navigation';


// Add revalidation time (in seconds)
export const revalidate = 3600; // Revalidate every hour

const GET_PRODUCT = gql`
  query GetProduct($slug: ID!) {
    product(id: $slug, idType: SLUG) {
      id
      databaseId
      slug
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
        stockStatus
      }
      ... on VariableProduct {
        price
        regularPrice
        salePrice
        stockStatus
        variations {
          nodes {
            id
            databaseId
            name
            price
            regularPrice
            salePrice
            stockStatus
            attributes {
              nodes {
                name
                value
              }
            }
          }
        }
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

// Reduced initial static generation for better performance
const GET_ALL_PRODUCT_SLUGS = gql`
  query GetAllProductSlugs {
    products(first: 50, where: { status: "publish" }) {
      nodes {
        slug
      }
    }
  }
`;

export async function generateStaticParams() {
  try {
    const { data } = await getApolloClient().query({ 
      query: GET_ALL_PRODUCT_SLUGS
    });

    if (!data?.products?.nodes) {
      console.error('No products found during static generation');
      return [];
    }

    // Only generate the first 10 products at build time
    // Adjust this number based on your build performance
    return data.products.nodes
      .slice(0, 10)
      .map((product: { slug: string }) => ({
        slug: product.slug,
      }));
  } catch (error) {
    console.error('Error generating static params:', error);
    return [];
  }
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  try {
    console.log('Attempting to fetch product with slug:', params.slug);
    
    const { data, error } = await getApolloClient().query({
      query: GET_PRODUCT,
      variables: { slug: params.slug },
    });

    if (error) {
      console.error('GraphQL Error:', error);
      throw error;
    }

    if (!data?.product) {
      console.log(`Product not found for slug: ${params.slug}`);
      return notFound();
    }

    console.log('Product found:', {
      id: data.product.id,
      name: data.product.name,
      status: data.product.status
    });

    return (
      <div className="container mx-auto px-4 py-8 md:pt-24">
        <ProductContent product={data.product} />
      </div>
    );
  } catch (error) {
    console.error(`Error fetching product ${params.slug}:`, error);
    throw error;
  }
}
// Enable dynamic paths
export const dynamicParams = true;

