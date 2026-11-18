import type { ReactNode } from 'react';
import { Icon, type IconName } from './icon';

export type BadgeProps = {
  /** `reward` and `points` are filled (dark ink on orange / yellow); the rest are soft tints with a text-safe colour. */
  tone?: 'neutral' | 'accent' | 'reward' | 'points' | 'success' | 'warning' | 'danger' | 'info';
  /** Status is never colour alone: pair the word with an icon. */
  icon?: IconName;
  children: ReactNode;
  className?: string;
};

const TONES = {
  neutral: 'border border-border bg-card text-ink-muted',
  accent: 'bg-accent-soft text-accent-text',
  reward: 'bg-reward text-on-reward',
  points: 'bg-points text-on-points',
  success: 'bg-success-soft text-success-text',
  warning: 'bg-warning-soft text-warning-text',
  danger: 'bg-danger-soft text-danger-text',
  info: 'bg-info-soft text-info-text',
} as const;

export function Badge({ tone = 'neutral', icon, children, className }: BadgeProps) {
  return (
    <span className={`inline-flex w-fit items-center gap-1.5 rounded-pill px-3 py-1 text-xs font-semibold ${TONES[tone]} ${className ?? ''}`}>
      {icon && <Icon name={icon} size={16} />}
      {children}
    </span>
  );
}
