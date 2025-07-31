"use client";

import dynamic from 'next/dynamic';

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  const ApolloWrapper = dynamic(
    () => import('@/components/ApolloWrapper').then((mod) => mod.default),
    { ssr: false }
  );

  const CartProvider = dynamic(
    () => import('@/lib/cartContext').then((mod) => mod.default),
    { ssr: false }
  );

  const Toaster = dynamic(
    () => import('@/components/ui/toaster').then((mod) => mod.Toaster),
    { ssr: false }
  );

  return (
    <ApolloWrapper>
      <CartProvider>
        {children}
        <Toaster />
      </CartProvider>
    </ApolloWrapper>
  );
}