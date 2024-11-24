import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { CookieBanner } from '@/components/cookie-banner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Kostenlos Allergenliste erstellen - Kostenlos & Professionell | Für Gastronomie & Restaurants',
  description: 'Allergene & Zusatzstoffe Generator. Erstellen Sie kostenlos eine professionelle Allergenliste für Ihre Speisekarte. PDF & Excel Export, mit Logo-Upload. Ideal für Restaurants & Gastronomie.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className={inter.className}>
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
