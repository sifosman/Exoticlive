import { ApolloClient, InMemoryCache, createHttpLink, ApolloLink } from '@apollo/client';

const httpLink = createHttpLink({
  uri: process.env.NEXT_PUBLIC_WORDPRESS_API_URL,
});

const loggingLink = new ApolloLink((operation, forward) => {
  console.log(`GraphQL Request: ${operation.operationName}`, operation.variables);
  return forward(operation).map((response) => {
    console.log(`GraphQL Response: ${operation.operationName}`, response);
    return response;
  });
});

export function getClient() {
  return new ApolloClient({
    link: ApolloLink.from([loggingLink, httpLink]),
    cache: new InMemoryCache(),
  });
}

export const client = getClient();
