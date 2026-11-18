import type { ReactNode } from 'react';

export type CardProps = {
  /** `flat` is the default (a border, no shadow); `raised` lifts something; `brand` is the gradient wallet card only. */
  variant?: 'flat' | 'raised' | 'brand';
  as?: 'div' | 'section' | 'li' | 'article';
  children: ReactNode;
  className?: string;
};

const VARIANTS = {
  flat: 'border border-border bg-card',
  raised: 'border border-border bg-card shadow-md',
  brand: 'gradient-brand text-on-gradient shadow-lg',
} as const;

/** One object, not a section: prefer whitespace, dividers and lists, and reserve cards for things like a plan or a status. */
export function Card({ variant = 'flat', as: Tag = 'div', children, className }: CardProps) {
  return <Tag className={`rounded-lg p-6 ${VARIANTS[variant]} ${className ?? ''}`}>{children}</Tag>;
}
