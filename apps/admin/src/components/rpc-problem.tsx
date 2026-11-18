import { Icon } from '@ugnaya/web-ui';
import { failureText, type RpcFailure } from '@/lib/rpc';

/** A module that couldn't load says why, in place, instead of a blank page or a fake zero. */
export function RpcProblem({ failure, what }: { failure: RpcFailure; what: string }) {
  return (
    <div role="alert" className="flex gap-3 rounded-lg border border-warning bg-warning-soft p-4 text-sm text-warning-text">
      <Icon name="warning" size={20} className="mt-0.5 shrink-0" />
      <div>
        <p className="font-semibold">Couldn’t load {what}</p>
        <p className="mt-1">{failureText(failure)}</p>
        {!failure.missing && failure.code && <p className="mt-1 font-mono text-xs opacity-80">Code: {failure.code}</p>}
      </div>
    </div>
  );
}
