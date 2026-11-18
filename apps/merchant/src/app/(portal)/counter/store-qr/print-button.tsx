'use client';

import { Icon, buttonClasses } from '@ugnaya/web-ui';

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className={`${buttonClasses('primary', 'lg')} print:hidden`}>
      <Icon name="print" />Print
    </button>
  );
}
