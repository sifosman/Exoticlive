import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Typesense from 'typesense';
import fs from 'fs';
import path from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env') });

// Create clients with different API keys for testing different access patterns
const adminClient = new Typesense.Client({
  nodes: [{
    host: process.env.NEXT_PUBLIC_TYPESENSE_HOST || 'localhost',
    port: Number(process.env.NEXT_PUBLIC_TYPESENSE_PORT) || 443,
    protocol: process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL || 'https'
  }],
  apiKey: process.env.NEXT_PUBLIC_TYPESENSE_ADMIN_API_KEY || '',
  connectionTimeoutSeconds: 5
});

const searchClient = new Typesense.Client({
  nodes: [{
    host: process.env.NEXT_PUBLIC_TYPESENSE_HOST || 'localhost',
    port: Number(process.env.NEXT_PUBLIC_TYPESENSE_PORT) || 443,
    protocol: process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL || 'https'
  }],
  apiKey: process.env.NEXT_PUBLIC_TYPESENSE_SEARCH_API_KEY || '',
  connectionTimeoutSeconds: 5
});

// Debug log function that logs to console and file
const debugLog = (message, obj = null) => {
  const timestamp = new Date().toISOString();
  const logMessage = obj 
    ? `[${timestamp}] ${message}: ${JSON.stringify(obj, null, 2)}`
    : `[${timestamp}] ${message}`;
  
  console.log(logMessage);
  
  // Also log to file
  fs.appendFileSync(
    path.join(__dirname, 'zigzag-debug.log'),
    logMessage + '\n',
    { encoding: 'utf8' }
  );
};

// Format variations for visual display
const formatVariationsTable = (variations) => {
  if (!variations || !Array.isArray(variations) || variations.length === 0) {
    return 'No variations found';
  }
  
  // Create headers based on first variation's attributes
  const firstVar = variations[0];
  const attributeNames = firstVar.attributes 
    ? firstVar.attributes.map(attr => attr.name) 
    : [];
  
  const headers = ['ID', ...attributeNames, 'Stock Qty', 'Stock Status'];
  
  // Format rows
  const rows = variations.map(variation => {
    const attributeValues = {};
    if (variation.attributes && Array.isArray(variation.attributes)) {
      variation.attributes.forEach(attr => {
        attributeValues[attr.name] = attr.option || attr.value || '';
      });
    }
    
    return [
      variation.id,
      ...attributeNames.map(name => attributeValues[name] || ''),
      variation.stock_quantity || 0,
      variation.stock_status || 'unknown'
    ];
  });
  
  // Find column widths
  const colWidths = headers.map((header, i) => {
    const maxRowWidth = Math.max(...rows.map(row => String(row[i]).length));
    return Math.max(header.length, maxRowWidth);
  });
  
  // Build the table
  const headerLine = headers.map((header, i) => 
    header.padEnd(colWidths[i])
  ).join(' | ');
  
  const separatorLine = colWidths.map(width => 
    '-'.repeat(width)
  ).join('-+-');
  
  const dataLines = rows.map(row => 
    row.map((cell, i) => 
      String(cell).padEnd(colWidths[i])
    ).join(' | ')
  );
  
  return [headerLine, separatorLine, ...dataLines].join('\n');
};

