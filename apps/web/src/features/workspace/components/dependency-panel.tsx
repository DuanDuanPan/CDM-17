import { Button, Select } from '@cdm/ui';
import { dependencyTypes, isDependencyType, type DependencyType } from '../model/constants';
import type { PositionedEdge, PositionedNode } from '../model/types';
import { runMaybeAsync } from '../utils/run-maybe-async';
import { Section } from './section';

export type DependencyPanelProps = {
  selectedId: string | null;
  selectedNodeLabel?: string;
  isReadonly: boolean;

  nodes: PositionedNode[];
  nodeById: Map<string, PositionedNode>;

  dependencyCandidateId: string;
  setDependencyCandidateId: (next: string) => void;
  dependencyCandidateType: DependencyType;
  setDependencyCandidateType: (next: DependencyType) => void;

  onAddDependency: () => void | Promise<void>;
  outgoingDependencies: PositionedEdge[];
  incomingDependencies: PositionedEdge[];
  onRemoveDependency: (fromId: string, toId: string) => void | Promise<void>;
  onUpsertDependencyType: (fromId: string, toId: string, dependencyType: DependencyType) => void | Promise<void>;
  getEdgeDependencyType: (edge: PositionedEdge) => DependencyType;
};

export function DependencyPanel({
  selectedId,
  selectedNodeLabel,
  isReadonly,
  nodes,
  nodeById,
  dependencyCandidateId,
  setDependencyCandidateId,
  dependencyCandidateType,
  setDependencyCandidateType,
  onAddDependency,
  outgoingDependencies,
  incomingDependencies,
  onRemoveDependency,
  onUpsertDependencyType,
  getEdgeDependencyType,
}: DependencyPanelProps) {
  return (
    <Section title="依赖">
      {!selectedId ? (
        <div className="muted">请选择一个节点以查看依赖。</div>
      ) : (
        <>
          <div className="dep-meta">
            <div className="dep-selected">
              选中：<strong>{selectedNodeLabel ?? selectedId}</strong>
            </div>
          </div>

          <div className="dep-add">
            <Select
              value={dependencyCandidateId}
              onChange={(e) => setDependencyCandidateId(e.currentTarget.value)}
              disabled={isReadonly}
              data-testid="dep-candidate-target"
            >
              <option value="">选择要依赖的节点…</option>
              {nodes
                .filter((n) => n.id !== selectedId)
                .map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.label}
                  </option>
                ))}
            </Select>

            <Select
              value={dependencyCandidateType}
              onChange={(e) => setDependencyCandidateType(e.currentTarget.value as DependencyType)}
              disabled={isReadonly}
              data-testid="dep-candidate-type"
            >
              {dependencyTypes.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </Select>

            <Button
              size="sm"
              variant="secondary"
              onClick={() => runMaybeAsync(() => onAddDependency())}
              disabled={isReadonly || !dependencyCandidateId}
            >
              添加依赖
            </Button>
          </div>

          <div className="dep-block">
            <div className="dep-subtitle">依赖于 ({outgoingDependencies.length})</div>
            {outgoingDependencies.length === 0 ? (
              <div className="muted">无</div>
            ) : (
              outgoingDependencies.map((e) => {
                const rawType = (e as any).dependencyType as unknown;
                const invalidType = rawType != null && !isDependencyType(rawType);
                const effectiveType = getEdgeDependencyType(e);
                return (
                  <div key={`out-${e.from}-${e.to}`} className="dep-row">
                    <span className="dep-label">
                      {nodeById.get(e.to)?.label ?? e.to} <span className="muted">({effectiveType})</span>
                      {invalidType && <span className="warning">（invalid: {String(rawType)}）</span>}
                    </span>

                    <Select
                      value={effectiveType}
                      invalid={invalidType}
                      onChange={(ev) =>
                        runMaybeAsync(() => onUpsertDependencyType(e.from, e.to, ev.currentTarget.value as DependencyType))
                      }
                      disabled={isReadonly}
                      data-testid={`dep-type-${e.from}-${e.to}`}
                    >
                      {dependencyTypes.map((t) => (
                        <option key={t.key} value={t.key}>
                          {t.label}
                        </option>
                      ))}
                    </Select>

                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => runMaybeAsync(() => onRemoveDependency(e.from, e.to))}
                      disabled={isReadonly}
                    >
                      移除
                    </Button>
                  </div>
                );
              })
            )}
          </div>

          <div className="dep-block">
            <div className="dep-subtitle">被依赖 ({incomingDependencies.length})</div>
            {incomingDependencies.length === 0 ? (
              <div className="muted">无</div>
            ) : (
              incomingDependencies.map((e) => {
                const rawType = (e as any).dependencyType as unknown;
                const invalidType = rawType != null && !isDependencyType(rawType);
                const effectiveType = getEdgeDependencyType(e);
                return (
                  <div key={`in-${e.from}-${e.to}`} className="dep-row">
                    <span className="dep-label">
                      {nodeById.get(e.from)?.label ?? e.from} <span className="muted">({effectiveType})</span>
                      {invalidType && <span className="warning">（invalid: {String(rawType)}）</span>}
                    </span>

                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => runMaybeAsync(() => onRemoveDependency(e.from, e.to))}
                      disabled={isReadonly}
                    >
                      移除
                    </Button>
                  </div>
                );
              })
            )}
          </div>

          {isReadonly && <div className="warning">只读模式：无法编辑依赖。</div>}
        </>
      )}
    </Section>
  );
}
