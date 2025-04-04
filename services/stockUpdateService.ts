import { createClient, Client } from 'graphql-ws';
import { request, gql } from 'graphql-request';
import Typesense from 'typesense';

// Initialize Typesense client
const typesenseClient = new Typesense.Client({
  nodes: [{
    host: process.env.TYPESENSE_HOST || process.env.NEXT_PUBLIC_TYPESENSE_HOST || '',
    port: parseInt(process.env.TYPESENSE_PORT || process.env.NEXT_PUBLIC_TYPESENSE_PORT || '443'),
    protocol: process.env.TYPESENSE_PROTOCOL || process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL || 'https'
  }],
  apiKey: process.env.TYPESENSE_API_KEY || process.env.NEXT_PUBLIC_TYPESENSE_ADMIN_API_KEY || '',
  connectionTimeoutSeconds: 10
});

// GraphQL endpoint
const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_WORDPRESS_GRAPHQL_URL || 'https://wp.exoticshoes.co.za/graphql';

// GraphQL query for recently updated products
const RECENT_UPDATES_QUERY = gql`
  query RecentProductUpdates($after: String) {
    products(
      first: 50,
      where: {
        orderby: { field: MODIFIED, order: DESC }
        dateQuery: { after: $after }
      }
    ) {
      nodes {
        id
        databaseId
        __typename
        modified
        ... on VariableProduct {
          variations {
            nodes {
              id
              databaseId
              stockStatus
              stockQuantity
            }
          }
        }
        ... on SimpleProduct {
          stockStatus
          stockQuantity
        }
      }
    }
  }
`;

// GraphQL subscription for product stock updates
const STOCK_UPDATE_SUBSCRIPTION = gql`
  subscription OnProductUpdate {
    products(where: { stockStatusChanged: true }) {
      nodes {
        id
        databaseId
        __typename
        ... on VariableProduct {
          variations {
            nodes {
              id
              databaseId
              stockStatus
              stockQuantity
            }
          }
        }
        ... on SimpleProduct {
          stockStatus
          stockQuantity
        }
      }
    }
  }
`;

let client: Client | null = null;
let lastPollTime = new Date().toISOString();
let pollingIntervalId: NodeJS.Timeout | null = null;

/**
 * Start listening for stock updates via GraphQL subscription
 */
export function startStockUpdateListener() {
  console.log('Starting stock update listener...');

  try {
    // Create WebSocket client
    client = createClient({
      url: GRAPHQL_ENDPOINT.replace('http', 'ws'),
      connectionParams: {
        // Add authentication if needed
      },
    });

    // Subscribe to stock updates
    const unsubscribe = client.subscribe(
      {
        query: STOCK_UPDATE_SUBSCRIPTION,
      },
      {
        next: async (data) => {
          console.log('Received stock update:', data);

          // Process the updated products
          const products = data.data?.products?.nodes || [];

          for (const product of products) {
            await processProductUpdate(product);
          }
        },
        error: (error) => {
          console.error('GraphQL subscription error:', error);

          // Reconnect after a delay
          setTimeout(() => {
            if (client) {
              startStockUpdateListener();
            }
          }, 5000);
        },
        complete: () => {
          console.log('GraphQL subscription completed');
        },
      }
    );

    console.log('Stock update listener started successfully');
    return unsubscribe;
  } catch (error) {
    console.error('Failed to start stock update listener:', error);

    // Fall back to polling if subscription fails
    console.log('Falling back to polling for stock updates...');
    return startStockPolling();
  }
}

/**
 * Start polling for stock updates at regular intervals
 */
export function startStockPolling(intervalMs = 60000) {
  console.log(`Starting stock polling with interval of ${intervalMs}ms...`);

  // Clear any existing interval
  if (pollingIntervalId) {
    clearInterval(pollingIntervalId);
  }

  // Poll immediately
  pollStockUpdates();

  // Set up regular polling
  pollingIntervalId = setInterval(async () => {
    await pollStockUpdates();
  }, intervalMs);

  console.log('Stock polling started successfully');

  return () => {
    if (pollingIntervalId) {
      clearInterval(pollingIntervalId);
      pollingIntervalId = null;
    }
  };
}

