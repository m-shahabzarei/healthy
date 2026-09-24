import type { Metadata, Viewport } from 'next';
import { LanguageProvider } from '@/components/i18n/LanguageProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Healthy — Your weight, your pace',
  description: 'A calm, private space to track weight, progress photos, and momentum.',
  applicationName: 'Healthy',
  manifest: '/api/manifest',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#080808',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" dir="ltr" data-scroll-behavior="smooth">
      <body><LanguageProvider>{children}</LanguageProvider></body>
    </html>
  );
}
