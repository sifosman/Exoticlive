import { gql } from '@apollo/client';

export const PRODUCT_FIELDS = gql`
  fragment ProductFields on Product {
    ... on SimpleProduct {
      id
      slug
      name
      price
      regularPrice
      salePrice
      onSale
      averageRating
      image {
        sourceUrl
      }
      productCategories {
        nodes {
          slug
          name
        }
      }
    }
    ... on VariableProduct {
      id
      slug
      name
      price
      regularPrice
      salePrice
      onSale
      averageRating
      image {
        sourceUrl
      }
      productCategories {
        nodes {
          slug
          name
        }
      }
    }
  }
`;
