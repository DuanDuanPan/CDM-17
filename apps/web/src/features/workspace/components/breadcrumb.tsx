import type { DrillContext } from '@cdm/types';

export type WorkspaceBreadcrumbProps = {
  graphId: string;
  ctxDepth: number;
  rootGraphId: string;
  drillStack: DrillContext[];
  onGoRoot: () => void;
  onReturnToDepth: (depth: number) => void;
};

export function WorkspaceBreadcrumb({
  graphId,
  ctxDepth,
  rootGraphId,
  drillStack,
  onGoRoot,
  onReturnToDepth,
}: WorkspaceBreadcrumbProps) {
  return (
    <div className="breadcrumb" aria-label="breadcrumb">
      <button className="breadcrumb-crumb" onClick={onGoRoot} disabled={ctxDepth === 0}>
        {rootGraphId || graphId}
      </button>
      {drillStack.map((ctx, idx) => {
        const crumbDepth = idx + 1;
        const isCurrent = crumbDepth === ctxDepth;
        const label = ctx.label ? `${ctx.label}` : ctx.nodeId;
        return (
          <span key={`${ctx.graphId}-${idx}`} className="breadcrumb-item">
            <span className="breadcrumb-sep">/</span>
            <button className="breadcrumb-crumb" onClick={() => onReturnToDepth(crumbDepth)} disabled={isCurrent}>
              {label}
            </button>
          </span>
        );
      })}
    </div>
  );
}

