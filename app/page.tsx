"use client";

import dynamic from 'next/dynamic';
import FeaturedProducts from '@/components/FeaturedProducts';
import SlidingBanner from '@/components/SlidingBanner';
import CategorySection from '@/components/CategorySection';
import BodyBanner from '@/components/BodyBanner';
import NewsletterSignup from '@/components/NewsletterSignup';
import ResellBanner from '@/components/ResellBanner';

const FastSellingProducts = dynamic(() => import('@/components/FastSellingProducts'), { ssr: false });

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between">
      <SlidingBanner />
      <CategorySection />
      <FeaturedProducts />
      <BodyBanner />
      <FastSellingProducts />
      <NewsletterSignup />
      <ResellBanner />
    </main>
  );
}
