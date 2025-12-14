import type { RefObject } from 'react';
import type { LayoutMode } from '../model/constants';
import { PerfPanel } from '../components/perf-panel';

export type MindmapCanvasProps = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  visibleCount: number;
  sampleNodeCount: number;
  scale: number;
  offset: { x: number; y: number };

  apiBase: string;
  layoutMode: LayoutMode;

  lastRenderMs?: number;
  drillP95?: number;
  returnP95?: number;
  drillSamplesCount: number;
  returnSamplesCount: number;
  onMeasured: (ms: number) => void;
};

export function MindmapCanvas({
  canvasRef,
  visibleCount,
  sampleNodeCount,
  scale,
  offset,
  apiBase,
  layoutMode,
  lastRenderMs,
  drillP95,
  returnP95,
  drillSamplesCount,
  returnSamplesCount,
  onMeasured,
}: MindmapCanvasProps) {
  return (
    <>
      <div className="canvas-wrapper">
        <canvas ref={canvasRef} width={880} height={520} className="layout-canvas" />
        <div className="watermark">CONFIDENTIAL · CDM</div>
      </div>
      <p>
        视口可见节点：{visibleCount}/{sampleNodeCount} · 缩放 {scale.toFixed(2)} · 偏移 ({offset.x.toFixed(0)},{' '}
        {offset.y.toFixed(0)})
      </p>
      <PerfPanel
        apiBase={apiBase}
        nodeCount={sampleNodeCount}
        layoutMode={layoutMode}
        lastRenderMs={lastRenderMs}
        drillP95={drillP95}
        returnP95={returnP95}
        drillSamplesCount={drillSamplesCount}
        returnSamplesCount={returnSamplesCount}
        onMeasured={onMeasured}
      />
    </>
  );
}

