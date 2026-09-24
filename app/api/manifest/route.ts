import { NextResponse } from 'next/server';
import { translate, type Locale } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export function GET(request: Request) {
  const cookie = request.headers.get('cookie') ?? '';
  const locale: Locale = /(?:^|;\s*)healthy-language=fa(?:;|$)/.test(cookie) ? 'fa' : 'en';
  return NextResponse.json({
    name: translate(locale, 'Healthy — Your weight, your pace'),
    short_name: translate(locale, 'Healthy'),
    description: translate(locale, 'Daily weight tracking, progress photos, and quiet encouragement'),
    start_url: '/',
    display: 'standalone',
    background_color: '#080808',
    theme_color: '#080808',
    lang: locale,
    dir: locale === 'fa' ? 'rtl' : 'ltr',
    icons: [],
  }, { headers: { 'Content-Type': 'application/manifest+json; charset=utf-8', 'Cache-Control': 'private, no-store' } });
}
