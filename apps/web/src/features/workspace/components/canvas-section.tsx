import type { LayoutControllerState } from '@cdm/core-client';
import type { RefObject } from 'react';
import { layoutModes, toggleList, viewModes, type LayoutMode, type ViewMode } from '../model/constants';
import type { PositionedNode } from '../model/types';
import { BoardView } from '../views/board-view';
import { MindmapCanvas } from '../views/mindmap-canvas';
import { VirtualList } from '../views/virtual-list';
import { Section } from './section';

export type CanvasSectionProps = {
  viewMode: ViewMode;
  layoutMode: LayoutMode;
  toggles: LayoutControllerState['toggles'];
  isReadonly: boolean;

  canvasRef: RefObject<HTMLCanvasElement | null>;
  visibleCount: number;
  sampleNodeCount: number;
  scale: number;
  offset: { x: number; y: number };

  apiBase: string;
  lastRenderMs?: number;
  drillP95?: number;
  returnP95?: number;
  drillSamplesCount: number;
  returnSamplesCount: number;
  onMeasured: (ms: number) => void;

  nodes: PositionedNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;

  dependencyOutCountById: Map<string, number>;
  dependencyInCountById: Map<string, number>;
  taskBlockedInfoById: Map<string, { blocked: boolean; reasons: string[] }>;
  getTaskStatus: (node: PositionedNode) => 'todo' | 'doing' | 'done';
  getFieldString: (node: PositionedNode, key: string) => string;
  getFieldNumber: (node: PositionedNode, key: string) => number | undefined;

  visibleNodes: PositionedNode[];
  visibleStart: number;
  rowHeight: number;
  onScrollTopChange: (scrollTop: number) => void;
};

export function CanvasSection({
  viewMode,
  layoutMode,
  toggles,
  isReadonly,
  canvasRef,
  visibleCount,
  sampleNodeCount,
  scale,
  offset,
  apiBase,
  lastRenderMs,
  drillP95,
  returnP95,
  drillSamplesCount,
  returnSamplesCount,
  onMeasured,
  nodes,
  selectedId,
  onSelect,
  dependencyOutCountById,
  dependencyInCountById,
  taskBlockedInfoById,
  getTaskStatus,
  getFieldString,
  getFieldNumber,
  visibleNodes,
  visibleStart,
  rowHeight,
  onScrollTopChange,
}: CanvasSectionProps) {
  return (
    <Section title="画布">
      <p>当前视图：{viewModes.find((v) => v.key === viewMode)?.label}</p>
      <p>当前布局：{layoutModes.find((m) => m.key === layoutMode)?.label}</p>
      <p>开关状态：{toggleList.map((t) => `${t.label}:${toggles?.[t.key] ? '开' : '关'}`).join(' / ')}</p>

      {viewMode === 'mindmap' && (
        <MindmapCanvas
          canvasRef={canvasRef}
          visibleCount={visibleCount}
          sampleNodeCount={sampleNodeCount}
          scale={scale}
          offset={offset}
          apiBase={apiBase}
          layoutMode={layoutMode}
          lastRenderMs={lastRenderMs}
          drillP95={drillP95}
          returnP95={returnP95}
          drillSamplesCount={drillSamplesCount}
          returnSamplesCount={returnSamplesCount}
          onMeasured={onMeasured}
        />
      )}

      {viewMode === 'board' ? (
        <BoardView
          nodes={nodes}
          selectedId={selectedId}
          isReadonly={isReadonly}
          dependencyOutCountById={dependencyOutCountById}
          dependencyInCountById={dependencyInCountById}
          taskBlockedInfoById={taskBlockedInfoById}
          getTaskStatus={getTaskStatus}
          onSelect={onSelect}
        />
      ) : (
        <VirtualList
          viewMode={viewMode}
          isReadonly={isReadonly}
          totalCount={nodes.length}
          rowHeight={rowHeight}
          visibleNodes={visibleNodes}
          visibleStart={visibleStart}
          onScrollTopChange={onScrollTopChange}
          selectedId={selectedId}
          onSelect={onSelect}
          dependencyOutCountById={dependencyOutCountById}
          dependencyInCountById={dependencyInCountById}
          taskBlockedInfoById={taskBlockedInfoById}
          getFieldString={getFieldString}
          getFieldNumber={getFieldNumber}
          getTaskStatus={getTaskStatus}
        />
      )}

      <p>当前选中节点：{selectedId ?? '无'}</p>
    </Section>
  );
}