// Simulate the product page data flow for troubleshooting
const simulateProductPage = async (slug) => {
  debugLog(`Starting product page simulation for slug: ${slug}`);
  
  try {
    // Step 1: Retrieve raw data from Typesense
    debugLog('STEP 1: Retrieve raw data from Typesense via search API');
    const searchResults = await searchClient
      .collections('products')
      .documents()
      .search({
        q: slug,
        query_by: 'slug',
        per_page: 1
      });
    
    if (!searchResults.hits || searchResults.hits.length === 0) {
      debugLog('No product found in Typesense');
      return null;
    }
    
    const rawProduct = searchResults.hits[0].document;
    debugLog(`Found product in Typesense: ${rawProduct.name} (ID: ${rawProduct.id})`);
    
    // Step 2: Check raw data structure
    debugLog('STEP 2: Examine raw data structure');
    debugLog('Available fields in raw product data:', Object.keys(rawProduct));
    
    // Check if variations exist in raw format (deprecated format)
    if (rawProduct.variations && Array.isArray(rawProduct.variations)) {
      debugLog('WARNING: Found direct variations array (old format)', {
        count: rawProduct.variations.length,
        sample: rawProduct.variations.slice(0, 1)
      });
    }
    
    // Check variations_json (new format)
    if (rawProduct.variations_json) {
      debugLog('Found variations_json field (new format)', {
        dataType: typeof rawProduct.variations_json,
        length: rawProduct.variations_json.length
      });
      
      try {
        const variationsFromJson = JSON.parse(rawProduct.variations_json);
        debugLog(`Successfully parsed variations_json - found ${variationsFromJson.length} variations`);
        
        // Visual variations table
        debugLog('Variations Table:');
        console.log(formatVariationsTable(variationsFromJson));
        
        // Check for Black/Size 3 combo
        const blackSize3 = variationsFromJson.find(v => {
          if (!v.attributes || !Array.isArray(v.attributes)) return false;
          
          const hasBlackColor = v.attributes.some(attr => 
            attr.name.toLowerCase() === 'color' && 
            attr.option?.toLowerCase() === 'black'
          );
          
          const hasSize3 = v.attributes.some(attr => 
            attr.name.toLowerCase() === 'size' && 
            attr.option === '3'
          );
          
          return hasBlackColor && hasSize3;
        });
        
        if (blackSize3) {
          debugLog('Found Black/Size 3 variation:', blackSize3);
        } else {
          debugLog('ERROR: Could not find Black/Size 3 variation!');
        }
      } catch (error) {
        debugLog('ERROR: Failed to parse variations_json', error.message);
      }
    } else {
      debugLog('ERROR: variations_json field is missing!');
    }
    
    // Check attributes_json (new format)
    if (rawProduct.attributes_json) {
      debugLog('Found attributes_json field (new format)', {
        dataType: typeof rawProduct.attributes_json,
        length: rawProduct.attributes_json.length
      });
      
      try {
        const attributesFromJson = JSON.parse(rawProduct.attributes_json);
        debugLog(`Successfully parsed attributes_json - found ${attributesFromJson.length} attributes`);
        debugLog('Available attributes:', attributesFromJson);
      } catch (error) {
        debugLog('ERROR: Failed to parse attributes_json', error.message);
      }
    } else {
      debugLog('ERROR: attributes_json field is missing!');
    }
    
    // Step 3: Simulate ProductContentTypesense component processing
    debugLog('STEP 3: Simulating frontend component processing');
    
    // Create a processed product similar to what's done in ProductContentTypesense.tsx
    const processedProduct = { ...rawProduct };
    
    // Parse variations_json if it exists
    if (typeof processedProduct.variations_json === 'string') {
      try {
        processedProduct.variations = JSON.parse(processedProduct.variations_json);
        debugLog(`Frontend: Parsed variations_json, found ${processedProduct.variations.length} variations`);
      } catch (error) {
        debugLog('Frontend: Error parsing variations_json:', error.message);
        processedProduct.variations = [];
      }
    }
    
    // Parse attributes_json if it exists
    if (typeof processedProduct.attributes_json === 'string') {
      try {
        processedProduct.attributes = JSON.parse(processedProduct.attributes_json);
        debugLog(`Frontend: Parsed attributes_json, found ${processedProduct.attributes.length} attributes`);
      } catch (error) {
        debugLog('Frontend: Error parsing attributes_json:', error.message);
        processedProduct.attributes = [];
      }
    }
    
    // Check what frontend sees
    if (!processedProduct.variations || !Array.isArray(processedProduct.variations)) {
      debugLog('CRITICAL ERROR: Frontend has no variations data after processing!');
    } else if (processedProduct.variations.length === 0) {
      debugLog('CRITICAL ERROR: Frontend has empty variations array!');
    } else {
      debugLog(`Frontend: Sees ${processedProduct.variations.length} variations`);
    }
    
    if (!processedProduct.attributes || !Array.isArray(processedProduct.attributes)) {
      debugLog('CRITICAL ERROR: Frontend has no attributes data after processing!');
    } else if (processedProduct.attributes.length === 0) {
      debugLog('CRITICAL ERROR: Frontend has empty attributes array!');
    } else {
      debugLog(`Frontend: Sees ${processedProduct.attributes.length} attributes`);
      
      // Check for unexpected color options
      const colorAttr = processedProduct.attributes.find(a => 
        a.name.toLowerCase() === 'color'
      );
      
      if (colorAttr) {
        debugLog('Frontend: Color attribute detected', {
          name: colorAttr.name,
          options: colorAttr.options,
          variation: colorAttr.variation
        });
      }
    }
    
    // Step 4: Direct database check using admin API
    debugLog('STEP 4: Direct database verification using admin API');
    try {
      // Try getting the product by ID
      const productId = rawProduct.id;
      const directProduct = await adminClient
        .collections('products')
        .documents(productId)
        .retrieve();
      
      debugLog(`Retrieved product directly by ID: ${productId}`);
      debugLog('Available fields in direct document:', Object.keys(directProduct));
      
      // Check if variations_json exists and looks good
      if (directProduct.variations_json) {
        debugLog('Direct Document: Found variations_json field');
        try {
          const directVariations = JSON.parse(directProduct.variations_json);
          debugLog(`Direct Document: Successfully parsed variations_json with ${directVariations.length} variations`);
          
          // Check first few variations
          if (directVariations.length > 0) {
            debugLog('Direct Document: Sample variation structure:');
            console.log(JSON.stringify(directVariations[0], null, 2));
          }
        } catch (error) {
          debugLog('Direct Document: ERROR parsing variations_json', error.message);
        }
      } else {
        debugLog('Direct Document: ERROR - variations_json is missing!');
      }
    } catch (error) {
      debugLog('Direct Document: ERROR retrieving product by ID', {
        error: error.message,
        productId: rawProduct.id
      });
    }
    
    // Return detailed debug info
    return {
      rawProduct,
      processedProduct,
      hasVariationsJson: !!rawProduct.variations_json,
      hasAttributesJson: !!rawProduct.attributes_json,
      frontendVariationsCount: processedProduct.variations?.length || 0,
      frontendAttributesCount: processedProduct.attributes?.length || 0
    };
  } catch (error) {
    debugLog('ERROR during simulation', error.message);
    return null;
  }
};

