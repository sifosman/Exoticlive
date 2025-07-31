export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface ProductVariation {
  id: string;
  name: string;
  stockStatus: string;
  stockQuantity?: number | null;
  attributes: {
    nodes: {
      name: string;
      value: string;
    }[];
  };
}

export interface Product {
  __typename: 'SimpleProduct' | 'VariableProduct';
  id: string;
  slug: string;
  name: string;
  price?: string;
  regularPrice?: string;
  salePrice?: string;
  onSale?: boolean;
  averageRating?: number;
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
