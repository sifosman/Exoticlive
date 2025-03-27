'use client';
import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import { ThemeProvider } from '@mui/material/styles';
import theme from './theme.js';
import { useState, useEffect } from 'react';

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  const [{ cache, flush }] = useState(() => {
    const cache = createCache({ key: 'mui' });
    cache.compat = true;
    const prevInsert = cache.insert;
    let inserted: string[] = [];
    cache.insert = (...args) => {
      const serialized = args[1];
      if (cache.inserted[serialized.name] === undefined) {
        inserted.push(serialized.name);
      }
      return prevInsert(...args);
    };
    const flush = () => {
      const prevInserted = inserted;
      inserted = [];
      return prevInserted;
    };
    return { cache, flush };
  });

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = flush().map(name => cache.inserted[name]).join('');
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, [cache, flush]);

  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        {/* Remove the CssBaseline component and use a global style approach instead */}
        <style jsx global>{`
          body {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
        `}</style>
        {children}
      </ThemeProvider>
    </CacheProvider>
  );
}
