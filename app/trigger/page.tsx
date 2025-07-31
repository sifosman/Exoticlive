'use client';

import { useState, useEffect } from 'react';

export default function TriggerPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoSync, setAutoSync] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(120);

  // Function to trigger the sync
  async function triggerSync() {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/trigger-sync');
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to trigger sync: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const data = await response.json();
      setResult(data);
      setLastSync(new Date().toISOString());
      
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setLoading(false);
    }
  }

  // Auto-sync effect
  useEffect(() => {
    if (!autoSync) return;
    
    // Reset countdown
    setCountdown(120);
    
    // Set up countdown timer
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // Trigger sync when countdown reaches 0
          triggerSync();
          return 120; // Reset countdown
        }
        return prev - 1;
      });
    }, 1000);
    
    // Clean up
    return () => clearInterval(countdownInterval);
  }, [autoSync, lastSync]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Stock Sync Trigger</h1>
      
      <div className="mb-6 flex flex-col md:flex-row md:items-center gap-4">
        <button
          onClick={() => triggerSync()}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition disabled:opacity-50"
        >
          {loading ? 'Syncing...' : 'Sync Now'}
        </button>
        
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="autoSync"
            checked={autoSync}
            onChange={(e) => setAutoSync(e.target.checked)}
            className="h-5 w-5"
          />
          <label htmlFor="autoSync" className="text-lg">
            Auto-sync every 2 minutes
          </label>
        </div>
        
        {autoSync && (
          <div className="text-gray-600">
            Next sync in: <span className="font-mono">{Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}</span>
          </div>
        )}
      </div>
      
      {lastSync && (
        <div className="mb-6">
          <p className="text-gray-600">
            Last sync: {new Date(lastSync).toLocaleString()}
          </p>
        </div>
      )}
      
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
          This page allows you to manually trigger the stock sync or set it to automatically sync every 2 minutes.
        </p>
        <p className="mb-4">
          <strong>Sync Now:</strong> Click this button to immediately sync stock data from WooCommerce to Typesense.
        </p>
        <p className="mb-4">
          <strong>Auto-sync:</strong> Check this box to automatically sync every 2 minutes. This simulates a cron job in the browser.
        </p>
        <p className="text-red-600">
          <strong>Note:</strong> Auto-sync only works while this page is open. Keep this page open in a tab to maintain automatic syncing.
        </p>
      </div>
    </div>
  );
}