/**
 * Poll for recent stock updates
 */
async function pollStockUpdates() {
  try {
    console.log(`Polling for stock updates since ${lastPollTime}...`);

    const data = await request(GRAPHQL_ENDPOINT, RECENT_UPDATES_QUERY, {
      after: lastPollTime
    });

    // Update the last poll time
    lastPollTime = new Date().toISOString();

    // Process the updated products
    const products = data.products?.nodes || [];
    console.log(`Found ${products.length} recently updated products`);

    for (const product of products) {
      await processProductUpdate(product);
    }

    return products.length;
  } catch (error) {
    console.error('Error polling for stock updates:', error);
    return 0;
  }
}

/**
 * Process a product update
 */
async function processProductUpdate(product: any) {
  try {
    if (product.__typename === 'VariableProduct') {
      // Handle variable product
      const variations = product.variations?.nodes || [];
      console.log(`Processing variable product ${product.databaseId} with ${variations.length} variations`);

      // Update the product in Typesense with all variations
      await updateProductWithVariations(product.databaseId, variations);
    } else {
      // Handle simple product
      console.log(`Processing simple product ${product.databaseId}`);
      await updateSimpleProduct(
        product.databaseId,
        product.stockQuantity,
        product.stockStatus
      );
    }
  } catch (error) {
    console.error(`Error processing product update for product ${product.databaseId}:`, error);
  }
}

/**
 * Update a variable product with variations in Typesense
 */
async function updateProductWithVariations(productId: number, variations: any[]) {
  try {
    console.log(`Updating product ${productId} with ${variations.length} variations in Typesense`);

    // Fetch the product from Typesense
    let product;
    try {
      product = await typesenseClient
        .collections('products')
        .documents(productId.toString())
        .retrieve();

      console.log(`Found product ${productId} in Typesense`);
    } catch (error) {
      console.error(`Product ${productId} not found in Typesense:`, error);
      return;
    }

    // Get existing variations from the product
    let existingVariations = [];
    if (product.variations) {
      existingVariations = product.variations;
    } else if (product.variations_json) {
      try {
        existingVariations = JSON.parse(product.variations_json);
      } catch (error) {
        console.error(`Error parsing variations_json for product ${productId}:`, error);
      }
    }

    if (!Array.isArray(existingVariations)) {
      console.error(`Variations for product ${productId} is not an array`);
      existingVariations = [];
    }

    console.log(`Found ${existingVariations.length} existing variations for product ${productId}`);

    // Process variations
    const updatedVariations = [...existingVariations];

    for (const variation of variations) {
      const variationId = variation.databaseId.toString();
      const index = updatedVariations.findIndex(v => v.id === variationId);

      if (index !== -1) {
        // Update existing variation
        updatedVariations[index] = {
          ...updatedVariations[index],
          stock_status: variation.stockStatus.toLowerCase(),
          stock_quantity: variation.stockQuantity || 0
        };
        console.log(`Updated variation ${variationId} in product ${productId}`);
      } else {
        console.log(`Variation ${variationId} not found in product ${productId}, skipping`);
      }
    }

    // Update the product in Typesense
    await typesenseClient
      .collections('products')
      .documents(productId.toString())
      .update({
        variations: updatedVariations,
        variations_json: JSON.stringify(updatedVariations)
      });

    console.log(`Successfully updated product ${productId} in Typesense with ${updatedVariations.length} variations`);
  } catch (error) {
    console.error(`Error updating product ${productId} in Typesense:`, error);
  }
}

/**
 * Update a simple product in Typesense
 */
async function updateSimpleProduct(productId: number, stockQuantity: number, stockStatus: string) {
  try {
    console.log(`Updating simple product ${productId} in Typesense`);

    // Update the product in Typesense
    await typesenseClient
      .collections('products')
      .documents(productId.toString())
      .update({
        stock_quantity: stockQuantity || 0,
        stock_status: stockStatus.toLowerCase()
      });

    console.log(`Successfully updated simple product ${productId} in Typesense`);
  } catch (error) {
    console.error(`Error updating simple product ${productId} in Typesense:`, error);
  }
}
