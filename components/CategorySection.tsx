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
    <section className="w-full py-12 px-4">
      <h2 className="text-3xl font-montserrat font-light tracking-wider text-center mb-8">
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
            <Link href={`/products?category=${category.slug}`}>
              <div className="relative group cursor-pointer overflow-hidden rounded-lg shadow-md hover:shadow-lg transition-all duration-300">
                {category.slug === 'bargain-box' ? (
                  <div className="relative aspect-[3/1] bg-gradient-to-br from-custom-charcoal via-[#3a3a3a] to-custom-charcoal overflow-hidden">
                    {/* Modern geometric pattern */}
                    <div className="absolute inset-0">
                      <div className="absolute w-full h-full">
                        {/* Diagonal lines */}
                        <div className="absolute inset-0" style={{
                          backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 50px)',
                          backgroundSize: '100px 100px'
                        }}></div>
                        {/* Bottom wave */}
                        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-r from-white/10 via-white/5 to-white/10"
                             style={{
                               clipPath: 'polygon(0 70%, 30% 100%, 50% 80%, 70% 100%, 100% 60%, 100% 100%, 0 100%)'
                             }}></div>
                      </div>
                    </div>
                    {/* Category name with special styling for Bargain Box */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <h3 className="text-white text-2xl md:text-3xl font-montserrat font-medium tracking-wider text-center px-6 py-3 rounded
                                   bg-white/10 backdrop-blur-sm border border-white/20 shadow-lg transform group-hover:scale-105 transition-transform duration-300">
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
                        font-montserrat font-medium tracking-wider text-center 
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
