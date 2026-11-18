import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';
import { urls } from '@/lib/urls';

export async function proxy(request: NextRequest) {
  // Business registration moved to the merchant portal (2026-11-07): links from ugnaya.com with ?type=merchant get a
  // real redirect before any session work. The register page redirects too, in case the proxy is bypassed.
  if (request.nextUrl.pathname === '/register' && request.nextUrl.searchParams.get('type') === 'merchant') {
    return NextResponse.redirect(`${urls.merchant}/register`, 307);
  }
  return updateSession(request);
}

export const config = {
  // Every page, but not static files, images or metadata files.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|opengraph-image|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
