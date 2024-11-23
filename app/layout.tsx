import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { CookieBanner } from '@/components/cookie-banner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Allergenliste erstellen - Obey24.com',
  description: 'Erstellen Sie kostenlos professionelle Allergenlisten für Ihre Speisekarte. Einfach zu bedienen, sofort einsatzbereit.',
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
