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
