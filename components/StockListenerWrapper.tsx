'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the StockListener component with client-side only rendering
const StockListener = dynamic(() => import('./StockListener'), {
  ssr: false,
});

export default function StockListenerWrapper() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Only render the StockListener on the client side
  if (!isClient) return null;

  return <StockListener />;
}
