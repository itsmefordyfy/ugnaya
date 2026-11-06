import Link from 'next/link';
import type { ReactNode } from 'react';

export type ButtonLinkProps = {
  href: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'reward' | 'onPrimary';
  size?: 'md' | 'lg';
  className?: string;
};

const VARIANTS = {
  primary: 'bg-primary text-on-primary hover:opacity-90',
  secondary: 'border border-border bg-card text-ink hover:border-primary',
  ghost: 'text-primary hover:underline',
  /** Mango, for the one call to action on a blue band. */
  reward: 'bg-reward text-on-reward hover:opacity-90',
  /** A text link on a blue band. */
  onPrimary: 'text-on-primary underline-offset-4 hover:underline',
} as const;

export const buttonClasses = (variant: ButtonLinkProps['variant'] = 'primary', size: ButtonLinkProps['size'] = 'md') =>
  `inline-flex min-h-11 items-center justify-center gap-2 rounded-pill font-semibold transition ${
    size === 'lg' ? 'px-6 py-3 text-base' : 'px-5 py-2.5 text-sm'
  } ${VARIANTS[variant]}`;

export function ButtonLink({ href, children, variant = 'primary', size = 'md', className }: ButtonLinkProps) {
  return (
    <Link href={href} className={`${buttonClasses(variant, size)} ${className ?? ''}`}>
      {children}
    </Link>
  );
}
