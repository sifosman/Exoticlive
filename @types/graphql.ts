export enum ProductsOrderByEnum {
  DATE = 'DATE',
  PRICE = 'PRICE',
  RATING = 'RATING',
  // Add other sorting options as needed
}

export enum OrderEnum {
  ASC = 'ASC',
  DESC = 'DESC',
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  price: string;
  regularPrice: string;
  salePrice: string;
  onSale: boolean;
  averageRating: number;
  image: {
    sourceUrl: string;
  };
}

// You might also want to add these related types
export interface ProductEdge {
  node: Product;
}

export interface ProductConnection {
  nodes: Product[];
  edges: ProductEdge[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string;
  };
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}

