import type { LayoutControllerState } from '@cdm/core-client';
import { Button } from '@cdm/ui';
import type { DrillContext } from '@cdm/types';
import { layoutModes, toggleList, viewModes, type LayoutMode, type ViewMode } from '../model/constants';
import { runMaybeAsync } from '../utils/run-maybe-async';
import { WorkspaceBreadcrumb } from './breadcrumb';

export type WorkspaceToolbarProps = {
  viewMode: ViewMode;
  onSwitchView: (next: ViewMode) => void;

  layoutMode: LayoutMode;
  onLayoutMode: (mode: LayoutMode) => void | Promise<void>;

  toggles: LayoutControllerState['toggles'];
  onToggle: (key: keyof LayoutControllerState['toggles']) => void | Promise<void>;

  isReadonly: boolean;
  hasSelection: boolean;

  onPan: (dx: number, dy: number) => void;
  onZoom: (delta: number) => void;

  onDrill: () => void | Promise<void>;
  onNudgeSelected: () => void | Promise<void>;
  onUndo: () => void | Promise<void>;
  onRedo: () => void | Promise<void>;

  canUndo: boolean;
  canRedo: boolean;

  onGoBack: () => void | Promise<void>;
  onGoRoot: () => void | Promise<void>;

  graphId: string;
  ctxDepth: number;
  rootGraphId: string;
  drillStack: DrillContext[];
  onReturnToDepth: (depth: number) => void | Promise<void>;

  stateMeta: Pick<LayoutControllerState, 'version' | 'updatedAt' | 'saving' | 'error'>;
  lastSync?: string;
};

export function WorkspaceToolbar({
  viewMode,
  onSwitchView,
  layoutMode,
  onLayoutMode,
  toggles,
  onToggle,
  isReadonly,
  hasSelection,
  onPan,
  onZoom,
  onDrill,
  onNudgeSelected,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onGoBack,
  onGoRoot,
  graphId,
  ctxDepth,
  rootGraphId,
  drillStack,
  onReturnToDepth,
  stateMeta,
  lastSync,
}: WorkspaceToolbarProps) {
  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <span className="toolbar-label">视图</span>
        {viewModes.map((v) => (
          <Button
            key={v.key}
            size="sm"
            variant={viewMode === v.key ? 'primary' : 'ghost'}
            active={viewMode === v.key}
            onClick={() => onSwitchView(v.key)}
          >
            {v.label}
          </Button>
        ))}
      </div>
      <div className="toolbar-group">
        <span className="toolbar-label">布局</span>
        {layoutModes.map((m) => (
          <Button
            key={m.key}
            size="sm"
            variant="secondary"
            active={layoutMode === m.key}
            onClick={() => runMaybeAsync(() => onLayoutMode(m.key))}
            disabled={isReadonly}
          >
            {m.label}
          </Button>
        ))}
      </div>
      <div className="toolbar-group">
        <span className="toolbar-label">开关</span>
        {toggleList.map((t) => (
          <Button
            key={t.key}
            size="sm"
            variant="secondary"
            active={Boolean(toggles?.[t.key])}
            onClick={() => runMaybeAsync(() => onToggle(t.key))}
            disabled={isReadonly}
          >
            {t.label}
          </Button>
        ))}
      </div>
      <div className="toolbar-group">
        <span className="toolbar-label">视口</span>
        <Button size="sm" variant="secondary" onClick={() => onPan(-40, 0)}>
          ←
        </Button>
        <Button size="sm" variant="secondary" onClick={() => onPan(40, 0)}>
          →
        </Button>
        <Button size="sm" variant="secondary" onClick={() => onPan(0, -40)}>
          ↑
        </Button>
        <Button size="sm" variant="secondary" onClick={() => onPan(0, 40)}>
          ↓
        </Button>
        <Button size="sm" variant="secondary" onClick={() => onZoom(0.1)}>
          放大
        </Button>
        <Button size="sm" variant="secondary" onClick={() => onZoom(-0.1)}>
          缩小
        </Button>
      </div>

      <div className="toolbar-group">
        <Button size="sm" variant="secondary" onClick={() => runMaybeAsync(() => onDrill())} disabled={!hasSelection || isReadonly}>
          下钻到选中
        </Button>
        <Button size="sm" variant="secondary" onClick={() => runMaybeAsync(() => onNudgeSelected())} disabled={!hasSelection || isReadonly}>
          移动选中
        </Button>
        <Button size="sm" variant="secondary" onClick={() => runMaybeAsync(() => onUndo())} disabled={isReadonly || !canUndo}>
          撤销
        </Button>
        <Button size="sm" variant="secondary" onClick={() => runMaybeAsync(() => onRedo())} disabled={isReadonly || !canRedo}>
          重做
        </Button>
        <Button size="sm" variant="secondary" onClick={() => runMaybeAsync(() => onGoBack())} disabled={ctxDepth === 0}>
          返回上级
        </Button>
        <span className="toolbar-label">Graph: {graphId}</span>
        <Button size="sm" variant="secondary" onClick={() => runMaybeAsync(() => onGoRoot())} disabled={ctxDepth === 0}>
          返回主图
        </Button>
        <WorkspaceBreadcrumb
          graphId={graphId}
          ctxDepth={ctxDepth}
          rootGraphId={rootGraphId}
          drillStack={drillStack}
          onGoRoot={() => runMaybeAsync(() => onGoRoot())}
          onReturnToDepth={(depth) => runMaybeAsync(() => onReturnToDepth(depth))}
        />
      </div>

      <div className="toolbar-meta">
        <span>版本：{stateMeta.version}</span>
        {stateMeta.updatedAt && <span>更新：{new Date(stateMeta.updatedAt).toLocaleTimeString()}</span>}
        {lastSync && <span>同步：{lastSync}</span>}
        {isReadonly && <span className="warning">只读模式</span>}
        {stateMeta.saving && <span>保存中…</span>}
        {stateMeta.error && <span className="error">错误：{stateMeta.error}</span>}
      </div>
    </div>
  );
}
