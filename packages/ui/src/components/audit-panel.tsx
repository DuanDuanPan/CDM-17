import type { ReactNode } from 'react';

export type AuditEntry = {
  id: string;
  actor: string;
  action: string;
  time: string;
};

export type AuditPanelProps = {
  entries: AuditEntry[];
  emptyState?: ReactNode;
};

export function AuditPanel({ entries, emptyState }: AuditPanelProps) {
  if (entries.length === 0) {
    return <>{emptyState ?? null}</>;
  }

  return (
    <div className="flex flex-col gap-2">
      {entries.map((entry) => (
        <div key={entry.id} className="rounded-lg border border-border bg-surface shadow-sm px-3 py-2">
          <div className="font-semibold text-neutral-900">{entry.actor}</div>
          <div className="text-sm text-neutral-800">{entry.action}</div>
          <div className="text-xs text-neutral-600">{entry.time}</div>
        </div>
      ))}
    </div>
  );
}

