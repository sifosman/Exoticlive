import { gql } from '@apollo/client';

export const GET_PRODUCTS = gql`
  query GetProducts(
    $first: Int!, 
    $after: String, 
    $sortBy: ProductsOrderByEnum!, 
    $sortOrder: OrderEnum!,
    $categories: [String]
  ) {
    products(
      first: $first, 
      after: $after, 
      where: { 
        orderby: { field: $sortBy, order: $sortOrder },
        status: "publish",
        categoryIn: $categories
      }
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        ... on SimpleProduct {
          id
          slug
          name
          price
          stockStatus
          stockQuantity
          image {
            sourceUrl
          }
          productCategories {
            nodes {
              id
              name
              slug
            }
          }
          attributes {
            nodes {
              name
              options
            }
          }
        }
        ... on VariableProduct {
          id
          slug
          name
          price
          image {
            sourceUrl
          }
          productCategories {
            nodes {
              id
              name
              slug
            }
          }
          attributes {
            nodes {
              name
              options
            }
          }
          variations(first: 100) {
            nodes {
              id
              stockStatus
              stockQuantity
              attributes {
                nodes {
                  name
                  value
                }
              }
            }
          }
        }
      }
    }
  }
`;
