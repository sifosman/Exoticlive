import { gql } from '@apollo/client';
import { getClient } from '@/lib/apollo-client';
import ProductContent from '@/components/ProductContent';

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
  const { data } = await getClient().query({ query: GET_ALL_PRODUCT_SLUGS });
  return data.products.nodes.map((product: { slug: string }) => ({
    slug: product.slug,
  }));
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const { data } = await getClient().query({
    query: GET_PRODUCT,
    variables: { slug: params.slug },
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <ProductContent product={data.product} />
    </div>
  );
}
