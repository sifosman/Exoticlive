'use client';

import { useEffect, useState } from 'react';

export default function StockListener() {
  const [status, setStatus] = useState<string>('Initializing...');
  const [mode, setMode] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Start the stock update listener
    fetch('/api/stock-listener')
      .then(response => response.json())
      .then(data => {
        setStatus(data.message);
        setMode(data.mode || '');
        setError(null);
      })
      .catch(error => {
        setStatus('Error starting stock listener');
        setError(error.message);
      });
      
    // Clean up on unmount
    return () => {
      fetch('/api/stock-listener', { method: 'DELETE' })
        .then(response => response.json())
        .then(data => console.log('Stock listener stopped:', data))
        .catch(error => console.error('Error stopping stock listener:', error));
    };
  }, []);

  return (
    <div style={{ display: 'none' }}>
      {/* Hidden component that manages the stock listener */}
      {/* Status: {status} */}
      {/* Mode: {mode} */}
      {/* Error: {error} */}
    </div>
  );
}
