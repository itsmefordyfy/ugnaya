import { NextResponse } from 'next/server';
import { urls } from '@/lib/urls';

/** The staff screen is now the merchant portal's counter (merchant.ugnaya.com/counter). */
export function GET() {
  return NextResponse.redirect(`${urls.merchant}/counter`, 308);
}
