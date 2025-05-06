'use client';

import { useState } from 'react';

export default function ForceSyncPage() {
  const [productId, setProductId] = useState<string>('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleForceSyncClick() {
    if (!productId) {
      setError('Please enter a product ID');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResult(null);
      
      const response = await fetch(`/api/force-sync?id=${productId}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to force sync: ${response.status} ${response.statusText} - ${errorText}`);
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
      <h1 className="text-3xl font-bold mb-6">Force Sync Product</h1>
      
      <div className="mb-6">
        <label htmlFor="productId" className="block text-sm font-medium text-gray-700 mb-2">
          Product ID
        </label>
        <div className="flex">
          <input
            type="text"
            id="productId"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            placeholder="Enter WooCommerce product ID"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-l focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleForceSyncClick}
            disabled={loading || !productId}
            className="px-4 py-2 bg-blue-500 text-white rounded-r hover:bg-blue-600 transition disabled:opacity-50"
          >
            {loading ? 'Syncing...' : 'Force Sync'}
          </button>
        </div>
        <p className="mt-2 text-sm text-gray-500">
          Enter the WooCommerce product ID to force sync it to Typesense
        </p>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <h2 className="text-lg font-semibold mb-2">Error</h2>
          <pre className="whitespace-pre-wrap">{error}</pre>
        </div>
      )}
      
      {loading && (
        <div className="mb-6 p-4 bg-blue-100 border border-blue-400 text-blue-700 rounded">
          <h2 className="text-lg font-semibold mb-2">Syncing...</h2>
          <p>This may take a few moments. Please do not close this page.</p>
        </div>
      )}
      
      {result && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Result</h2>
          <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded mb-4">
            <p className="font-semibold">{result.message}</p>
            <p>Duration: {result.duration / 1000} seconds</p>
          </div>
          
          <div className="p-4 bg-white border border-gray-300 rounded">
            <h3 className="text-md font-semibold mb-2">Product Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">ID</p>
                <p>{result.product.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p>{result.product.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Type</p>
                <p className="capitalize">{result.product.type}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Variations</p>
                <p>{result.product.variations_count}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Action</p>
                <p className="capitalize">{result.product.action}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Timestamp</p>
                <p>{new Date(result.timestamp).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Instructions</h2>
        <p className="mb-4">
          This page allows you to manually force sync a specific product from WooCommerce to Typesense.
        </p>
        <p className="mb-4">
          Use this when you've created or updated a product in WooCommerce and want to make sure it appears on your website immediately.
        </p>
        <p className="mb-4">
          This is especially useful for variable products that might not be syncing correctly through the automatic process.
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
