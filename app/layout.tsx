import './globals.css';
import './critical.css';
import type { Metadata } from 'next';
import { Inter, Playfair_Display, Lato } from 'next/font/google';
import ThemeRegistry from './ThemeRegistry';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import dynamic from 'next/dynamic';
import ClientProviders from './ClientProviders';
import Script from 'next/script';

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
    <html lang="en" className={`${playfairDisplay.variable} ${lato.variable} fonts-not-loaded`}>
      <head>
        {/* Preload critical CSS */}
        <link rel="preload" href="/globals.css" as="style" />

        {/* Preload Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preload" href="https://fonts.googleapis.com/css2?family=Playfair+Display&display=swap" as="style" />
        <link rel="preload" href="https://fonts.googleapis.com/css2?family=Lato:wght@100;300;400;700;900&display=swap" as="style" />

        {/* Preload critical images */}
        <link rel="preload" href="/yoco-logo.png" as="image" />

        {/* Preload Swiper CSS */}
        <link rel="preload" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css" as="style" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css" />

        {/* Preload Yoco SDK */}
        <link rel="preload" href="https://js.yoco.com/sdk/v1/yoco-sdk-web.js" as="script" />

        {/* Add font display settings */}
        <style dangerouslySetInnerHTML={{
          __html: `
            @font-face {
              font-family: 'Didot';
              src: url('/fonts/Didot.woff2') format('woff2'),
                   url('/fonts/Didot.woff') format('woff');
              font-weight: thin;
              font-style: normal;
              font-display: swap;
            }

            @font-face {
              font-family: 'Bodoni';
              src: url('/fonts/Bodoni.woff2') format('woff2'),
                   url('/fonts/Bodoni.woff') format('woff');
              font-weight: normal;
              font-style: normal;
              font-display: swap;
            }

            /* Add a base style to prevent layout shifts */
            body {
              min-height: 100vh;
              background-color: white;
            }
          `
        }} />
      </head>
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

        {/* Add script to handle font loading */}
        <Script id="font-loading-script" strategy="afterInteractive">
          {`
            // Add a class to the document when fonts are loaded
            document.fonts.ready.then(() => {
              document.documentElement.classList.add('fonts-loaded');
            });

            // Add a class to the document when the page is fully loaded
            window.addEventListener('load', () => {
              document.documentElement.classList.add('page-loaded');
            });
          `}
        </Script>
      </body>
    </html>
  );
}
