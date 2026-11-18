/**
 * Public configuration. The Supabase URL and publishable key are public by design (row-level security and the database
 * functions decide what a signed-in customer may do); they come from apps/customer/.env (EXPO_PUBLIC_*). No secret key ever goes
 * in the app.
 */
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

export const SUPPORT_EMAIL = 'hello@ugnaya.com';
export const TERMS_URL = 'https://ugnaya.com/terms';
export const PRIVACY_URL = 'https://ugnaya.com/privacy';
/** Where the password-reset email brings the customer back (allowed in supabase/config.toml: `ugnaya://**`). */
export const PASSWORD_RESET_REDIRECT = 'ugnaya://reset-password';
/** The public bucket merchant logos live in. */
export const LOGO_BUCKET = 'merchant-logos';
