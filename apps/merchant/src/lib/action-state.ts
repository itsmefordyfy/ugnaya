/** What every Server Action in the portal answers with: a field error, a form error, or a success message. */
export type ActionState = {
  ok?: boolean;
  /** Success text (shown as a toast and in the form's status line). */
  message?: string;
  /** A form-level error, already a sentence for people. */
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Changes every time the action runs, so a client can tell two identical answers apart. */
  at?: number;
};

export const done = (message: string): ActionState => ({ ok: true, message, at: Date.now() });
export const failed = (error: string, fieldErrors?: Record<string, string>): ActionState => ({ ok: false, error, fieldErrors, at: Date.now() });
