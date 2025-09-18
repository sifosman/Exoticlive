export const productSchema = {
  name: 'products',
  fields: [
    { name: 'id', type: 'string' },
    { name: 'name', type: 'string', sort: true },
    { name: 'slug', type: 'string' },
    { name: 'price', type: 'float', facet: true },
    { name: 'stockStatus', type: 'string', facet: true },
    { name: 'imageUrl', type: 'string' },
    { name: 'categories', type: 'string[]', facet: true },
    { name: 'attributes', type: 'object[]' },
    { name: 'variations', type: 'object[]', optional: true },
    { name: 'createdAt', type: 'int64', sort: true }
  ],
  default_sorting_field: 'createdAt'
};
