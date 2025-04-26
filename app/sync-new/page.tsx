'use client';

import { useState } from 'react';

export default function SyncNewProductsPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleTriggerClick() {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/sync-new-products');
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to sync new products: ${response.status} ${response.statusText} - ${errorText}`);
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
      <h1 className="text-3xl font-bold mb-6">Sync New Products</h1>
      
      <div className="mb-6">
        <button
          onClick={handleTriggerClick}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition disabled:opacity-50"
        >
          {loading ? 'Syncing...' : 'Sync New Products'}
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
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="p-4 bg-gray-100 rounded">
              <p className="text-lg font-semibold">{result.stats?.total_checked || 0}</p>
              <p className="text-sm">Products Checked</p>
            </div>
            <div className="p-4 bg-blue-100 rounded">
              <p className="text-lg font-semibold">{result.stats?.new_products || 0}</p>
              <p className="text-sm">New Products</p>
            </div>
            <div className="p-4 bg-green-100 rounded">
              <p className="text-lg font-semibold">{result.stats?.success || 0}</p>
              <p className="text-sm">Successful</p>
            </div>
            <div className="p-4 bg-red-100 rounded">
              <p className="text-lg font-semibold">{result.stats?.failed || 0}</p>
              <p className="text-sm">Failed</p>
            </div>
          </div>
          
          {result.results && result.results.length > 0 && (
            <>
              <h3 className="text-lg font-semibold mb-2">New Products</h3>
              <div className="max-h-[400px] overflow-auto">
                <table className="min-w-full bg-white border border-gray-300">
                  <thead>
                    <tr>
                      <th className="py-2 px-4 border-b">ID</th>
                      <th className="py-2 px-4 border-b">Name</th>
                      <th className="py-2 px-4 border-b">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.results.map((item: any) => (
                      <tr key={item.id} className={item.success ? 'bg-green-50' : 'bg-red-50'}>
                        <td className="py-2 px-4 border-b">{item.id}</td>
                        <td className="py-2 px-4 border-b">{item.name}</td>
                        <td className="py-2 px-4 border-b">
                          {item.success ? (
                            <span className="text-green-600">Created</span>
                          ) : (
                            <span className="text-red-600">Failed: {item.error}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
      
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Instructions</h2>
        <p className="mb-4">
          This page allows you to manually sync newly created products from WooCommerce to Typesense.
        </p>
        <p className="mb-4">
          Use this when you've created new products in WooCommerce and want to make sure they appear on your website immediately.
        </p>
        <p className="mb-4">
          The cron job will automatically check for new products every 2 minutes, but you can use this page to force an immediate sync.
        </p>
      </div>
    </div>
  );
}
