'use client';

import Image from 'next/image';
import Link from 'next/link';

const BodyBanner = () => {
  return (
    <div className="my-12 mx-auto w-[90%]">
      <div className="relative w-full h-[250px]">
        <Image
          src="/banner/body-banner.webp"
          alt="Banner"
          fill
          priority
          sizes="90vw"
          style={{
            objectFit: 'contain',
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Link 
            href="/products" 
            className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white 
              font-lato text-md tracking-wider rounded-md transition-all duration-300
              hover:scale-105 px-8 py-2 backdrop-blur-sm"
          >
            SHOP NOW
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BodyBanner;
