import type { Metadata, Viewport } from 'next';
import { LanguageProvider } from '@/components/i18n/LanguageProvider';
import { ServiceWorkerRegistration } from '@/components/pwa/ServiceWorkerRegistration';
import './globals.css';
import './pwa.css';

export const metadata: Metadata = {
  title: 'Healthy — Your weight, your pace',
  description: 'A calm, private space to track weight, progress photos, and momentum.',
  applicationName: 'Healthy',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icons/mark.svg', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: { capable: true, title: 'Healthy', statusBarStyle: 'black-translucent' },
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
      <body><LanguageProvider>{children}</LanguageProvider><ServiceWorkerRegistration /></body>
    </html>
  );
}
