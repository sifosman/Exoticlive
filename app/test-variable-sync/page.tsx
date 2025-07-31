'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function TestVariableSyncPage() {
  const [productId, setProductId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSyncClick() {
    if (!productId) {
      setError('Please enter a product ID');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResult(null);
      
      const response = await fetch(`/api/sync-variable?id=${productId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to sync: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Test Variable Product Sync</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Sync Variable Product</CardTitle>
          <CardDescription>
            Enter a WooCommerce variable product ID to sync it to Typesense
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              type="text"
              placeholder="Enter product ID"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="max-w-xs"
            />
            <Button 
              onClick={handleSyncClick} 
              disabled={loading || !productId}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                'Sync Product'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {result && (
        <Alert variant="default" className="mb-6 bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Success</AlertTitle>
          <AlertDescription className="text-green-700">
            {result.message}
            
            {result.product && (
              <div className="mt-2">
                <p><strong>Product:</strong> {result.product.name}</p>
                <p><strong>ID:</strong> {result.product.id}</p>
                <p><strong>Type:</strong> {result.product.type}</p>
                <p><strong>Variations:</strong> {result.product.variations_count}</p>
              </div>
            )}
            
            <p className="mt-2 text-sm text-green-600">
              Completed in {result.duration}ms at {new Date(result.timestamp).toLocaleString()}
            </p>
          </AlertDescription>
        </Alert>
      )}
      
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Instructions</h2>
        <p className="mb-4">
          This page allows you to manually sync a variable product from WooCommerce to Typesense.
        </p>
        <p className="mb-4">
          Use this when you've created a variable product in WooCommerce and it's not appearing correctly on your website.
        </p>
        <div className="p-4 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded">
          <h3 className="font-semibold mb-2">How to find the product ID</h3>
          <p>You can find the product ID in WooCommerce by:</p>
          <ol className="list-decimal list-inside mt-2">
            <li>Go to WooCommerce &gt; Products</li>
            <li>Hover over the product name</li>
            <li>Look at the URL in the browser's status bar - it will contain something like "post=123"</li>
            <li>The number after "post=" is the product ID</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
