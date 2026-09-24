import { NextResponse } from 'next/server';
import { translate } from '@/lib/i18n';

export function GET() {
  return NextResponse.json({
    name: translate('en', 'Healthy — Your weight, your pace'),
    short_name: translate('en', 'Healthy'),
    description: translate('en', 'Daily weight tracking, progress photos, and quiet encouragement'),
    start_url: '/',
    display: 'standalone',
    background_color: '#080808',
    theme_color: '#080808',
    lang: 'en',
    dir: 'ltr',
    icons: [],
  }, { headers: { 'Content-Type': 'application/manifest+json; charset=utf-8', 'Cache-Control': 'private, no-store' } });
}
