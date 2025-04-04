'use client';

import { useEffect, useState } from 'react';

interface SyncStatus {
  lastRun: string | null;
  lastDuration: number | null;
  productsProcessed: number;
  successCount: number;
  errorCount: number;
  lastError: string | null;
}

export default function StatusPage() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const [triggering, setTriggering] = useState(false);
  const [triggerResult, setTriggerResult] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStatus() {
      try {
        setLoading(true);
        const response = await fetch('/api/status-db');

        if (!response.ok) {
          throw new Error(`Failed to fetch status: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.message || 'Failed to fetch status');
        }

        setStatus(data.status);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }

    fetchStatus();

    // Set up auto-refresh every 30 seconds
    const intervalId = setInterval(() => {
      setRefreshCount(prev => prev + 1);
    }, 30000);

    return () => clearInterval(intervalId);
  }, [refreshCount]);

  function formatDate(dateString: string | null) {
    if (!dateString) return 'Never';

    const date = new Date(dateString);
    return date.toLocaleString();
  }

  function formatDuration(ms: number | null) {
    if (ms === null) return 'N/A';

    if (ms < 1000) return `${ms}ms`;

    const seconds = Math.floor(ms / 1000);
    const milliseconds = ms % 1000;

    return `${seconds}.${milliseconds}s`;
  }

  function handleRefresh() {
    setRefreshCount(prev => prev + 1);
  }

  async function handleTriggerSync() {
    try {
      setTriggering(true);
      setTriggerResult(null);

      // Get the API key from an input field or environment variable
      const apiKey = prompt('Enter the cron API key:');

      if (!apiKey) {
        setTriggerResult('API key is required');
        return;
      }

      const response = await fetch(`/api/cron/sync-stock?key=${apiKey}`);

      if (!response.ok) {
        throw new Error(`Failed to trigger sync: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to trigger sync');
      }

      setTriggerResult(`Sync triggered successfully: ${data.message}`);

      // Refresh the status after a short delay
      setTimeout(() => {
        setRefreshCount(prev => prev + 1);
      }, 2000);
    } catch (err) {
      setTriggerResult(err instanceof Error ? err.message : String(err));
    } finally {
      setTriggering(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Stock Sync Status</h1>

      <div className="mb-4 flex space-x-4">
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>

        <button
          onClick={handleTriggerSync}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
          disabled={triggering}
        >
          {triggering ? 'Triggering...' : 'Trigger Sync Now'}
        </button>
      </div>

      {triggerResult && (
        <div className={`mb-4 p-3 rounded ${triggerResult.includes('successfully') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {triggerResult}
        </div>
      )}

      {loading && <p className="text-gray-500">Loading status...</p>}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p><strong>Error:</strong> {error}</p>
        </div>
      )}

      {status && (
        <div className="bg-white shadow-md rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h2 className="text-xl font-semibold mb-2">Last Run</h2>
              <p className="text-gray-700">{formatDate(status.lastRun)}</p>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-2">Duration</h2>
              <p className="text-gray-700">{formatDuration(status.lastDuration)}</p>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-2">Products Processed</h2>
              <p className="text-gray-700">{status.productsProcessed}</p>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-2">Success Rate</h2>
              <p className="text-gray-700">
                {status.productsProcessed > 0
                  ? `${Math.round((status.successCount / status.productsProcessed) * 100)}%`
                  : 'N/A'}
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-2">Successful Updates</h2>
              <p className="text-green-600">{status.successCount}</p>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-2">Failed Updates</h2>
              <p className="text-red-600">{status.errorCount}</p>
            </div>
          </div>

          {status.lastError && (
            <div className="mt-6">
              <h2 className="text-xl font-semibold mb-2">Last Error</h2>
              <p className="text-red-600">{status.lastError}</p>
            </div>
          )}

          <div className="mt-6">
            <p className="text-sm text-gray-500">
              Auto-refreshes every 30 seconds. Last refreshed at {new Date().toLocaleTimeString()}.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
