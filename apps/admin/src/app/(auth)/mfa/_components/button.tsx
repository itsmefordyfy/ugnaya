'use client';

import type { ReactNode } from 'react';
import { buttonClasses } from '@ugnaya/web-ui';

export function Button({ children, onClick, pending }: { children: ReactNode; onClick: () => void; pending?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={pending} className={`${buttonClasses('primary')} w-full disabled:opacity-60`}>
      {pending ? 'One moment…' : children}
    </button>
  );
}
