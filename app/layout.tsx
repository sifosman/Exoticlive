import './globals.css';
import type { Metadata } from 'next';
import { Inter, Playfair_Display, Lato } from 'next/font/google';
import ThemeRegistry from './ThemeRegistry';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ApolloWrapper from '@/components/ApolloWrapper';
import { CartProvider } from '@/lib/cartContext';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });
const playfairDisplay = Playfair_Display({ 
  subsets: ['latin'],
  variable: '--font-playfair',
});
const lato = Lato({ 
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Exotic Shoes',
  description: 'Premium wholesale ladies shoes for your business',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${playfairDisplay.variable}`}>
          <body className={`${inter.className} font-sans ${lato.className}`}>
        <ThemeRegistry>
          <ApolloWrapper>
            <CartProvider>
              <Header />
              <main className="min-h-screen pt-[140px]">
                <div className={playfairDisplay.className}>{children}</div>
              </main>
              <Footer />
              <Toaster />
            </CartProvider>
          </ApolloWrapper>
        </ThemeRegistry>
      </body>
    </html>
  );
}
