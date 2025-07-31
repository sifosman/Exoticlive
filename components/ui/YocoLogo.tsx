'use client';

import React from 'react';
import Image from 'next/image';

interface YocoLogoProps {
  className?: string;
  height?: number;
}

const YocoLogo: React.FC<YocoLogoProps> = ({ className = '', height = 16 }) => {
  return (
    <div className={`relative ${className}`} style={{ height: `${height}px`, width: 'auto', maxWidth: '80px' }}>
      <Image
        src="/yoco-logo.png"
        alt="Yoco"
        width={80}
        height={height}
        style={{
          height: `${height}px`,
          width: 'auto',
          maxWidth: '80px',
          objectFit: 'contain'
        }}
      />
    </div>
  );
};

export default YocoLogo;
