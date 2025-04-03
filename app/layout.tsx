import './globals.css';
import type { Metadata } from 'next';
import { Inter, Playfair_Display, Lato } from 'next/font/google';
import ThemeRegistry from './ThemeRegistry';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import dynamic from 'next/dynamic';
import ClientProviders from './ClientProviders';

const inter = Inter({ subsets: ['latin'] });
const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
});
const lato = Lato({
  subsets: ['latin'],
  weight: ['100', '300', '400', '700', '900'],
  display: 'swap',
  variable: '--font-lato',
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
    <html lang="en" className={`${playfairDisplay.variable} ${lato.variable}`}>
      <body className={`bg-white`}>
        <ThemeRegistry>
          <ClientProviders>
              <Header />
              <main className="min-h-screen pt-[36px]">
                {children}
              </main>
              <Footer />
            </ClientProviders>
        </ThemeRegistry>
      </body>
    </html>
  );
}
