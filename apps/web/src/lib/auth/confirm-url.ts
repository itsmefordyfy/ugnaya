/**
 * Where the confirmation email's link goes: this site's /auth/confirm, on whatever origin the owner
 * signed up from (localhost while developing). The email template (supabase/templates/confirm.html)
 * builds the link from it; Supabase only accepts origins in the auth redirect allow list.
 */
export function confirmationRedirect(origin: string): string {
  return `${origin}/auth/confirm`;
}
