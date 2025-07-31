export interface ProductVariation {
  id: string;
  name: string;
  stockStatus: 'IN_STOCK' | 'OUT_OF_STOCK' | 'ON_BACKORDER';
  stockQuantity?: number | null;
  regularPrice: string;
  salePrice: string;
  image: {
    sourceUrl: string;
  };
  attributes: {
    nodes: Array<{
      name: string;
      value: string;
    }>;
  };
}

export interface Product {
  __typename: 'SimpleProduct' | 'VariableProduct';
  id: string;
  slug: string;
  name: string;
  price?: string;
  stockStatus?: string;
  stockQuantity?: number;
  image?: {
    sourceUrl: string;
  };
  productCategories?: {
    nodes: {
      id: string;
      name: string;
      slug?: string;
    }[];
  };
  attributes?: {
    nodes: {
      name: string;
      options: string[];
    }[];
  };
  variations?: {
    nodes: ProductVariation[];
  };
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}
