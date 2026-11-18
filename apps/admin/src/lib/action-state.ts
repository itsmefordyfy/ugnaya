/** What every portal server action returns to its form. */
export type ActionState = { ok?: boolean; error?: string; message?: string };
export type FormAction = (form: FormData) => Promise<ActionState>;
