import type { Plan } from '@/lib/plans';

const value = (n: number | null) => (n === null ? 'Unlimited' : n.toLocaleString('en-PH'));

const ROWS: { label: string; pick: (p: Plan) => string }[] = [
  { label: 'Branches', pick: (p) => value(p.branches) },
  { label: 'Staff accounts', pick: (p) => value(p.staff) },
  { label: 'Rewards', pick: (p) => value(p.rewards) },
  { label: 'Transactions a month', pick: (p) => value(p.transactionsPerMonth) },
];

/** The limits side by side. Scrolls sideways inside its own box on a phone, never the page. */
export function PlanComparison({ plans }: { plans: Plan[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full min-w-[640px] text-left text-sm">
        <caption className="sr-only">Plan limits compared</caption>
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className="p-4 font-medium text-ink-muted">Limit</th>
            {plans.map((p) => (
              <th key={p.code} scope="col" className={`p-4 font-semibold ${p.highlight ? 'text-primary' : ''}`}>{p.name}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-divider">
          {ROWS.map((row) => (
            <tr key={row.label}>
              <th scope="row" className="p-4 font-medium">{row.label}</th>
              {plans.map((p) => <td key={p.code} className="tabular p-4 text-ink-muted">{row.pick(p)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
