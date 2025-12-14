import type { PositionedNode } from '../model/types';

export type BoardViewProps = {
  nodes: PositionedNode[];
  selectedId: string | null;
  isReadonly: boolean;
  dependencyOutCountById: Map<string, number>;
  dependencyInCountById: Map<string, number>;
  taskBlockedInfoById: Map<string, { blocked: boolean; reasons: string[] }>;
  getTaskStatus: (node: PositionedNode) => 'todo' | 'doing' | 'done';
  onSelect: (id: string) => void;
};

const boardColumns = [
  { key: 'todo', label: 'Todo' },
  { key: 'doing', label: 'Doing' },
  { key: 'done', label: 'Done' },
] as const;

export function BoardView({
  nodes,
  selectedId,
  isReadonly,
  dependencyOutCountById,
  dependencyInCountById,
  taskBlockedInfoById,
  getTaskStatus,
  onSelect,
}: BoardViewProps) {
  return (
    <div className="board">
      {boardColumns.map((col) => {
        const colNodes = nodes.filter((n) => n.kind === 'task' && getTaskStatus(n) === col.key);
        return (
          <div key={col.key} className="board-column">
            <div className="board-title">
              {col.label} <span className="board-count">({colNodes.length})</span>
            </div>
            {colNodes.slice(0, 200).map((n) => {
              const classification = n.fields?.classification;
              const isNonPublic = typeof classification === 'string' && classification !== 'public';
              const masked =
                isReadonly && (Boolean(n.masked) || Boolean(n.folded) || isNonPublic || n.label === '(masked)');
              const outCount = dependencyOutCountById.get(n.id) ?? 0;
              const inCount = dependencyInCountById.get(n.id) ?? 0;
              const blockInfo = taskBlockedInfoById.get(n.id);
              const blocked = Boolean(blockInfo?.blocked);
              const blockedReason = blockInfo?.reasons?.[0];
              return (
                <div
                  key={n.id}
                  className={`board-card ${selectedId === n.id ? 'selected' : ''} ${blocked ? 'blocked' : ''}`}
                  onClick={() => onSelect(n.id)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="board-card-title">{masked ? '（遮罩）' : n.label}</div>
                  <div className="board-card-meta">
                    依赖 {outCount}/{inCount}
                    {blocked && <span className="warning"> · blocked</span>}
                    {blocked && blockedReason && <span className="muted">（{blockedReason}）</span>}
                  </div>
                </div>
              );
            })}
            {colNodes.length > 200 && <div className="muted">仅显示前 200 项</div>}
          </div>
        );
      })}
    </div>
  );
}

