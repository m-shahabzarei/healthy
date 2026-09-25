import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') ?? '';
  const isMobile = request.headers.get('sec-ch-ua-mobile') === '?1'
    || /iPhone|iPod|Android.*Mobile|Windows Phone|IEMobile|Opera Mini|BlackBerry/i.test(userAgent);

  if (isMobile) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = { matcher: '/' };
