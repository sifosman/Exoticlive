'use client';

import React, { useState, useEffect } from 'react';
import {
  Button,
  TextField,
  Typography,
  Box,
  Paper,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel
} from '@mui/material';
import { request, gql } from 'graphql-request';

// GraphQL endpoint
const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_WORDPRESS_GRAPHQL_URL || 'https://wp.exoticshoes.co.za/graphql';

// GraphQL query for variable products
const VARIABLE_PRODUCTS_QUERY = gql`
  query VariableProducts {
    products(first: 100, where: { type: VARIABLE }) {
      nodes {
        id
        databaseId
        name
        ... on VariableProduct {
          variations {
            nodes {
              id
              databaseId
              name
              stockStatus
              stockQuantity
              attributes {
                nodes {
                  name
                  value
                }
              }
            }
          }
        }
      }
    }
  }
`;

export default function StockUpdatePage() {
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [variations, setVariations] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [listenerStatus, setListenerStatus] = useState<string>('unknown');
  const [listenerMode, setListenerMode] = useState<string>('subscription');
  const [pollingInterval, setPollingInterval] = useState<number>(60000);

  // Fetch products on mount
  useEffect(() => {
    fetchProducts();
    checkListenerStatus();
  }, []);

  // Fetch products from GraphQL
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await request(GRAPHQL_ENDPOINT, VARIABLE_PRODUCTS_QUERY);
      setProducts(data.products.nodes);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching products:', error);
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      setLoading(false);
    }
  };

  // Check the status of the stock listener
  const checkListenerStatus = async () => {
    try {
      const response = await fetch('/api/stock-listener');
      const data = await response.json();
      setListenerStatus(data.message);
      if (data.mode) {
        setListenerMode(data.mode);
      }
    } catch (error) {
      console.error('Error checking listener status:', error);
      setListenerStatus('Error checking status');
    }
  };

  // Restart the stock listener
  const restartListener = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/stock-listener', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mode: listenerMode,
          interval: pollingInterval
        })
      });
      const data = await response.json();
      setListenerStatus(data.message);
      if (data.mode) {
        setListenerMode(data.mode);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error restarting listener:', error);
      setListenerStatus('Error restarting listener');
      setLoading(false);
    }
  };

  // Handle product selection
  const handleProductChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const productId = event.target.value as string;
    setSelectedProduct(productId);

    if (productId) {
      const product = products.find(p => p.databaseId.toString() === productId);
      if (product && product.variations) {
        setVariations(product.variations.nodes);
      } else {
        setVariations([]);
      }
    } else {
      setVariations([]);
    }
  };

  // Update stock quantity
  const updateStock = async (variationId: string, stockQuantity: number) => {
    console.log('updateStock called with:', { variationId, stockQuantity, selectedProduct });

    if (!selectedProduct || !variationId) {
      console.error('Missing product or variation ID');
      setResult({
        success: false,
        message: 'Please select a product and variation'
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      console.log('Sending API request to update stock');
      const requestBody = {
        parentProductId: parseInt(selectedProduct),
        variationId: parseInt(variationId),
        stockQuantity
      };
      console.log('Request body:', requestBody);

      const response = await fetch('/api/stock/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('API response status:', response.status);
      const data = await response.json();
      console.log('API response data:', data);

      setResult({
        success: data.success,
        message: data.message
      });

      // If we have a product slug, try to revalidate the product page
      if (data.productSlug) {
        console.log(`Attempting to revalidate product page for slug: ${data.productSlug}`);
        try {
          // Call the revalidation API
          const revalidateResponse = await fetch('/api/revalidate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              path: `/product/${data.productSlug}`
            })
          });

          const revalidateData = await revalidateResponse.json();
          console.log('Revalidation response:', revalidateData);

          // Open the product page in a new tab to show the updated version
          window.open(`/product/${data.productSlug}?t=${Date.now()}`, '_blank');
        } catch (error) {
          console.error('Error revalidating product page:', error);
        }
      }

      // Refresh the products after update
      console.log('Refreshing products after update');
      fetchProducts();
    } catch (error) {
      console.error('Error updating stock:', error);
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle stock quantity change
  const handleStockChange = (variationId: string, newValue: string) => {
    console.log('handleStockChange called with:', { variationId, newValue });
    const stockQuantity = parseInt(newValue);
    if (!isNaN(stockQuantity)) {
      console.log('Updating stock to:', stockQuantity);
      updateStock(variationId, stockQuantity);
    } else {
      console.error('Invalid stock quantity:', newValue);
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Stock Management
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Stock Listener Status
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body1">
            Current Status: <strong>{listenerStatus}</strong>
          </Typography>
          <Typography variant="body1">
            Mode: <strong>{listenerMode}</strong>
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={listenerMode === 'subscription'}
                onChange={(e) => setListenerMode(e.target.checked ? 'subscription' : 'polling')}
              />
            }
            label="Use WebSocket Subscription"
          />
        </Box>

        {listenerMode === 'polling' && (
          <Box sx={{ mb: 2 }}>
            <TextField
              label="Polling Interval (ms)"
              type="number"
              value={pollingInterval}
              onChange={(e) => setPollingInterval(parseInt(e.target.value))}
              fullWidth
              margin="normal"
              helperText="How often to check for updates (in milliseconds)"
            />
          </Box>
        )}

        <Button
          variant="contained"
          color="primary"
          onClick={restartListener}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : 'Restart Listener'}
        </Button>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Update Stock Levels
        </Typography>

        <FormControl fullWidth margin="normal">
          <InputLabel id="product-select-label">Select Product</InputLabel>
          <Select
            labelId="product-select-label"
            value={selectedProduct}
            onChange={handleProductChange}
            label="Select Product"
          >
            <MenuItem value="">
              <em>Select a product</em>
            </MenuItem>
            {products.map((product) => (
              <MenuItem key={product.databaseId} value={product.databaseId.toString()}>
                {product.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {variations.length > 0 && (
          <TableContainer component={Paper} sx={{ mt: 3 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Variation</TableCell>
                  <TableCell>Attributes</TableCell>
                  <TableCell>Stock Status</TableCell>
                  <TableCell>Stock Quantity</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {variations.map((variation) => (
                  <TableRow key={variation.databaseId}>
                    <TableCell>{variation.name || `Variation #${variation.databaseId}`}</TableCell>
                    <TableCell>
                      {variation.attributes?.nodes?.map((attr: any) => (
                        <div key={attr.name}>
                          <strong>{attr.name}:</strong> {attr.value}
                        </div>
                      ))}
                    </TableCell>
                    <TableCell>
                      <span style={{
                        color: variation.stockStatus === 'IN_STOCK' ? 'green' : 'red',
                        fontWeight: 'bold'
                      }}>
                        {variation.stockStatus === 'IN_STOCK' ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </TableCell>
                    <TableCell>{variation.stockQuantity || 0}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <TextField
                          type="number"
                          defaultValue={variation.stockQuantity || 0}
                          size="small"
                          sx={{ width: 80, mr: 1 }}
                          id={`stock-input-${variation.databaseId}`}
                        />
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => {
                            console.log('Update button clicked for variation:', variation.databaseId);
                            const input = document.getElementById(`stock-input-${variation.databaseId}`) as HTMLInputElement;
                            console.log('Input element:', input);
                            console.log('Input value:', input?.value);
                            if (input && input.value) {
                              handleStockChange(variation.databaseId.toString(), input.value);
                            } else {
                              console.error('Could not find input element or value is empty');
                            }
                          }}
                        >
                          Update
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {result && (
          <Alert severity={result.success ? 'success' : 'error'} sx={{ mt: 3 }}>
            {result.message}
          </Alert>
        )}
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          How It Works
        </Typography>

        <Typography variant="body2" paragraph>
          This page uses GraphQL to fetch products and variations from WooCommerce, and updates stock levels in both WooCommerce and Typesense.
        </Typography>

        <Typography variant="body2" paragraph>
          The stock listener uses either WebSocket subscriptions or polling to detect stock changes in WooCommerce and automatically update Typesense.
        </Typography>

        <Typography variant="body2" paragraph>
          For this to work, you need to install the following WordPress plugins:
        </Typography>

        <ul>
          <li>WPGraphQL</li>
          <li>WPGraphQL for WooCommerce</li>
          <li>Exotic GraphQL Stock Sync</li>
        </ul>
      </Paper>
    </Box>
  );
}
