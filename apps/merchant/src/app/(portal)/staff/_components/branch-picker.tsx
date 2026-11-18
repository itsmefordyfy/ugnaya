import { CheckboxField } from '@/components/fields';

export type BranchOption = { id: string; name: string; active: boolean };
export type BranchPickerProps = { branches: BranchOption[]; defaultIds?: string[] | null; error?: string; legend?: string };

/** Tick the branches someone works at; none ticked means every branch (stored as null). */
export function BranchPicker({ branches, defaultIds, error, legend = 'Branches' }: BranchPickerProps) {
  const chosen = new Set(defaultIds ?? []);
  return (
    <fieldset aria-describedby={error ? 'field-branchIds-error' : 'field-branchIds-hint'}>
      <legend className="text-sm font-medium">{legend}</legend>
      <p id="field-branchIds-hint" className="mt-1 text-sm text-ink-muted">Leave all unticked for every branch.</p>
      <div className="mt-2 grid gap-x-4 sm:grid-cols-2">
        {branches.map((b) => (
          <CheckboxField key={b.id} name="branchIds" value={b.id} defaultChecked={chosen.has(b.id)} label={b.active ? b.name : `${b.name} (closed)`} />
        ))}
      </div>
      {error && <p id="field-branchIds-error" className="mt-1 text-sm text-danger">{error}</p>}
    </fieldset>
  );
}
