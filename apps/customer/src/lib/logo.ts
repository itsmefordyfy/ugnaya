import { LOGO_BUCKET } from '@/constants/config';

import { supabase } from './supabase';

/** A merchant logo's public address, or null when the shop has none. */
export function logoUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return supabase.storage.from(LOGO_BUCKET).getPublicUrl(path).data.publicUrl;
}
