'use client';

import React, { useState } from 'react';
import { 
  Button, 
  TextField, 
  Typography, 
  Box, 
  Paper, 
  Alert, 
  CircularProgress,
  Divider
} from '@mui/material';

export default function SyncPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [productId, setProductId] = useState('');
  const [syncOutput, setSyncOutput] = useState('');

  const handleFullSync = async () => {
    setLoading(true);
    setResult(null);
    setSyncOutput('');
    
    try {
      const response = await fetch('/api/sync/woocommerce');
      const data = await response.json();
      
      setResult({
        success: data.success,
        message: data.message
      });
      
      if (data.details) {
        setSyncOutput(data.details);
      }
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProductSync = async () => {
    if (!productId) {
      setResult({
        success: false,
        message: 'Please enter a product ID'
      });
      return;
    }
    
    setLoading(true);
    setResult(null);
    setSyncOutput('');
    
    try {
      const response = await fetch(`/api/sync/woocommerce?productId=${productId}`);
      const data = await response.json();
      
      setResult({
        success: data.success,
        message: data.message
      });
      
      if (data.details) {
        setSyncOutput(data.details);
      }
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
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        WooCommerce Sync
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Full Sync
        </Typography>
        
        <Typography variant="body1" paragraph>
          Sync all variable products and their variations from WooCommerce to Typesense.
        </Typography>
        
        <Button
          variant="contained"
          color="primary"
          onClick={handleFullSync}
          disabled={loading}
          sx={{ mb: 2 }}
        >
          {loading ? <CircularProgress size={24} /> : 'Start Full Sync'}
        </Button>
        
        <Divider sx={{ my: 3 }} />
        
        <Typography variant="h6" gutterBottom>
          Sync Single Product
        </Typography>
        
        <Typography variant="body1" paragraph>
          Sync a specific product and its variations from WooCommerce to Typesense.
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <TextField
            label="Product ID"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            sx={{ mr: 2 }}
          />
          
          <Button
            variant="contained"
            color="primary"
            onClick={handleProductSync}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Sync Product'}
          </Button>
        </Box>
      </Paper>
      
      {result && (
        <Alert severity={result.success ? 'success' : 'error'} sx={{ mb: 3 }}>
          {result.message}
        </Alert>
      )}
      
      {syncOutput && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Sync Output
          </Typography>
          
          <Box 
            component="pre" 
            sx={{ 
              p: 2, 
              bgcolor: 'background.paper', 
              border: '1px solid', 
              borderColor: 'divider',
              borderRadius: 1,
              overflow: 'auto',
              maxHeight: 400,
              fontSize: '0.875rem'
            }}
          >
            {syncOutput}
          </Box>
        </Paper>
      )}
    </Box>
  );
}
