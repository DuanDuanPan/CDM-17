import type { ViewMode } from '../model/constants';
import type { PositionedNode } from '../model/types';

export type VirtualListProps = {
  viewMode: Exclude<ViewMode, 'board'>;
  isReadonly: boolean;
  totalCount: number;
  rowHeight: number;
  visibleNodes: PositionedNode[];
  visibleStart: number;
  onScrollTopChange: (scrollTop: number) => void;

  selectedId: string | null;
  onSelect: (id: string) => void;

  dependencyOutCountById: Map<string, number>;
  dependencyInCountById: Map<string, number>;
  taskBlockedInfoById: Map<string, { blocked: boolean; reasons: string[] }>;
  getFieldString: (node: PositionedNode, key: string) => string;
  getFieldNumber: (node: PositionedNode, key: string) => number | undefined;
  getTaskStatus: (node: PositionedNode) => 'todo' | 'doing' | 'done';
};

export function VirtualList({
  viewMode,
  isReadonly,
  totalCount,
  rowHeight,
  visibleNodes,
  visibleStart,
  onScrollTopChange,
  selectedId,
  onSelect,
  dependencyOutCountById,
  dependencyInCountById,
  taskBlockedInfoById,
  getFieldString,
  getFieldNumber,
  getTaskStatus,
}: VirtualListProps) {
  return (
    <div className="virtual-list" onScroll={(e) => onScrollTopChange(e.currentTarget.scrollTop)}>
      {visibleNodes.map((n, rowIdx) => {
        const rowIndex = visibleStart + rowIdx;
        const parsedIdIndex = Number((n.id.split('-')[1] ?? '').trim());
        const displayIndex = Number.isFinite(parsedIdIndex) ? parsedIdIndex : rowIndex;
        const classification = n.fields?.classification;
        const isNonPublic = typeof classification === 'string' && classification !== 'public';
        const masked = isReadonly && (Boolean(n.masked) || Boolean(n.folded) || isNonPublic || n.label === '(masked)');
        const outCount = dependencyOutCountById.get(n.id) ?? 0;
        const inCount = dependencyInCountById.get(n.id) ?? 0;
        const start = getFieldString(n, 'start');
        const end = getFieldString(n, 'end');
        const progress = getFieldNumber(n, 'progress');
        const status = getTaskStatus(n);
        const blockInfo = taskBlockedInfoById.get(n.id);
        const blocked = Boolean(blockInfo?.blocked);
        const blockedReason = blockInfo?.reasons?.[0];
        return (
          <div
            key={n.id}
            className={`virtual-row ${selectedId === n.id ? 'selected' : ''} ${blocked ? 'blocked' : ''}`}
            style={{ transform: `translateY(${rowIndex * rowHeight}px)` }}
            onClick={() => onSelect(n.id)}
            role="button"
            tabIndex={0}
          >
            {viewMode === 'mindmap' && (
              <>
                节点 #{displayIndex} - {masked ? '（遮罩）' : n.label} x:{n.x.toFixed(1)} y:{n.y.toFixed(1)}
              </>
            )}
            {viewMode === 'gantt' && (
              <>
                任务 #{displayIndex} - {masked ? '（遮罩）' : n.label} · {start || '-'} → {end || '-'} · 进度{' '}
                {progress == null ? '-' : `${Math.round(progress)}%`} · 状态 {status} · 依赖 {outCount}/{inCount}
                {blocked && <span className="warning"> · blocked</span>}
                {blocked && blockedReason && <span className="muted">（{blockedReason}）</span>}
              </>
            )}
            {viewMode === 'timeline' && (
              <>
                时间轴 #{displayIndex} - {masked ? '（遮罩）' : n.label} · {start || '-'} → {end || '-'} · 状态 {status} · 依赖{' '}
                {outCount}/{inCount}
                {blocked && <span className="warning"> · blocked</span>}
                {blocked && blockedReason && <span className="muted">（{blockedReason}）</span>}
              </>
            )}
          </div>
        );
      })}
      <div style={{ height: totalCount * rowHeight }} aria-hidden />
    </div>
  );
}
