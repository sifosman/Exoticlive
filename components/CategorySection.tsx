'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

// Use the same categories as defined in Header
const categories = [
  { id: "dGVybToxNDc=", name: "Takkies", slug: "takkies" },
  { id: "dGVybToxNDQ=", name: "Heels", slug: "heels" },
  
  { id: "dGVybToxNDU=", name: "Sandals", slug: "sandals" },
  { id: "dGVybToxNDY=", name: "Pumps", slug: "pumps" },
  { id: "dGVybToxNDM=", name: "Boots", slug: "boots" },
  
  { id: "dGVybToxNDg=", name: "Mens", slug: "mens" }
];


const CategorySection = () => {
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
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Link href={`/products?category=${category.slug}`}>
              <div className="relative group cursor-pointer overflow-hidden rounded-lg shadow-md hover:shadow-lg transition-all duration-300">
                <div className="aspect-square relative">
                  <Image
                    src={`/categories/${category.slug}.webp`}
                    alt={category.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 flex items-end justify-center pb-4">
                    <h3 className="bg-white bg-opacity-20 backdrop-blur-sm text-white 
                      text-base font-montserrat font-medium tracking-wider text-center 
                      px-4 py-1.5 rounded-md">
                      {category.name}
                    </h3>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default CategorySection;
