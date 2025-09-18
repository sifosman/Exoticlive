'use client';

import Image from 'next/image';
import Link from 'next/link';

const BodyBanner = () => {
  return (
    <div className="my-8 md:my-12 mx-auto w-[95%] md:w-[90%]">
      <div className="relative w-full h-[350px] sm:h-[300px] md:h-[250px]">
        <Image
          src="/banner/body-banner.webp"
          alt="Banner"
          fill
          priority
          sizes="(max-width: 640px) 95vw, 90vw"
          style={{
            objectFit: 'cover',
            objectPosition: 'center',
          }}
          className="rounded-md"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Link 
            href="/shop" 
            className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white 
              font-lato text-lg md:text-md tracking-wider rounded-md transition-all duration-300
              hover:scale-105 px-8 py-3 md:py-2 backdrop-blur-sm"
          >
            SHOP NOW
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BodyBanner;
