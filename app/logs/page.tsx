'use client';

import { useEffect, useState } from 'react';

export default function LogsPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    async function fetchLogs() {
      if (!apiKey) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const response = await fetch(`/api/logs?key=${apiKey}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch logs: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.message || 'Failed to fetch logs');
        }
        
        setLogs(data.logs);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }
    
    fetchLogs();
    
    // Set up auto-refresh every 30 seconds if API key is provided
    let intervalId: NodeJS.Timeout | null = null;
    
    if (apiKey) {
      intervalId = setInterval(() => {
        setRefreshCount(prev => prev + 1);
      }, 30000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [refreshCount, apiKey]);
  
  function handleRefresh() {
    setRefreshCount(prev => prev + 1);
  }
  
  function handleApiKeyChange(e: React.ChangeEvent<HTMLInputElement>) {
    setApiKey(e.target.value);
  }
  
  function handleApiKeySubmit(e: React.FormEvent) {
    e.preventDefault();
    setRefreshCount(prev => prev + 1);
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Sync Logs</h1>
      
      <form onSubmit={handleApiKeySubmit} className="mb-6">
        <div className="flex items-center space-x-4">
          <div className="flex-grow">
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
              Admin API Key
            </label>
            <input
              type="password"
              id="apiKey"
              value={apiKey}
              onChange={handleApiKeyChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter admin API key"
            />
          </div>
          <div className="pt-6">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
              disabled={!apiKey || loading}
            >
              {loading ? 'Loading...' : 'View Logs'}
            </button>
          </div>
        </div>
      </form>
      
      {apiKey && (
        <div className="mb-4">
          <button 
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh Logs'}
          </button>
        </div>
      )}
      
      {loading && apiKey && <p className="text-gray-500">Loading logs...</p>}
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p><strong>Error:</strong> {error}</p>
        </div>
      )}
      
      {!apiKey && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          <p>Please enter the admin API key to view logs.</p>
        </div>
      )}
      
      {apiKey && logs.length === 0 && !loading && !error && (
        <div className="bg-gray-100 border border-gray-400 text-gray-700 px-4 py-3 rounded mb-4">
          <p>No logs found.</p>
        </div>
      )}
      
      {logs.length > 0 && (
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Logs</h2>
          
          <div className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-[600px]">
            {logs.map((log, index) => (
              <div key={index} className="mb-2 font-mono text-sm">
                {log}
              </div>
            ))}
          </div>
          
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
