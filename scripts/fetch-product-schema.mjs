// Script to fetch schema from WooCommerce GraphQL API
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import fs from 'fs';

// Load environment variables
dotenv.config();

// GraphQL endpoint
const WORDPRESS_API_URL = process.env.NEXT_PUBLIC_WORDPRESS_API_URL;

// Introspection query to get schema
const INTROSPECTION_QUERY = `
  query IntrospectionQuery {
    __schema {
      types {
        name
        description
        fields {
          name
          description
          type {
            name
            kind
            ofType {
              name
              kind
            }
          }
        }
      }
    }
  }
`;

async function fetchSchema() {
  try {
    console.log('Fetching GraphQL schema...');
    
    const response = await fetch(WORDPRESS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: INTROSPECTION_QUERY }),
    });

    const json = await response.json();
    
    if (json.errors) {
      console.error('Error fetching schema:', json.errors);
      return;
    }
    
    // Filter to show only Product type
    const productType = json.data.__schema.types.find(type => type.name === 'Product');
    
    if (!productType) {
      console.error('Product type not found in schema');
      return;
    }
    
    console.log('Product Schema Fields:');
    
    // Print product fields nicely formatted
    const productFields = productType.fields.map(field => {
      const fieldType = field.type.name || 
                       (field.type.ofType ? field.type.ofType.name : field.type.kind);
      
      return {
        name: field.name,
        type: fieldType,
        description: field.description || 'No description'
      };
    });
    
    console.log(JSON.stringify(productFields, null, 2));
    
    // Save to file
    fs.writeFileSync('./product-schema.json', JSON.stringify(productFields, null, 2));
    console.log('Schema saved to product-schema.json');
    
    // Also find SimpleProduct and VariableProduct types
    const simpleProductType = json.data.__schema.types.find(type => type.name === 'SimpleProduct');
    const variableProductType = json.data.__schema.types.find(type => type.name === 'VariableProduct');
    
    if (simpleProductType) {
      const simpleProductFields = simpleProductType.fields.map(field => ({
        name: field.name,
        type: field.type.name || (field.type.ofType ? field.type.ofType.name : field.type.kind),
        description: field.description || 'No description'
      }));
      
      fs.writeFileSync('./simple-product-schema.json', JSON.stringify(simpleProductFields, null, 2));
      console.log('Simple Product schema saved to simple-product-schema.json');
    }
    
    if (variableProductType) {
      const variableProductFields = variableProductType.fields.map(field => ({
        name: field.name,
        type: field.type.name || (field.type.ofType ? field.type.ofType.name : field.type.kind),
        description: field.description || 'No description'
      }));
      
      fs.writeFileSync('./variable-product-schema.json', JSON.stringify(variableProductFields, null, 2));
      console.log('Variable Product schema saved to variable-product-schema.json');
    }
    
    // Find ProductVariation type
    const productVariationType = json.data.__schema.types.find(type => type.name === 'ProductVariation');
    
    if (productVariationType) {
      const productVariationFields = productVariationType.fields.map(field => ({
        name: field.name,
        type: field.type.name || (field.type.ofType ? field.type.ofType.name : field.type.kind),
        description: field.description || 'No description'
      }));
      
      fs.writeFileSync('./product-variation-schema.json', JSON.stringify(productVariationFields, null, 2));
      console.log('Product Variation schema saved to product-variation-schema.json');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

fetchSchema();
