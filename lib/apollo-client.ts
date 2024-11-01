import { 
  ApolloClient, 
  InMemoryCache, 
  createHttpLink, 
  ApolloLink, 
  from 
} from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';

// HTTP Link with timeout
const httpLink = createHttpLink({
  uri: process.env.NEXT_PUBLIC_WORDPRESS_API_URL,
  fetchOptions: {
    timeout: 30000, // 30 second timeout
  },
});

// Logging Link
const loggingLink = new ApolloLink((operation, forward) => {
  const startTime = Date.now();
  console.log(`GraphQL Request: ${operation.operationName}`, operation.variables);
  
  return forward(operation).map((response) => {
    const duration = Date.now() - startTime;
    console.log(
      `GraphQL Response: ${operation.operationName} (${duration}ms)`, 
      response
    );
    return response;
  });
});

// Error Handling Link
const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.error(
        `[GraphQL error in ${operation.operationName}]: ` +
        `Message: ${message}, Location: ${locations}, Path: ${path}`
      );
    });
  }
  if (networkError) {
    console.error(
      `[Network error in ${operation.operationName}]: ${networkError}`
    );
  }
});

// Retry Link
const retryLink = new RetryLink({
  attempts: {
    max: 3,
    retryIf: (error, operation) => {
      const shouldRetry = !!error && operation.operationName !== 'query';
      if (shouldRetry) {
        console.log(`Retrying ${operation.operationName} due to error:`, error);
      }
      return shouldRetry;
    }
  },
  delay: {
    initial: 300,
    max: 3000,   
    jitter: true  
  }
});

export function getClient() {
  return new ApolloClient({
    link: from([
      errorLink,    // First handle errors
      retryLink,    // Then handle retries
      loggingLink,  // Then log the request/response
      httpLink      // Finally make the request
    ]),
    cache: new InMemoryCache({
      typePolicies: {
        Query: {
          fields: {
            products: {
              merge(existing, incoming) {
                return incoming;
              }
            }
          }
        }
      }
    }),
    defaultOptions: {
      query: {
        fetchPolicy: 'no-cache',     // Don't cache queries
        errorPolicy: 'all',          // Return partial results on error
        notifyOnNetworkStatusChange: true,  // Notify on network status changes
      },
      watchQuery: {
        fetchPolicy: 'no-cache',
        errorPolicy: 'all',
        notifyOnNetworkStatusChange: true,
      },
    },
  });
}

// Optional: Create a singleton instance
let apolloClientInstance: ApolloClient<any> | null = null;

export function getApolloClient() {
  if (!apolloClientInstance) {
    apolloClientInstance = getClient();
  }
  return apolloClientInstance;
}

// For backwards compatibility
export const client = getApolloClient();
