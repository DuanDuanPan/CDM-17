import { Graph, Snapline, Selection } from '@antv/x6';
import { register } from '@antv/x6-react-shape';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { GraphSnapshot } from '../../workspace/model/types';
import { X6NodeCard } from './x6-node-card';

export type X6CanvasSelected =
  | { kind: 'node'; id: string }
  | { kind: 'edge'; id: string }
  | { kind: 'multi'; ids: string[] }
  | { kind: 'none' };

export type X6CanvasProps = {
  dataset: 'demo' | '1k';
  snapshot: GraphSnapshot;
  readonly: boolean;
  gridEnabled: boolean;
  snapEnabled: boolean;
  connectMode: boolean;
  connectSourceId?: string | null;
  onConnectPick: (nodeId: string) => void;
  onNodePositionChange?: (nodeId: string, pos: { x: number; y: number }) => void;
  selected: X6CanvasSelected;
  onSelectedChange: (next: X6CanvasSelected) => void;
};

type PerfSample = {
  initRenderMs?: number;
  zoomAvgMs?: number;
  zoomP95Ms?: number;
  moveAvgMs?: number;
  moveP95Ms?: number;
};

function percentile(values: number[], p: number) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
}

function avg(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

let registered = false;
function ensureRegistered() {
  if (registered) return;
  register({
    shape: 'cdm-card-node',
    component: X6NodeCard,
    effect: ['data'],
    width: 240,
    height: 84,
  });
  registered = true;
}

export function X6Canvas({
  dataset,
  snapshot,
  readonly,
  gridEnabled,
  snapEnabled,
  connectMode,
  connectSourceId,
  onConnectPick,
  onNodePositionChange,
  selected,
  onSelectedChange,
}: X6CanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const graphRef = useRef<Graph | null>(null);
  const selectionRef = useRef<Selection | null>(null);
  const snaplineRef = useRef<Snapline | null>(null);
  const [perf, setPerf] = useState<PerfSample>({});

  const readonlyRef = useRef(readonly);
  readonlyRef.current = readonly;

  const gridEnabledRef = useRef(gridEnabled);
  gridEnabledRef.current = gridEnabled;

  const snapEnabledRef = useRef(snapEnabled);
  snapEnabledRef.current = snapEnabled;

  const connectModeRef = useRef(connectMode);
  connectModeRef.current = connectMode;

  const onConnectPickRef = useRef(onConnectPick);
  onConnectPickRef.current = onConnectPick;

  const onSelectedChangeRef = useRef(onSelectedChange);
  onSelectedChangeRef.current = onSelectedChange;

  const onNodePositionChangeRef = useRef(onNodePositionChange);
  onNodePositionChangeRef.current = onNodePositionChange;

  const lastDatasetRef = useRef<'demo' | '1k' | null>(null);
  const suppressPositionSyncRef = useRef(false);

  useEffect(() => {
    ensureRegistered();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const graph = new Graph({
      container,
      autoResize: true,
      grid: { size: 16, visible: gridEnabledRef.current },
      background: { color: '#F8FAFC' },
      mousewheel: { enabled: true, modifiers: ['ctrl', 'meta'], factor: 1.08, zoomAtMousePosition: true },
      panning: { enabled: true, eventTypes: ['rightMouseDown', 'mouseWheel'] },
      interacting: () => {
        if (!readonlyRef.current) return true;
        // readonly: allow select/pan/zoom; disallow move/edge edit/connect
        return {
          nodeMovable: false,
          edgeMovable: false,
          edgeLabelMovable: false,
          arrowheadMovable: false,
          vertexMovable: false,
          vertexAddable: false,
          vertexDeletable: false,
          magnetConnectable: false,
          useEdgeTools: false,
          toolsAddable: false,
        };
      },
    });

    graph.enableVirtualRender();

    const selection = new Selection({ enabled: true });
    graph.use(selection);
    selection.enableMultipleSelection();
    selection.enableRubberband();

    const snapline = new Snapline();
    graph.use(snapline);
    snapline.toggleEnabled(snapEnabledRef.current);

    graph.on('blank:click', () => onSelectedChangeRef.current({ kind: 'none' }));
    graph.on('node:click', ({ node }) => {
      const nodeId = node.id.toString();
      if (connectModeRef.current) {
        onConnectPickRef.current(nodeId);
        return;
      }
      onSelectedChangeRef.current({ kind: 'node', id: nodeId });
    });
    graph.on('edge:click', ({ edge }) => {
      onSelectedChangeRef.current({ kind: 'edge', id: edge.id.toString() });
    });

    graph.on('selection:changed', ({ selected: selectedCells }) => {
      if (connectModeRef.current) return;
      const ids = selectedCells.map((c) => c.id.toString());
      if (ids.length === 0) {
        onSelectedChangeRef.current({ kind: 'none' });
        return;
      }
      if (ids.length === 1) {
        const cell = selectedCells[0];
        const id = ids[0];
        if (cell?.isEdge?.()) {
          onSelectedChangeRef.current({ kind: 'edge', id });
          return;
        }
        onSelectedChangeRef.current({ kind: 'node', id });
        return;
      }
      onSelectedChangeRef.current({ kind: 'multi', ids });
    });

    graph.on('node:moved', ({ node }) => {
      if (readonlyRef.current) return;
      if (suppressPositionSyncRef.current) return;
      const { x, y } = node.position();
      onNodePositionChangeRef.current?.(node.id.toString(), { x, y });
    });

    graphRef.current = graph;
    selectionRef.current = selection;
    snaplineRef.current = snapline;

    return () => {
      snapline.dispose();
      selection.dispose();
      graph.dispose();
      graphRef.current = null;
      selectionRef.current = null;
      snaplineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;

    const selection = selectionRef.current;
    if (!selection) return;

    if (connectMode) {
      selection.toggleRubberband(false);
      selection.clean();
      return;
    }
    selection.toggleRubberband(true);
  }, [connectMode]);

  const edgeIdFrom = useMemo(
    () =>
      (edges: GraphSnapshot['edges']) => {
        const seen = new Set<string>();
        return edges.map((e) => {
          if (!e.id) {
            throw new Error('[x6] edge missing required id');
          }
          if (seen.has(e.id)) {
            throw new Error(`[x6] duplicate edge id detected: ${e.id}`);
          }
          seen.add(e.id);
          return e.id;
        });
      },
    []
  );

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;

    const start = performance.now();
    const isRich = dataset === 'demo';

    const shouldRebuild = lastDatasetRef.current !== dataset;
    lastDatasetRef.current = dataset;

    suppressPositionSyncRef.current = true;
    const buildNode = (n: GraphSnapshot['nodes'][number]) => {
      const nodeId = n.id;
      if (isRich) {
        graph.addNode({
          id: nodeId,
          shape: 'cdm-card-node',
          x: n.x,
          y: n.y,
          width: 240,
          height: 84,
          data: { ...n },
        });
        return;
      }
      graph.addNode({
        id: nodeId,
        x: n.x,
        y: n.y,
        width: 160,
        height: 36,
        attrs: {
          body: { fill: '#FFFFFF', stroke: '#E5E7EB', rx: 10, ry: 10 },
          label: { text: n.label, fill: '#111827', fontSize: 12 },
        },
      });
    };

    const edgeIds = edgeIdFrom(snapshot.edges);

    const buildEdge = (e: GraphSnapshot['edges'][number], id: string) => {
      const isDep = e.relation === 'depends-on';
      const data = { from: e.from, to: e.to, relation: e.relation, dependencyType: e.dependencyType };
      graph.addEdge({
        id,
        source: e.from,
        target: e.to,
        data,
        attrs: {
          line: {
            stroke: isDep ? '#F97316' : '#CBD5E1',
            strokeWidth: 1,
            strokeDasharray: isDep ? '6 4' : undefined,
            targetMarker: { name: 'block', width: 8, height: 6 },
          },
        },
        labels: e.dependencyType
          ? [
              {
                attrs: {
                  label: { text: e.dependencyType, fill: '#475569', fontSize: 11 },
                  body: { fill: '#FFFFFF', stroke: '#E2E8F0', rx: 6, ry: 6 },
                },
              },
            ]
          : [],
      });
    };

    if (shouldRebuild) {
      graph.batchUpdate(
        () => {
          graph.clearCells();
          snapshot.nodes.forEach(buildNode);
          snapshot.edges.forEach((e, idx) => buildEdge(e, edgeIds[idx]));
        },
        { silent: true }
      );
      graph.centerContent();
      suppressPositionSyncRef.current = false;
      requestAnimationFrame(() => {
        const initRenderMs = performance.now() - start;
        setPerf((p) => ({ ...p, initRenderMs }));
      });
      return;
    }

    const currentNodes = new Map(graph.getNodes().map((n) => [n.id.toString(), n]));
    const currentEdges = new Map(graph.getEdges().map((e) => [e.id.toString(), e]));
    const nextNodeIds = new Set(snapshot.nodes.map((n) => n.id));
    const nextEdgeIds = new Set(edgeIds);

    graph.batchUpdate(
      () => {
        for (const n of snapshot.nodes) {
          const existing = currentNodes.get(n.id);
          if (!existing) {
            buildNode(n);
            continue;
          }

          const currentPos = existing.position();
          if (currentPos.x !== n.x || currentPos.y !== n.y) {
            existing.position(n.x, n.y, { silent: true });
          }

          if (isRich) {
            const { x: prevX, y: prevY, fields: prevFields, ...restPrev } = (existing.getData?.() || {}) as Record<string, unknown>;
            const { x: nextX, y: nextY, fields: nextFields, ...restNext } = n;
            const samePos = prevX === nextX && prevY === nextY;
            const stampChanged = restPrev.updatedAt !== restNext.updatedAt;
            const fieldsChanged = JSON.stringify(prevFields ?? {}) !== JSON.stringify(nextFields ?? {});
            if (stampChanged || fieldsChanged || !samePos) {
              existing.setData({ ...restPrev, ...restNext, fields: nextFields, x: nextX, y: nextY }, { silent: true });
            }
          } else {
            const prevLabel = existing.attr('label/text');
            if (prevLabel !== n.label) {
              existing.attr('label/text', n.label, { silent: true });
            }
          }
        }

        for (const [id, node] of currentNodes) {
          if (!nextNodeIds.has(id)) graph.removeCell(node, { silent: true });
        }

        for (const [idx, e] of snapshot.edges.entries()) {
          const id = edgeIds[idx];
          const existing = currentEdges.get(id);
          if (!existing) {
            buildEdge(e, id);
            continue;
          }
          const isDep = e.relation === 'depends-on';
          existing.setSource({ cell: e.from }, { silent: true });
          existing.setTarget({ cell: e.to }, { silent: true });
          existing.attr('line/stroke', isDep ? '#F97316' : '#CBD5E1', { silent: true });
          existing.attr('line/strokeDasharray', isDep ? '6 4' : null, { silent: true });

          if (e.dependencyType) {
            existing.setLabels(
              [
                {
                  attrs: {
                    label: { text: e.dependencyType, fill: '#475569', fontSize: 11 },
                    body: { fill: '#FFFFFF', stroke: '#E2E8F0', rx: 6, ry: 6 },
                  },
                },
              ],
              { silent: true }
            );
          } else {
            existing.setLabels([], { silent: true });
          }
          existing.setData({ from: e.from, to: e.to, relation: e.relation, dependencyType: e.dependencyType }, { silent: true });
        }

        for (const [id, edge] of currentEdges) {
          if (!nextEdgeIds.has(id)) graph.removeCell(edge, { silent: true });
        }
      },
      { silent: true }
    );

    suppressPositionSyncRef.current = false;
  }, [dataset, snapshot]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    if (gridEnabled) graph.showGrid();
    else graph.hideGrid();
  }, [gridEnabled]);

  useEffect(() => {
    snaplineRef.current?.toggleEnabled(snapEnabled);
  }, [snapEnabled]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;

    if (selected.kind === 'node') {
      graph.getCellById(selected.id)?.toFront();
    }
    if (selected.kind === 'none') {
      selectionRef.current?.clean();
    }
  }, [selected]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    graph.getEdges().forEach((edge) => {
      const data = (edge.getData?.() || {}) as { from?: string; to?: string; relation?: string };
      const isDep = data.relation === 'depends-on';
      const related = selected.kind === 'node' && (data.from === selected.id || data.to === selected.id);
      edge.attr(
        {
          line: {
            stroke: related ? '#0EA5E9' : isDep ? '#F97316' : '#CBD5E1',
            strokeWidth: related ? 2.2 : 1,
            strokeDasharray: isDep ? '6 4' : null,
          },
        },
        { silent: true }
      );
    });
  }, [selected]);

  const perfText = useMemo(() => {
    const parts: string[] = [];
    if (perf.initRenderMs != null) parts.push(`首屏渲染≈${perf.initRenderMs.toFixed(1)}ms`);
    if (perf.zoomP95Ms != null) parts.push(`缩放P95≈${perf.zoomP95Ms.toFixed(1)}ms`);
    if (perf.moveP95Ms != null) parts.push(`移动P95≈${perf.moveP95Ms.toFixed(1)}ms`);
    return parts.join(' · ');
  }, [perf.initRenderMs, perf.moveP95Ms, perf.zoomP95Ms]);

  const [isSampling, setIsSampling] = useState(false);
  const runPerfSample = async () => {
    const graph = graphRef.current;
    if (!graph || isSampling) return;
    setIsSampling(true);
    try {
      suppressPositionSyncRef.current = true;
      const zoomSamples: number[] = [];
      const moveSamples: number[] = [];

      const node = graph.getNodes()[0];
      if (!node) return;
      const startPos = node.position();

      for (let i = 0; i < 20; i += 1) {
        const t0 = performance.now();
        graph.zoom(0.05);
        await new Promise<void>((res) => requestAnimationFrame(() => res()));
        zoomSamples.push(performance.now() - t0);
      }

      for (let i = 0; i < 20; i += 1) {
        const t0 = performance.now();
        node.position(startPos.x + i * 2, startPos.y + i * 2);
        await new Promise<void>((res) => requestAnimationFrame(() => res()));
        moveSamples.push(performance.now() - t0);
      }

      node.position(startPos.x, startPos.y);

      setPerf((p) => ({
        ...p,
        zoomAvgMs: avg(zoomSamples),
        zoomP95Ms: percentile(zoomSamples, 95),
        moveAvgMs: avg(moveSamples),
        moveP95Ms: percentile(moveSamples, 95),
      }));
    } finally {
      suppressPositionSyncRef.current = false;
      setIsSampling(false);
    }
  };

  return (
    <div className="relative w-full h-full">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgba(15,23,42,0.03), rgba(255,255,255,1))',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, rgba(15,23,42,0.04) 0, rgba(15,23,42,0.04) 14px, transparent 14px, transparent 56px)',
        }}
      />
      <div ref={containerRef} className="absolute inset-0" data-testid="x6-canvas" />

      <div className="absolute bottom-3 left-3 flex items-center gap-2">
        <div
          className="rounded-full bg-surface/90 border border-border shadow-sm px-3 py-1 text-xs text-neutral-700"
          data-testid="x6-hud"
        >
          {dataset === '1k' ? '数据集：1k' : '数据集：demo'} {connectMode ? `· 连线模式${connectSourceId ? '（选目标）' : '（选起点）'}` : ''}{' '}
          {perfText ? `· ${perfText}` : ''}
        </div>
        <button
          type="button"
          className="rounded-full bg-surface/90 border border-border shadow-sm px-3 py-1 text-xs text-neutral-700 hover:bg-surface-muted"
          onClick={() => void runPerfSample()}
          disabled={isSampling}
          data-testid="x6-perf"
        >
          {isSampling ? '采样中…' : '跑一次粗测'}
        </button>
      </div>
    </div>
  );
}

