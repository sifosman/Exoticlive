import { gql } from '@apollo/client';
import { PRODUCT_FIELDS } from './fragments';

export const GET_PRODUCT = gql`
  query GetProducts($first: Int!) {
    products(first: $first) {
      nodes {
        ... on Product {
          id
          databaseId
          name
          slug
          shortDescription
          description
          type
          onSale
          image {
            id
            sourceUrl
            altText
          }
        }
        ... on SimpleProduct {
          id
          price
          regularPrice
          salePrice
        }
        ... on VariableProduct {
          id
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
          attributes {
            nodes {
              name
              options
              variation
            }
          }
        }
        ... on Product {
          productCategories {
            nodes {
              id
              name
              slug
            }
          }
          productTags {
            nodes {
              id
              name
              slug
            }
          }
        }
      }
    }
  }
`;
