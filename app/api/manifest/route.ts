import { NextRequest, NextResponse } from 'next/server';

// Keep older manifest URLs working after moving to the standard public URL.
export function GET(request: NextRequest) {
  return NextResponse.redirect(new URL('/manifest.webmanifest', request.url), 308);
}
