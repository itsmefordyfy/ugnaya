export type FormMessageProps = { message?: string; tone?: 'error' | 'success' };

/** A form-level message, announced to screen readers when it appears. */
export function FormMessage({ message, tone = 'error' }: FormMessageProps) {
  return (
    <p role={tone === 'error' ? 'alert' : 'status'} className={message ? `rounded-md p-3 text-sm ${tone === 'error' ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'}` : 'sr-only'}>
      {message ?? ''}
    </p>
  );
}
