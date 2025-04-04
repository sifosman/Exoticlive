'use client';

import { useState } from 'react';

export default function VercelTriggerPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleTriggerClick() {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/cron-vercel');
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to trigger cron job: ${response.status} ${response.statusText} - ${errorText}`);
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
      <h1 className="text-3xl font-bold mb-6">Vercel Cron Job Trigger</h1>
      
      <div className="mb-6">
        <button
          onClick={handleTriggerClick}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition disabled:opacity-50"
        >
          {loading ? 'Triggering...' : 'Trigger Vercel Cron Job'}
        </button>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <h2 className="text-lg font-semibold mb-2">Error</h2>
          <pre className="whitespace-pre-wrap">{error}</pre>
        </div>
      )}
      
      {result && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Result</h2>
          <pre className="p-4 bg-gray-100 rounded overflow-auto max-h-[400px]">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
      
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Instructions</h2>
        <p className="mb-4">
          This page allows you to manually trigger the Vercel cron job that syncs stock data from WooCommerce to Typesense.
        </p>
        <p className="mb-4">
          Click the "Trigger Vercel Cron Job" button above to start the sync process. The result will be displayed below.
        </p>
        <p className="mb-4">
          This is the same endpoint that Vercel's cron system will call automatically every 2 minutes.
        </p>
      </div>
    </div>
  );
}
