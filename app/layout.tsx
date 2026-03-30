import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { CookieBanner } from '@/components/cookie-banner';
import { ChunkErrorHandler } from '@/components/chunk-error-handler';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Kostenlos Allergenliste erstellen - Kostenlos & Professionell | Für Gastronomie & Restaurants',
  description: 'Allergene, Zusatzstoffe und Pflicht-Hinweise für Ihre Speisekarte erfassen. PDF- und CSV-Export, Logo-Upload und KI-Import für Gastronomie und Restaurants.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className={inter.className}>
        <ChunkErrorHandler />
        {children}
        <CookieBanner />
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
