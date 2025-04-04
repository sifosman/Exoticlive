'use client';

import React, { useState } from 'react';
import { Button, TextField, Typography, Box, Paper, Alert, CircularProgress } from '@mui/material';

export default function StockUpdatePage() {
  const [parentProductId, setParentProductId] = useState('');
  const [variationId, setVariationId] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!parentProductId || !variationId || !stockQuantity) {
      setResult({
        success: false,
        message: 'Please fill in all fields'
      });
      return;
    }
    
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/stock/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          parentProductId: parseInt(parentProductId),
          variationId: parseInt(variationId),
          stockQuantity: parseInt(stockQuantity)
        })
      });
      
      const data = await response.json();
      
      setResult({
        success: data.success,
        message: data.message
      });
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Stock Update Tool
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="body1" paragraph>
          Use this tool to update stock quantities for product variations. The stock will be updated in both WooCommerce and Typesense.
        </Typography>
        
        <form onSubmit={handleSubmit}>
          <TextField
            label="Parent Product ID"
            value={parentProductId}
            onChange={(e) => setParentProductId(e.target.value)}
            fullWidth
            margin="normal"
            type="number"
            required
            helperText="The ID of the parent variable product"
          />
          
          <TextField
            label="Variation ID"
            value={variationId}
            onChange={(e) => setVariationId(e.target.value)}
            fullWidth
            margin="normal"
            type="number"
            required
            helperText="The ID of the variation to update"
          />
          
          <TextField
            label="Stock Quantity"
            value={stockQuantity}
            onChange={(e) => setStockQuantity(e.target.value)}
            fullWidth
            margin="normal"
            type="number"
            required
            helperText="The new stock quantity (0 for out of stock)"
          />
          
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            sx={{ mt: 2 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Update Stock'}
          </Button>
        </form>
      </Paper>
      
      {result && (
        <Alert severity={result.success ? 'success' : 'error'} sx={{ mb: 3 }}>
          {result.message}
        </Alert>
      )}
      
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          How to Find Product IDs
        </Typography>
        
        <Typography variant="body2" paragraph>
          1. Go to WooCommerce &gt; Products
        </Typography>
        
        <Typography variant="body2" paragraph>
          2. Find the variable product and click "Edit"
        </Typography>
        
        <Typography variant="body2" paragraph>
          3. The parent product ID is in the URL (e.g., post=123)
        </Typography>
        
        <Typography variant="body2" paragraph>
          4. Go to the Variations tab
        </Typography>
        
        <Typography variant="body2" paragraph>
          5. Expand a variation to see its ID (e.g., #456)
        </Typography>
      </Paper>
    </Box>
  );
}
