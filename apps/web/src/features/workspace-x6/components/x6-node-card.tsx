import type { Graph, Node as X6Node } from '@antv/x6';
import { Badge } from '@cdm/ui';

function getFieldString(fields: Record<string, unknown> | undefined, key: string) {
  const v = fields?.[key];
  return typeof v === 'string' ? v : undefined;
}

function getFieldNumber(fields: Record<string, unknown> | undefined, key: string) {
  const v = fields?.[key];
  return typeof v === 'number' ? v : undefined;
}

function mapClassificationLabel(classification?: string) {
  if (!classification) return '公开';
  if (classification === 'public') return '公开';
  if (classification === 'confidential') return '机密';
  if (classification === 'secret') return '绝密';
  return classification;
}

function mapStatusLabel(status?: string) {
  if (!status) return '未设置';
  if (status === 'todo') return '未开始';
  if (status === 'doing') return '进行中';
  if (status === 'done') return '已完成';
  return status;
}

export function X6NodeCard({ node }: { node: X6Node; graph: Graph }) {
  const data = node.getData() as
    | {
        label?: string;
        kind?: string;
        fields?: Record<string, unknown>;
      }
    | undefined;

  const label = data?.label ?? node.id.toString();
  const fields = data?.fields;
  const classification = mapClassificationLabel(getFieldString(fields, 'classification'));
  const status = mapStatusLabel(getFieldString(fields, 'status'));
  const owner = getFieldString(fields, 'owner') ?? '未分配';
  const progress = Math.max(0, Math.min(100, getFieldNumber(fields, 'progress') ?? 0));

  return (
    <div className="h-full w-full rounded-xl bg-surface border border-border shadow-sm px-3 py-2">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-neutral-900 truncate">{label}</div>
          <div className="mt-1 flex flex-wrap gap-1 text-xs text-neutral-700">
            <Badge tone="neutral">{classification}</Badge>
            <Badge tone="info">{status}</Badge>
            <Badge tone="success">{owner}</Badge>
          </div>
        </div>
        <div className="h-2.5 w-2.5 rounded-full bg-primary/70 mt-1" />
      </div>

      <div className="mt-2">
        <div className="h-1.5 rounded-full bg-neutral-100 overflow-hidden">
          <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
}
