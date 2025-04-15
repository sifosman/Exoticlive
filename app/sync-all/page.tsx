'use client';

import { useState } from 'react';

export default function SyncAllPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleTriggerClick() {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/sync-all');
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to sync all products: ${response.status} ${response.statusText} - ${errorText}`);
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
      <h1 className="text-3xl font-bold mb-6">Sync All Products</h1>
      
      <div className="mb-6">
        <button
          onClick={handleTriggerClick}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition disabled:opacity-50"
        >
          {loading ? 'Syncing...' : 'Sync All Products'}
        </button>
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
          <p>This may take several minutes. Please do not close this page.</p>
        </div>
      )}
      
      {result && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Result</h2>
          <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded mb-4">
            <p className="font-semibold">{result.message}</p>
            <p>Duration: {result.duration / 1000} seconds</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <div className="p-4 bg-gray-100 rounded">
              <p className="text-lg font-semibold">{result.stats?.total || 0}</p>
              <p className="text-sm">Total Products</p>
            </div>
            <div className="p-4 bg-green-100 rounded">
              <p className="text-lg font-semibold">{result.stats?.success || 0}</p>
              <p className="text-sm">Successful</p>
            </div>
            <div className="p-4 bg-red-100 rounded">
              <p className="text-lg font-semibold">{result.stats?.failed || 0}</p>
              <p className="text-sm">Failed</p>
            </div>
            <div className="p-4 bg-blue-100 rounded">
              <p className="text-lg font-semibold">{result.stats?.created || 0}</p>
              <p className="text-sm">Created</p>
            </div>
            <div className="p-4 bg-yellow-100 rounded">
              <p className="text-lg font-semibold">{result.stats?.updated || 0}</p>
              <p className="text-sm">Updated</p>
            </div>
            <div className="p-4 bg-purple-100 rounded">
              <p className="text-lg font-semibold">{result.stats?.featured || 0}</p>
              <p className="text-sm">Featured</p>
            </div>
          </div>
          
          <h3 className="text-lg font-semibold mb-2">Details</h3>
          <div className="max-h-[400px] overflow-auto">
            <table className="min-w-full bg-white border border-gray-300">
              <thead>
                <tr>
                  <th className="py-2 px-4 border-b">ID</th>
                  <th className="py-2 px-4 border-b">Name</th>
                  <th className="py-2 px-4 border-b">Action</th>
                  <th className="py-2 px-4 border-b">Status</th>
                </tr>
              </thead>
              <tbody>
                {result.results?.map((item: any) => (
                  <tr key={item.id} className={item.success ? 'bg-green-50' : 'bg-red-50'}>
                    <td className="py-2 px-4 border-b">{item.id}</td>
                    <td className="py-2 px-4 border-b">{item.name}</td>
                    <td className="py-2 px-4 border-b">{item.action || 'N/A'}</td>
                    <td className="py-2 px-4 border-b">
                      {item.success ? (
                        <span className="text-green-600">Success</span>
                      ) : (
                        <span className="text-red-600">Failed: {item.error}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Instructions</h2>
        <p className="mb-4">
          This page allows you to manually sync all products from WooCommerce to Typesense.
        </p>
        <p className="mb-4">
          Use this when you need to ensure that all products are properly synchronized, especially if you're seeing missing products in your store.
        </p>
        <p className="mb-4 text-red-600 font-semibold">
          Warning: This operation may take several minutes to complete, depending on the number of products in your store.
        </p>
      </div>
    </div>
  );
}
