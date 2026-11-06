import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Every page, but not static files, images or metadata files.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|opengraph-image|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