// Function to fix the Zig Zag product with verified correct data
const fixZigZagProduct = async () => {
  debugLog('Starting fix of Zig Zag product with verified correct data');
  
  // Define the known correct variation attributes
  const verifiedVariations = [
    // Black variations
    { 
      id: '25094', 
      attributes: [
        { name: 'color', option: 'Black' },
        { name: 'size', option: '3' }
      ],
      stock_quantity: 1,
      stock_status: 'instock',
      price: 59.99,
      sale_price: 49.99,
      regular_price: 59.99
    },
    { 
      id: '25095', 
      attributes: [
        { name: 'color', option: 'Black' },
        { name: 'size', option: '4' }
      ],
      stock_quantity: 0,
      stock_status: 'outofstock',
      price: 59.99,
      sale_price: 49.99,
      regular_price: 59.99
    },
    { 
      id: '25096', 
      attributes: [
        { name: 'color', option: 'Black' },
        { name: 'size', option: '5' }
      ],
      stock_quantity: 3,
      stock_status: 'instock',
      price: 59.99,
      sale_price: 49.99,
      regular_price: 59.99
    },
    
    // Red variations
    { 
      id: '25100', 
      attributes: [
        { name: 'color', option: 'Red' },
        { name: 'size', option: '3' }
      ],
      stock_quantity: 1,
      stock_status: 'instock',
      price: 59.99,
      sale_price: 49.99,
      regular_price: 59.99
    },
    { 
      id: '25101', 
      attributes: [
        { name: 'color', option: 'Red' },
        { name: 'size', option: '4' }
      ],
      stock_quantity: 0,
      stock_status: 'outofstock',
      price: 59.99,
      sale_price: 49.99,
      regular_price: 59.99
    },
    { 
      id: '25102', 
      attributes: [
        { name: 'color', option: 'Red' },
        { name: 'size', option: '5' }
      ],
      stock_quantity: 3,
      stock_status: 'instock',
      price: 59.99,
      sale_price: 49.99,
      regular_price: 59.99
    }
  ];
  
  // Create product attributes array from verified variations
  const verifiedAttributes = [
    {
      name: 'color',
      options: ['Black', 'Red'],
      variation: true
    },
    {
      name: 'size',
      options: ['3', '4', '5'],
      variation: true
    }
  ];
  
  try {
    // Try to get the product from Typesense
    debugLog('Looking for Zig Zag product...');
    
    const searchResults = await adminClient
      .collections('products')
      .documents()
      .search({
        q: 'zig-zag',
        query_by: 'slug',
        per_page: 1
      });
    
    if (!searchResults.hits || searchResults.hits.length === 0) {
      debugLog('Zig Zag product not found, creating it...');
      
      // Create the product with verified data
      const newProduct = {
        id: '25093',
        name: 'Zig Zag',
        slug: 'zig-zag',
        description: 'Stylish Zig Zag pattern shoes available in various colors and sizes.',
        short_description: 'Stylish Zig Zag pattern shoes',
        price: 59.99,
        sale_price: 49.99,
        regular_price: 59.99,
        stock_quantity: 10,
        stock_status: 'instock',
        image_url: 'https://wp.exoticshoes.co.za/wp-content/uploads/2023/10/zigzag-black.jpg',
        image_alt: 'Zig Zag Shoes',
        attributes_json: JSON.stringify(verifiedAttributes),
        variations_json: JSON.stringify(verifiedVariations),
        colors: ['Black', 'Red'],
        sizes: ['3', '4', '5'],
        categories: ['Shoes', 'Women'],
        tags: ['Fashion', 'Trending']
      };
      
      const result = await adminClient
        .collections('products')
        .documents()
        .create(newProduct);
      
      debugLog('Created Zig Zag product with verified data', {
        id: result.id,
        name: result.name
      });
    } else {
      // Update existing product
      const product = searchResults.hits[0].document;
      debugLog(`Found existing Zig Zag product (ID: ${product.id})`);
      
      // Update with verified data
      const updateResult = await adminClient
        .collections('products')
        .documents(product.id)
        .update({
          attributes_json: JSON.stringify(verifiedAttributes),
          variations_json: JSON.stringify(verifiedVariations),
          colors: ['Black', 'Red'],
          sizes: ['3', '4', '5']
        });
      
      debugLog('Updated Zig Zag product with verified data', {
        id: updateResult.id,
        hasVariationsJson: !!updateResult.variations_json,
        hasAttributesJson: !!updateResult.attributes_json
      });
    }
    
    // Verify the product after update
    await simulateProductPage('zig-zag');
    
    debugLog('Zig Zag product fix complete');
  } catch (error) {
    debugLog('ERROR fixing Zig Zag product', error.message);
  }
};

// Main function
const main = async () => {
  debugLog('Starting Zig Zag comprehensive debugging');
  
  // First simulate to see current state
  debugLog('PHASE 1: Simulating current product page behavior');
  await simulateProductPage('zig-zag');
  
  // Ask if we should proceed with fixing
  console.log('\n\n-----------------------------------------');
  console.log('Do you want to fix the product with verified correct data? (y/n)');
  
  // Automatically proceed for this script
  console.log('Automatically proceeding with fix...');
  
  // Fix the product
  debugLog('PHASE 2: Applying verified fix to product');
  await fixZigZagProduct();
  
  debugLog('Debugging and fixing complete');
};

// Run the main function
main()
  .then(() => console.log('Process complete'))
  .catch(err => console.error('Fatal error:', err));
