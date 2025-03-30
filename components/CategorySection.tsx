'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';

// Use the same categories as defined in Header
const categories = [
  { id: "dGVybToxNDc=", name: "Takkies", slug: "takkies" },
  { id: "dGVybToxNDQ=", name: "Heels", slug: "heels" },
  { id: "dGVybToxNDU=", name: "Sandals", slug: "sandals" },
  { id: "dGVybToxNDY=", name: "Pumps", slug: "pumps" },
  { id: "dGVybToxNDM=", name: "Boots", slug: "boots" },
  { id: "dGVybToxNDg=", name: "Mens", slug: "mens" },
  { id: "dGVybToxNDk=", name: "Bargain Box", slug: "bargain-box" }
];

const CategorySection = () => {
  const [imagesLoaded, setImagesLoaded] = useState(false);

  return (
    <section className="w-full py-12 px-4 font-lato">
      <h2 className="text-3xl font-lato font-light tracking-wider text-center mb-8">
        Shop by Category
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
        {categories.map((category, index) => (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: imagesLoaded ? 1 : 0, y: imagesLoaded ? 0 : 20 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className={`${category.slug === 'bargain-box' ? 'col-span-2 md:col-span-3' : ''}`}
          >
            <Link href={`/shop?category=${category.slug}`} className="font-lato">
              <div className="relative group cursor-pointer overflow-hidden rounded-lg shadow-md hover:shadow-lg transition-all duration-300">
                {category.slug === 'bargain-box' ? (
                  <div className="relative w-full h-auto overflow-hidden">
                    {!imagesLoaded && (
                      <Skeleton className="w-full h-full absolute" />
                    )}
                    <div className="relative" style={{ width: '100%', paddingBottom: '56.1%' }}>
                      <Image
                        src="/bargainbox.webp"
                        alt={category.name}
                        fill
                        className="object-contain group-hover:scale-105 transition-transform duration-300"
                        onLoad={() => setImagesLoaded(true)}
                      />
                    </div>
                    {/* Category name with special styling for Bargain Box */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <h3 className="text-white text-2xl md:text-3xl font-lato font-medium tracking-wider text-center px-6 py-3 rounded
                                   bg-black/30 backdrop-blur-sm border border-white/20 shadow-lg transform group-hover:scale-105 transition-transform duration-300">
                        {category.name}
                      </h3>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-square relative">
                    {!imagesLoaded && (
                      <Skeleton className="w-full h-full absolute" />
                    )}
                    <Image
                      src={`/categories/${category.slug}.webp`}
                      alt={category.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      onLoad={() => setImagesLoaded(true)}
                    />
                    <div className="absolute inset-0 flex items-end justify-center pb-2 md:pb-4">
                      <h3 className="bg-white bg-opacity-20 backdrop-blur-sm text-white 
                        text-xs md:text-base 
                        font-lato font-medium tracking-wider text-center 
                        px-2 md:px-4 
                        py-1 md:py-1.5 
                        rounded">
                        {category.name}
                      </h3>
                    </div>
                  </div>
                )}
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default CategorySection;
