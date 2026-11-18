'use client';

import { useId, useState } from 'react';
import { Icon, buttonClasses } from '@ugnaya/web-ui';

/** The invitation link in a read-only field (select it by hand if the clipboard isn't available) with a Copy button. */
export function CopyLink({ link }: { link: string }) {
  const id = useId();
  const [copied, setCopied] = useState<'idle' | 'copied' | 'failed'>('idle');
  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied('copied');
    } catch {
      setCopied('failed');
    }
  }
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">Invitation link</label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input id={id} readOnly value={link} onFocus={(e) => e.currentTarget.select()}
          className="block min-h-11 w-full min-w-0 rounded-md border border-border-strong bg-surface px-3 py-2 font-mono text-sm text-ink" />
        <button type="button" onClick={copy} className={`${buttonClasses('primary')} shrink-0`}>
          <Icon name={copied === 'copied' ? 'check_circle' : 'content_copy'} size={20} />
          {copied === 'copied' ? 'Copied' : 'Copy link'}
        </button>
      </div>
      <p role="status" className="mt-1 text-sm text-ink-muted">
        {copied === 'failed' ? 'Copying isn’t allowed here. Select the link and copy it by hand.' : ''}
      </p>
    </div>
  );
}
