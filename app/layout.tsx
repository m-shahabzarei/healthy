import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { LanguageProvider } from '@/components/i18n/LanguageProvider';
import { type Locale, translate } from '@/lib/i18n';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const locale: Locale = (await cookies()).get('healthy-language')?.value === 'fa' ? 'fa' : 'en';
  return {
    title: translate(locale, 'Healthy — Your weight, your pace'),
    description: translate(locale, 'A calm, private space to track weight, progress photos, and momentum.'),
    applicationName: translate(locale, 'Healthy'),
    manifest: '/api/manifest',
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#080808',
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale: Locale = (await cookies()).get('healthy-language')?.value === 'fa' ? 'fa' : 'en';
  return (
    <html lang={locale} dir={locale === 'fa' ? 'rtl' : 'ltr'} data-scroll-behavior="smooth">
      <body><LanguageProvider initialLocale={locale}>{children}</LanguageProvider></body>
    </html>
  );
}
