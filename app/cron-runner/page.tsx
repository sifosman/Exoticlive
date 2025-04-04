'use client';

import { useState, useEffect, useRef } from 'react';

export default function CronRunnerPage() {
  const [status, setStatus] = useState<'idle' | 'running' | 'paused'>('idle');
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [nextRun, setNextRun] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [interval, setInterval] = useState<number>(120); // 2 minutes in seconds
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Add a log entry
  const addLog = (message: string) => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    setLogs(prev => [logEntry, ...prev].slice(0, 100)); // Keep only the last 100 logs
  };

  // Run the sync
  const runSync = async () => {
    try {
      addLog('Starting sync...');
      setLastRun(new Date().toISOString());
      
      const response = await fetch('/api/sync-simple');
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Sync failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        addLog(`Sync completed in ${data.duration}ms. Processed ${data.results?.length || 0} products.`);
      } else {
        addLog(`Sync failed: ${data.message}`);
      }
      
      // Calculate next run time
      const nextRunTime = new Date(Date.now() + interval * 1000);
      setNextRun(nextRunTime.toISOString());
      
    } catch (error) {
      addLog(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Start the cron job
  const startCron = () => {
    if (status === 'running') return;
    
    addLog('Starting cron job...');
    setStatus('running');
    
    // Run immediately
    runSync();
    
    // Set up the timer
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          runSync();
          return interval;
        }
        return prev - 1;
      });
    }, 1000);
    
    setCountdown(interval);
  };

  // Pause the cron job
  const pauseCron = () => {
    if (status !== 'running') return;
    
    addLog('Pausing cron job...');
    setStatus('paused');
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Reset the cron job
  const resetCron = () => {
    pauseCron();
    setStatus('idle');
    setLastRun(null);
    setNextRun(null);
    setCountdown(0);
    addLog('Cron job reset.');
  };

  // Update interval
  const handleIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newInterval = parseInt(e.target.value);
    if (newInterval >= 10) { // Minimum 10 seconds
      setInterval(newInterval);
      setCountdown(newInterval);
      addLog(`Interval updated to ${newInterval} seconds.`);
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Cron Job Runner</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <div className="bg-white shadow-md rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Control Panel</h2>
            
            <div className="mb-4">
              <div className="flex items-center mb-2">
                <span className="font-semibold mr-2">Status:</span>
                <span className={`px-2 py-1 rounded text-white ${
                  status === 'running' ? 'bg-green-500' : 
                  status === 'paused' ? 'bg-yellow-500' : 'bg-gray-500'
                }`}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
              </div>
              
              {lastRun && (
                <div className="mb-2">
                  <span className="font-semibold">Last Run:</span> {new Date(lastRun).toLocaleString()}
                </div>
              )}
              
              {nextRun && status === 'running' && (
                <div className="mb-2">
                  <span className="font-semibold">Next Run:</span> {new Date(nextRun).toLocaleString()}
                </div>
              )}
              
              {status === 'running' && (
                <div className="mb-2">
                  <span className="font-semibold">Next Run In:</span> {formatTime(countdown)}
                </div>
              )}
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Run Interval (seconds)
              </label>
              <input
                type="number"
                value={interval}
                onChange={handleIntervalChange}
                min="10"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                disabled={status === 'running'}
              />
              <p className="text-sm text-gray-500 mt-1">
                Minimum: 10 seconds. Recommended: 120 seconds (2 minutes).
              </p>
            </div>
            
            <div className="flex flex-wrap gap-4">
              {status !== 'running' && (
                <button
                  onClick={startCron}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
                >
                  Start
                </button>
              )}
              
              {status === 'running' && (
                <button
                  onClick={pauseCron}
                  className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition"
                >
                  Pause
                </button>
              )}
              
              <button
                onClick={resetCron}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
              >
                Reset
              </button>
              
              <button
                onClick={() => runSync()}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
              >
                Run Now
              </button>
            </div>
          </div>
          
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Instructions</h2>
            
            <div className="prose">
              <p>
                This page acts as a browser-based cron job runner for syncing WooCommerce stock data to Typesense.
              </p>
              
              <h3>How to Use</h3>
              <ol>
                <li>Set the desired interval (default: 120 seconds)</li>
                <li>Click "Start" to begin the automatic sync process</li>
                <li>Keep this page open in a browser tab</li>
                <li>The sync will run automatically at the specified interval</li>
              </ol>
              
              <h3>Important Notes</h3>
              <ul>
                <li>This page must remain open for the cron job to run</li>
                <li>If you close this page, the cron job will stop</li>
                <li>You can pause and resume the cron job at any time</li>
                <li>Click "Run Now" to manually trigger a sync</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Logs</h2>
          
          <div className="bg-gray-100 p-4 rounded-lg h-[600px] overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500">No logs yet. Start the cron job to see logs.</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="font-mono text-sm mb-1">
                  {log}
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
