/** Remembers the address a confirmation went to, for the "check your email" step (kept out of the URL). */
export const SIGNUP_EMAIL_COOKIE = 'ugnaya_signup_email';
/**
 * An invitation link someone opened before creating their account. The confirmation email can't carry it reliably
 * (the email template appends its own query), so it waits in this cookie and the registration page sends the person
 * back to the invitation once they're signed in.
 */
export const PENDING_INVITE_COOKIE = 'ugnaya_pending_invite';
