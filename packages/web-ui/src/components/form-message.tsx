export type FormMessageProps = { message?: string; tone?: 'error' | 'success' };

/** A form-level message, announced to screen readers when it appears. */
export function FormMessage({ message, tone = 'error' }: FormMessageProps) {
  return (
    <p role={tone === 'error' ? 'alert' : 'status'} className={message ? `rounded-md p-3 text-sm ${tone === 'error' ? 'bg-danger-soft text-danger-text' : 'bg-success-soft text-success-text'}` : 'sr-only'}>
      {message ?? ''}
    </p>
  );
}
