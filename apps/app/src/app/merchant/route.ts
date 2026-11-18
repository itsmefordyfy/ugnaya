import { NextResponse } from 'next/server';
import { urls } from '@/lib/urls';

/**
 * The business area moved to its own portal (merchant.ugnaya.com, 2026-11-07). Old links and bookmarks land there;
 * it has its own session, so the person signs in there.
 */
export function GET() {
  return NextResponse.redirect(`${urls.merchant}/`, 308);
}
