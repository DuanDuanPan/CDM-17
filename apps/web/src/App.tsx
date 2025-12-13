import { useEffect, useMemo, useRef, useState } from 'react';
import './style.css';
import { LayoutController, LayoutControllerState } from '@cdm/core-client';
import type { DrillContext, Edge, Node } from '@cdm/types';
import TailwindCard from './poc/TailwindCard';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="section">
    <div className="section-title">{title}</div>
    <div className="section-body">{children}</div>
  </div>
);

const layoutModes = [
  { key: 'free', label: '自由' },
  { key: 'tree', label: '树' },
  { key: 'logic', label: '逻辑' },
] as const;

const toggleList = [
  { key: 'snap', label: '吸附' },
  { key: 'grid', label: '网格' },
  { key: 'guide', label: '对齐线' },
  { key: 'distance', label: '距离线' },
] as const;

const viewModes = [
  { key: 'mindmap', label: '脑图' },
  { key: 'gantt', label: '甘特' },
  { key: 'timeline', label: '时间轴' },
  { key: 'board', label: '看板' },
] as const;

type ViewMode = (typeof viewModes)[number]['key'];

const dependencyTypes = [
  { key: 'FS', label: 'FS' },
  { key: 'SS', label: 'SS' },
  { key: 'FF', label: 'FF' },
  { key: 'SF', label: 'SF' },
] as const;

type DependencyType = (typeof dependencyTypes)[number]['key'];

const isDependencyType = (value: unknown): value is DependencyType =>
  typeof value === 'string' && dependencyTypes.some((t) => t.key === value);

type PositionedNode = Node & { x: number; y: number };

type PositionedEdge = Edge;

type GraphSnapshot = { nodes: PositionedNode[]; edges: PositionedEdge[] };
type GraphHistory = { past: GraphSnapshot[]; future: GraphSnapshot[] };

function App() {
  const pocMode = useMemo(() => new URLSearchParams(window.location.search).get('poc') === 'tailwind', []);
  if (pocMode) return <TailwindCard />;

  const isReadonly = useMemo(() => new URLSearchParams(window.location.search).get('readonly') === '1', []);
  const apiBase = useMemo(
    () => import.meta.env.VITE_API_BASE || (window as any).__CDM_API__ || window.location.origin,
    []
  );
  const authToken = useMemo(
    () => (window as any).__CDM_HTTP_TOKEN__ || (window as any).__CDM_WS_TOKEN__,
    []
  );
  const authHeaders = useMemo(() => (authToken ? { 'x-cdm-token': authToken } : {}), [authToken]);
  const [graphId, setGraphId] = useState('demo-graph');
  const [controller, setController] = useState<LayoutController | null>(null);
  const [state, setState] = useState<LayoutControllerState>({
    mode: 'free',
    toggles: { snap: true, grid: true, guide: true, distance: false },
    version: 0,
  });
  const [lastSync, setLastSync] = useState<string>();
  const [lastRenderMs, setLastRenderMs] = useState<number>();
  const drillSamplesRef = useRef<number[]>([]);
  const returnSamplesRef = useRef<number[]>([]);
  const [drillP95, setDrillP95] = useState<number>();
  const [returnP95, setReturnP95] = useState<number>();
  const [historyVersion, setHistoryVersion] = useState(0);
  const [sampleNodeCount] = useState(1000);
  const [viewMode, setViewMode] = useState<ViewMode>('mindmap');
  const [visibleNodes, setVisibleNodes] = useState<PositionedNode[]>([]);
  const [visibleStart, setVisibleStart] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [visibleCount, setVisibleCount] = useState(0);
  const viewportHeight = 320;
  const rowHeight = 30;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nodesRef = useRef<PositionedNode[]>([]);
  const edgesRef = useRef<PositionedEdge[]>([]);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dependencyCandidateId, setDependencyCandidateId] = useState<string>('');
  const [dependencyCandidateType, setDependencyCandidateType] = useState<DependencyType>('FS');
  const [taskDraft, setTaskDraft] = useState<{
    kind: 'idea' | 'task';
    start: string;
    end: string;
    progress: string;
    status: 'todo' | 'doing' | 'done';
    recurrence: string;
  } | null>(null);
  const [taskError, setTaskError] = useState<string>('');
  const [batchStatus, setBatchStatus] = useState<'todo' | 'doing' | 'done'>('todo');
  const ctxStack = useRef<
    Array<{
      graphId: string;
      offset: { x: number; y: number };
      scale: number;
      selectedId: string | null;
      selectedClassification: string;
    }>
  >([]);
  const drillStack = useRef<DrillContext[]>([]);
  const restoreRef = useRef<{ offset: { x: number; y: number }; scale: number; selectedId: string | null } | null>(
    null
  );
  const historyRef = useRef<Map<string, GraphHistory>>(new Map());
  const preloadedGraphRef = useRef<Map<string, GraphSnapshot>>(new Map());
  const pendingTimingRef = useRef<{
    kind: 'drill' | 'return';
    startTs: number;
    toGraphId: string;
    context: Record<string, unknown>;
  } | null>(null);
  const pendingViewSwitchRef = useRef<{ from: ViewMode; to: ViewMode; startTs: number } | null>(null);

  const seedGraphSnapshot = (count: number) => {
    const now = new Date().toISOString();
    const baseDate = new Date('2025-01-01T00:00:00Z');
    const nodes: PositionedNode[] = Array.from({ length: count }, (_, i) => ({
      id: `node-${i}`,
      label: `节点 ${i}`,
      kind: i % 5 === 0 ? 'task' : 'idea',
      fields: (() => {
        const classification = i % 9 === 0 ? 'confidential' : 'public';
        if (i % 5 !== 0) return { classification };
        const startDate = new Date(baseDate.getTime() + i * 24 * 60 * 60 * 1000);
        const endDate = new Date(baseDate.getTime() + (i + 1) * 24 * 60 * 60 * 1000);
        const status: 'todo' | 'doing' | 'done' = i % 3 === 0 ? 'todo' : i % 3 === 1 ? 'doing' : 'done';
        return {
          classification,
          start: startDate.toISOString().slice(0, 10),
          end: endDate.toISOString().slice(0, 10),
          progress: Math.min(100, (i * 7) % 101),
          status,
        };
      })(),
      createdAt: now,
      updatedAt: now,
      x: Math.random() * 2000 - 500,
      y: Math.random() * 2000 - 500,
      folded: Math.random() > 0.7,
    }));
    const edges: PositionedEdge[] = Array.from({ length: count - 1 }, (_, i) => ({
      from: `node-${i}`,
      to: `node-${i + 1}`,
    }));
    return { nodes, edges };
  };

  const parseDate = (raw: string) => {
    const value = raw.trim();
    if (!value) return undefined;

    // Validate date component even for ISO timestamps like 2025-02-30T...
    const ymdPrefix = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/);
    if (ymdPrefix) {
      const year = Number(ymdPrefix[1]);
      const month = Number(ymdPrefix[2]);
      const day = Number(ymdPrefix[3]);
      if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return undefined;
      if (month < 1 || month > 12) return undefined;
      const isLeap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
      const maxDays = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ?? 31;
      if (day < 1 || day > maxDays) return undefined;

      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const ts = Date.UTC(year, month - 1, day);
        const dt = new Date(ts);
        if (dt.getUTCFullYear() !== year || dt.getUTCMonth() !== month - 1 || dt.getUTCDate() !== day) return undefined;
        return ts;
      }
    }

    // Treat ISO strings without timezone as UTC (e.g. 2025-01-01T00:00:00).
    // Also supports "YYYY-MM-DD HH:mm" by normalizing whitespace to 'T'.
    const isoWithoutTz = /^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?$/.test(value);
    const normalized = isoWithoutTz ? `${value.replace(/\s+/, 'T')}Z` : value;
    const dt = new Date(normalized);
    if (!Number.isFinite(dt.getTime())) return undefined;
    return dt.getTime();
  };

  const isValidTaskStatus = (value: string): value is 'todo' | 'doing' | 'done' =>
    value === 'todo' || value === 'doing' || value === 'done';

  const loadGraphSnapshot = async (id: string) => {
    const res = await fetch(`${apiBase}/graph/${encodeURIComponent(id)}`, { headers: authHeaders });
    if (!res.ok) throw new Error(`GET /graph/${id} failed: ${res.status}`);
    const raw = (await res.json()) as { nodes?: unknown[]; edges?: unknown[] };
    const now = new Date().toISOString();
    const nodes: PositionedNode[] = (raw.nodes ?? []).map((node, idx) => {
      const n = (node ?? {}) as Partial<PositionedNode>;
      const x = typeof n.x === 'number' && Number.isFinite(n.x) ? n.x : Math.random() * 2000 - 500;
      const y = typeof n.y === 'number' && Number.isFinite(n.y) ? n.y : Math.random() * 2000 - 500;
      return {
        ...n,
        id: typeof n.id === 'string' ? n.id : `node-${idx}`,
        label: typeof n.label === 'string' ? n.label : `节点 ${idx}`,
        kind: (n.kind as PositionedNode['kind']) ?? 'idea',
        createdAt: typeof n.createdAt === 'string' ? n.createdAt : now,
        updatedAt: typeof n.updatedAt === 'string' ? n.updatedAt : now,
        x,
        y,
      };
    });
    const edges: PositionedEdge[] = (raw.edges ?? []).map((edge) => (edge ?? {}) as PositionedEdge);
    return { nodes, edges };
  };

  const saveGraphSnapshot = async (id: string, snapshot: { nodes: PositionedNode[]; edges: PositionedEdge[] }) => {
    const res = await fetch(`${apiBase}/graph/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify(snapshot),
    });
    if (!res.ok) throw new Error(`PUT /graph/${id} failed: ${res.status}`);
  };

  const buildSubgraphSnapshot = (rootId: string, maxNodes = 50) => {
    const byId = new Map(nodesRef.current.map((n) => [n.id, n]));
    const visited = new Set<string>();
    const queue: string[] = [];
    const seedId = byId.has(rootId) ? rootId : nodesRef.current[0]?.id;
    if (!seedId) return { nodes: [], edges: [] };
    visited.add(seedId);
    queue.push(seedId);

    while (queue.length > 0 && visited.size < maxNodes) {
      const current = queue.shift();
      if (!current) continue;
      edgesRef.current.forEach((e) => {
        if (visited.size >= maxNodes) return;
        if (e.from === current && !visited.has(e.to)) {
          visited.add(e.to);
          queue.push(e.to);
          return;
        }
        if (e.to === current && !visited.has(e.from)) {
          visited.add(e.from);
          queue.push(e.from);
        }
      });
    }

    const nodes = nodesRef.current.filter((n) => visited.has(n.id));
    const ids = new Set(nodes.map((n) => n.id));
    const edges = edgesRef.current.filter((e) => ids.has(e.from) && ids.has(e.to));
    return { nodes, edges };
  };

  const refreshVisible = (nodes = nodesRef.current) => {
    const start = Math.floor(scrollTop / rowHeight);
    const end = Math.min(nodes.length, start + Math.ceil(viewportHeight / rowHeight) + 10);
    setVisibleStart(start);
    setVisibleNodes(nodes.slice(start, end));
  };

  // 初始化/加载当前 graph 数据
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      let snap: GraphSnapshot | undefined = preloadedGraphRef.current.get(graphId);
      if (snap) preloadedGraphRef.current.delete(graphId);
      if (!snap) {
        try {
          snap = await loadGraphSnapshot(graphId);
        } catch (err) {
          console.warn('load graph failed', err);
        }
      }
      if (!snap?.nodes || snap.nodes.length === 0) {
        const seeded = seedGraphSnapshot(sampleNodeCount);
        nodesRef.current = seeded.nodes;
        edgesRef.current = seeded.edges;
        if (!isReadonly) {
          try {
            await saveGraphSnapshot(graphId, seeded);
          } catch (err) {
            console.warn('seed graph save failed', err);
          }
        }
      } else {
        nodesRef.current = snap.nodes;
        edgesRef.current = snap.edges;
      }
      if (cancelled) return;
      refreshVisible(nodesRef.current);
      const pending = pendingTimingRef.current;
      if (pending && pending.toGraphId === graphId) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        if (cancelled) return;
        pendingTimingRef.current = null;
        const duration = performance.now() - pending.startTs;
        recordTiming(pending.kind, duration);
        postMetric(`${pending.kind}.duration`, duration, {
          ...pending.context,
          nodeCount: nodesRef.current.length,
          edgeCount: edgesRef.current.length,
        });
      }
    };
    init();
    return () => {
      cancelled = true;
    };
  }, [graphId, apiBase, sampleNodeCount, isReadonly, authHeaders]);

  // 虚拟列表视口
  useEffect(() => {
    refreshVisible();
  }, [scrollTop, rowHeight, viewportHeight, graphId]);

  // 画布渲染（视口裁剪 + 线裁剪）
  useEffect(() => {
    if (viewMode !== 'mindmap') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf: number;
    const render = () => {
      const start = performance.now();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(offset.x, offset.y);
      ctx.scale(scale, scale);

      const vw = canvas.width / scale;
      const vh = canvas.height / scale;
      const visible = nodesRef.current.filter(
        (n) => n.x > -offset.x - 50 && n.x < -offset.x + vw + 50 && n.y > -offset.y - 50 && n.y < -offset.y + vh + 50
      );
      const visibleIds = new Set(visible.map((n) => n.id));
      setVisibleCount(visible.length);
      const nodeById = new Map(nodesRef.current.map((n) => [n.id, n]));
      ctx.lineWidth = 1;
      edgesRef.current.forEach((e) => {
        if (!visibleIds.has(e.from) || !visibleIds.has(e.to)) return;
        const from = nodeById.get(e.from);
        const to = nodeById.get(e.to);
        if (!from || !to) return;
        const isDependency = e.relation === 'depends-on';
        ctx.strokeStyle = isDependency ? '#f97316' : '#cbd5e1';
        ctx.setLineDash(isDependency ? [6, 4] : []);
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
      });
      ctx.setLineDash([]);

      visible.forEach((n) => {
        const classification = n.fields?.classification;
        const isNonPublic = typeof classification === 'string' && classification !== 'public';
        const masked = isReadonly && (Boolean(n.masked) || Boolean(n.folded) || isNonPublic || n.label === '(masked)');
        ctx.fillStyle = masked ? '#94a3b8' : '#2563eb';
        ctx.beginPath();
        ctx.arc(n.x, n.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();
      const end = performance.now();
      setLastRenderMs(end - start);
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [offset, scale, isReadonly, viewMode]);

  useEffect(() => {
    const restore = restoreRef.current;
    restoreRef.current = null;
    const c = new LayoutController(
      graphId,
      apiBase,
      (s) => setState({ ...s }),
      isReadonly ? 'viewer' : 'editor',
      (snap) => {
        nodesRef.current = (snap.nodes ?? []) as PositionedNode[];
        edgesRef.current = (snap.edges ?? []) as PositionedEdge[];
        refreshVisible(nodesRef.current);
      }
    );
    setController(c);
    if (restore) {
      setSelectedId(restore.selectedId);
      setOffset(restore.offset);
      setScale(restore.scale);
    } else {
      setSelectedId(null);
      setOffset({ x: 0, y: 0 });
      setScale(1);
    }
    c.load().then(setState);
    return () => c.close();
  }, [graphId, apiBase, isReadonly]);

  const handleMode = async (mode: 'free' | 'tree' | 'logic') => {
    if (isReadonly || !controller) return;
    controller.setMode(mode);
    setState({ ...controller.getState(), mode });
    const saved = await controller.save('web-shell');
    setState({ ...saved });
    setLastSync(new Date().toLocaleTimeString());
  };

  const handleToggle = async (key: keyof LayoutControllerState['toggles']) => {
    if (isReadonly || !controller) return;
    controller.toggle(key);
    setState({ ...controller.getState() });
    const saved = await controller.save('web-shell');
    setState({ ...saved });
    setLastSync(new Date().toLocaleTimeString());
  };

  const pan = (dx: number, dy: number) => {
    setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
  };

  const zoom = (delta: number) => {
    setScale((s) => Math.max(0.4, Math.min(2, s + delta)));
  };

  const handleSelect = (id: string) => {
    if (isReadonly) return;
    setSelectedId(id);
  };

  const getNodeClassification = (nodeId?: string | null, nodes = nodesRef.current) => {
    if (!nodeId) return 'public';
    const node = nodes.find((n) => n.id === nodeId);
    const classification = node?.fields?.classification;
    return typeof classification === 'string' ? classification : 'public';
  };

  const logVisit = (action: string, nodeId?: string, currentGraphId = graphId, classification?: string) => {
    fetch(`${apiBase}/visits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitor: 'web-shell',
        nodeId: nodeId ?? 'na',
        graphId: currentGraphId,
        action,
        role: isReadonly ? 'viewer' : 'editor',
        classification: classification ?? getNodeClassification(nodeId),
        happenedAt: new Date().toISOString(),
      }),
    }).catch(() => undefined);
  };

  const postMetric = (name: string, value: number, context?: Record<string, unknown>) => {
    fetch(`${apiBase}/metrics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: `metric-${Date.now()}`,
        name,
        value,
        unit: 'ms',
        createdAt: new Date().toISOString(),
        context,
      }),
    }).catch(() => undefined);
  };

  const percentile = (values: number[], p: number) => {
    if (values.length === 0) return undefined;
    const sorted = [...values].sort((a, b) => a - b);
    const rank = Math.ceil(p * sorted.length) - 1;
    const idx = Math.max(0, Math.min(sorted.length - 1, rank));
    return sorted[idx];
  };

  const recordTiming = (kind: 'drill' | 'return', ms: number) => {
    const bucket = kind === 'drill' ? drillSamplesRef.current : returnSamplesRef.current;
    bucket.push(ms);
    if (bucket.length > 200) bucket.shift();
    const p95 = percentile(bucket, 0.95);
    if (kind === 'drill') setDrillP95(p95);
    else setReturnP95(p95);
  };

  useEffect(() => {
    const pending = pendingViewSwitchRef.current;
    if (!pending || pending.to !== viewMode) return;
    const raf = requestAnimationFrame(() => {
      pendingViewSwitchRef.current = null;
      const duration = performance.now() - pending.startTs;
      postMetric('view.switch.duration', duration, {
        from: pending.from,
        to: pending.to,
        graphId,
        nodeCount: nodesRef.current.length,
        edgeCount: edgesRef.current.length,
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [viewMode, graphId]);

  const switchView = (next: ViewMode) => {
    if (next === viewMode) return;
    pendingViewSwitchRef.current = { from: viewMode, to: next, startTs: performance.now() };
    setViewMode(next);
    const selectedClassification = getNodeClassification(selectedId);
    logVisit('view-switch', selectedId ?? undefined, graphId, selectedClassification);
    postAudit('view-switch', graphId, {
      from: viewMode,
      to: next,
      nodeId: selectedId,
      classification: selectedClassification,
    });
  };

  const postAudit = (action: string, target: string, metadata?: Record<string, unknown>) => {
    fetch(`${apiBase}/audit/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({
        actor: 'web-shell',
        action,
        target,
        createdAt: new Date().toISOString(),
        metadata,
      }),
    }).catch(() => undefined);
  };

  const cloneGraphSnapshot = (snapshot: GraphSnapshot): GraphSnapshot => {
    if (typeof structuredClone === 'function') return structuredClone(snapshot) as GraphSnapshot;
    return JSON.parse(JSON.stringify(snapshot)) as GraphSnapshot;
  };

  const getGraphHistory = (id: string): GraphHistory => {
    const existing = historyRef.current.get(id);
    if (existing) return existing;
    const next: GraphHistory = { past: [], future: [] };
    historyRef.current.set(id, next);
    return next;
  };

  const takeCurrentSnapshot = (): GraphSnapshot => ({
    nodes: nodesRef.current,
    edges: edgesRef.current,
  });

  const pushHistory = (id: string, snapshot: GraphSnapshot) => {
    const history = getGraphHistory(id);
    history.past.push(cloneGraphSnapshot(snapshot));
    if (history.past.length > 50) history.past.shift();
    history.future.length = 0;
    setHistoryVersion((v) => v + 1);
  };

  const applySnapshot = async (id: string, snapshot: GraphSnapshot) => {
    nodesRef.current = snapshot.nodes;
    edgesRef.current = snapshot.edges;
    refreshVisible(snapshot.nodes);
    await saveGraphSnapshot(id, snapshot);
  };

  const mergeChildIntoParent = async (childGraphId: string, parentGraphId: string) => {
    const childSnap = await loadGraphSnapshot(childGraphId);
    const parentSnap = await loadGraphSnapshot(parentGraphId);

    if (!childSnap.nodes || childSnap.nodes.length === 0) return;
    if (!isReadonly) pushHistory(parentGraphId, { nodes: parentSnap.nodes ?? [], edges: parentSnap.edges ?? [] });

    const now = new Date().toISOString();
    const parentNodes = parentSnap.nodes ?? [];
    const parentById = new Map(parentNodes.map((n) => [n.id, n]));
    const childIds = new Set(childSnap.nodes.map((n) => n.id));

    childSnap.nodes.forEach((child) => {
      const parent = parentById.get(child.id);
      parentById.set(child.id, parent ? { ...parent, ...child, updatedAt: now } : { ...child, updatedAt: now });
    });

    const mergedNodes: PositionedNode[] = [];
    const seen = new Set<string>();
    parentNodes.forEach((node) => {
      const merged = parentById.get(node.id) ?? node;
      mergedNodes.push(merged);
      seen.add(node.id);
    });
    childSnap.nodes.forEach((node) => {
      if (seen.has(node.id)) return;
      const merged = parentById.get(node.id) ?? node;
      mergedNodes.push(merged);
      seen.add(node.id);
    });

    const parentEdges = parentSnap.edges ?? [];
    const preservedEdges = parentEdges.filter((e) => !(childIds.has(e.from) && childIds.has(e.to)));
    const mergedEdges = [...preservedEdges, ...(childSnap.edges ?? [])];
    const edgeKeys = new Set<string>();
    const dedupedEdges = mergedEdges.filter((e) => {
      const key = `${e.from}->${e.to}:${e.relation ?? 'related'}`;
      if (edgeKeys.has(key)) return false;
      edgeKeys.add(key);
      return true;
    });

    const mergedSnapshot = { nodes: mergedNodes, edges: dedupedEdges };
    await saveGraphSnapshot(parentGraphId, mergedSnapshot);
    preloadedGraphRef.current.set(parentGraphId, mergedSnapshot);
  };

  const drill = async () => {
    if (!selectedId || isReadonly) return;
    const startTs = performance.now();
    const selectedClassification = getNodeClassification(selectedId);
    ctxStack.current.push({ graphId, offset, scale, selectedId, selectedClassification });
    const nodeKey = selectedId.startsWith('node-') ? selectedId.slice('node-'.length) : selectedId;
    const nextId = `graph-${nodeKey}`;

    const subset = buildSubgraphSnapshot(selectedId, 50);
    try {
      await saveGraphSnapshot(nextId, subset);
    } catch (err) {
      console.warn('drill snapshot save failed', err);
    }
    preloadedGraphRef.current.set(nextId, subset);

    const selectedNode = nodesRef.current.find((n) => n.id === selectedId);
    drillStack.current.push({ graphId: nextId, parentGraphId: graphId, nodeId: selectedId, label: selectedNode?.label });
    restoreRef.current = { offset, scale, selectedId };
    pendingTimingRef.current = { kind: 'drill', startTs, toGraphId: nextId, context: { from: graphId, to: nextId, nodeId: selectedId } };
    setGraphId(nextId);
    logVisit('drill', selectedId, graphId, selectedClassification);
    postAudit('drill', nextId, { parentGraphId: graphId, nodeId: selectedId, classification: selectedClassification });
  };

  const returnToDepth = async (targetDepth: number) => {
    const currentDepth = ctxStack.current.length;
    if (currentDepth === 0) return;
    if (targetDepth < 0 || targetDepth >= currentDepth) return;

    const startTs = performance.now();
    const fromGraphId = graphId;
    const fromDepth = currentDepth;
    let currentGraphId = graphId;
    let targetCtx:
      | {
          graphId: string;
          offset: { x: number; y: number };
          scale: number;
          selectedId: string | null;
          selectedClassification: string;
        }
      | undefined;
    let steps = 0;

    while (ctxStack.current.length > targetDepth) {
      const prev = ctxStack.current.pop();
      if (!prev) break;
      await mergeChildIntoParent(currentGraphId, prev.graphId);
      currentGraphId = prev.graphId;
      targetCtx = prev;
      steps += 1;
      drillStack.current.pop();
    }

    if (!targetCtx) return;

    restoreRef.current = { offset: targetCtx.offset, scale: targetCtx.scale, selectedId: targetCtx.selectedId };
    pendingTimingRef.current = {
      kind: 'return',
      startTs,
      toGraphId: targetCtx.graphId,
      context: { from: fromGraphId, to: targetCtx.graphId, steps, fromDepth },
    };
    setGraphId(targetCtx.graphId);
    setOffset(targetCtx.offset);
    setScale(targetCtx.scale);
    setSelectedId(targetCtx.selectedId);
    logVisit('return', targetCtx.selectedId ?? undefined, targetCtx.graphId, targetCtx.selectedClassification);
    postAudit('return', targetCtx.graphId, {
      from: fromGraphId,
      nodeId: targetCtx.selectedId,
      steps,
      fromDepth,
      classification: targetCtx.selectedClassification,
    });
  };

  const goBack = async () => {
    if (ctxStack.current.length === 0) return;
    await returnToDepth(ctxStack.current.length - 1);
  };

  const goRoot = async () => {
    if (ctxStack.current.length === 0) return;
    await returnToDepth(0);
  };

  const undo = async () => {
    if (isReadonly) return;
    const history = getGraphHistory(graphId);
    const prev = history.past.pop();
    if (!prev) return;
    history.future.push(cloneGraphSnapshot(takeCurrentSnapshot()));
    setHistoryVersion((v) => v + 1);
    await applySnapshot(graphId, prev);
    const selectedClassification = getNodeClassification(selectedId);
    logVisit('undo', selectedId ?? undefined, graphId, selectedClassification);
    postAudit('undo', graphId, { nodeId: selectedId, classification: selectedClassification });
  };

  const redo = async () => {
    if (isReadonly) return;
    const history = getGraphHistory(graphId);
    const next = history.future.pop();
    if (!next) return;
    history.past.push(cloneGraphSnapshot(takeCurrentSnapshot()));
    if (history.past.length > 50) history.past.shift();
    setHistoryVersion((v) => v + 1);
    await applySnapshot(graphId, next);
    const selectedClassification = getNodeClassification(selectedId);
    logVisit('redo', selectedId ?? undefined, graphId, selectedClassification);
    postAudit('redo', graphId, { nodeId: selectedId, classification: selectedClassification });
  };

  const nudgeSelected = async (dx = 20, dy = 20) => {
    if (!selectedId || isReadonly) return;
    pushHistory(graphId, takeCurrentSnapshot());
    const selectedClassification = getNodeClassification(selectedId);
    const updated = nodesRef.current.map((n) =>
      n.id === selectedId ? { ...n, x: n.x + dx, y: n.y + dy, updatedAt: new Date().toISOString() } : n
    );
    await applySnapshot(graphId, { nodes: updated, edges: edgesRef.current });
    logVisit('edit', selectedId, graphId, selectedClassification);
    postAudit('subgraph-edit', graphId, { nodeId: selectedId, classification: selectedClassification });
  };

  const addDependency = async () => {
    if (!selectedId || isReadonly) return;
    const dependsOnId = dependencyCandidateId;
    if (!dependsOnId || dependsOnId === selectedId) return;
    const dependencyType = dependencyCandidateType;

    const exists = edgesRef.current.some(
      (e) => e.relation === 'depends-on' && e.from === selectedId && e.to === dependsOnId
    );
    if (exists) return;

    const startTs = performance.now();
    pushHistory(graphId, takeCurrentSnapshot());
    const now = new Date().toISOString();
    const nextEdges: PositionedEdge[] = [
      ...edgesRef.current,
      {
        id: `dep-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        from: selectedId,
        to: dependsOnId,
        relation: 'depends-on',
        dependencyType,
        createdAt: now,
      },
    ];
    await applySnapshot(graphId, { nodes: nodesRef.current, edges: nextEdges });
    setDependencyCandidateId('');
    setLastSync(new Date().toLocaleTimeString());

    const duration = performance.now() - startTs;
    const classification = getNodeClassification(selectedId);
    postMetric('dependency.add.duration', duration, {
      graphId,
      from: selectedId,
      to: dependsOnId,
      dependencyType,
      nodeCount: nodesRef.current.length,
      edgeCount: nextEdges.length,
    });
    logVisit('dependency-add', selectedId, graphId, classification);
    postAudit('dependency-add', graphId, {
      from: selectedId,
      to: dependsOnId,
      relation: 'depends-on',
      dependencyType,
      classification,
    });
  };

  const removeDependency = async (fromId: string, toId: string) => {
    if (isReadonly) return;
    const startTs = performance.now();
    pushHistory(graphId, takeCurrentSnapshot());
    const nextEdges = edgesRef.current.filter(
      (e) => !(e.relation === 'depends-on' && e.from === fromId && e.to === toId)
    );
    await applySnapshot(graphId, { nodes: nodesRef.current, edges: nextEdges });
    setLastSync(new Date().toLocaleTimeString());

    const duration = performance.now() - startTs;
    const classification = getNodeClassification(selectedId);
    postMetric('dependency.remove.duration', duration, {
      graphId,
      from: fromId,
      to: toId,
      nodeCount: nodesRef.current.length,
      edgeCount: nextEdges.length,
    });
    logVisit('dependency-remove', selectedId ?? undefined, graphId, classification);
    postAudit('dependency-remove', graphId, {
      from: fromId,
      to: toId,
      relation: 'depends-on',
      classification,
    });
  };

  const upsertDependencyType = async (fromId: string, toId: string, dependencyType: DependencyType) => {
    if (isReadonly) return;
    const startTs = performance.now();
    pushHistory(graphId, takeCurrentSnapshot());
    const nextEdges = edgesRef.current.map((e) =>
      e.relation === 'depends-on' && e.from === fromId && e.to === toId ? { ...e, dependencyType } : e
    );
    await applySnapshot(graphId, { nodes: nodesRef.current, edges: nextEdges });
    setLastSync(new Date().toLocaleTimeString());

    const duration = performance.now() - startTs;
    const classification = getNodeClassification(selectedId);
    postMetric('dependency.type.update.duration', duration, {
      graphId,
      from: fromId,
      to: toId,
      dependencyType,
      edgeCount: nextEdges.length,
    });
    logVisit('dependency-type-update', selectedId ?? undefined, graphId, classification);
    postAudit('dependency-type-update', graphId, { from: fromId, to: toId, dependencyType, classification });
  };

  const toggleSelectedTaskKind = async (nextKind: 'idea' | 'task') => {
    if (!selectedId || isReadonly) return;
    const startTs = performance.now();
    pushHistory(graphId, takeCurrentSnapshot());
    const now = new Date().toISOString();
    const nextNodes = nodesRef.current.map((n) => {
      if (n.id !== selectedId) return n;
      const fields = { ...(n.fields ?? {}) };
      const classification = fields.classification;
      if (nextKind !== 'task') {
        delete fields.start;
        delete fields.end;
        delete fields.progress;
        delete fields.status;
        delete fields.recurrence;
      } else {
        if (!isValidTaskStatus(String(fields.status ?? ''))) fields.status = 'todo';
        if (typeof fields.progress !== 'number') fields.progress = 0;
        if (typeof fields.start !== 'string') fields.start = '';
        if (typeof fields.end !== 'string') fields.end = '';
        if (typeof fields.recurrence !== 'string') fields.recurrence = '';
      }
      return {
        ...n,
        kind: nextKind,
        fields: classification == null ? fields : { ...fields, classification },
        updatedAt: now,
      };
    });
    await applySnapshot(graphId, { nodes: nextNodes, edges: edgesRef.current });
    refreshVisible(nextNodes);
    setLastSync(new Date().toLocaleTimeString());

    const duration = performance.now() - startTs;
    const classification = getNodeClassification(selectedId);
    postMetric('task.kind.toggle.duration', duration, { graphId, nodeId: selectedId, nextKind, nodeCount: nextNodes.length });
    logVisit('task-kind-toggle', selectedId, graphId, classification);
    postAudit('task-kind-toggle', graphId, { nodeId: selectedId, nextKind, classification });
  };

  const saveTaskFields = async () => {
    if (!selectedId || isReadonly || !taskDraft) return;
    setTaskError('');

    const trimmedStart = taskDraft.start.trim();
    const trimmedEnd = taskDraft.end.trim();
    const startTs = performance.now();

    const progressRaw = taskDraft.progress.trim();
    const progressValue = progressRaw === '' ? undefined : Number(progressRaw);
    if (progressRaw !== '' && (!Number.isFinite(progressValue) || progressValue < 0 || progressValue > 100)) {
      setTaskError('progress 必须是 0–100 的数字');
      return;
    }

    if (trimmedStart && parseDate(trimmedStart) == null) {
      setTaskError('start 日期格式无效（支持 YYYY-MM-DD 或 ISO）');
      return;
    }
    if (trimmedEnd && parseDate(trimmedEnd) == null) {
      setTaskError('end 日期格式无效（支持 YYYY-MM-DD 或 ISO）');
      return;
    }

    pushHistory(graphId, takeCurrentSnapshot());
    const now = new Date().toISOString();
    const nextNodes = nodesRef.current.map((n) => {
      if (n.id !== selectedId) return n;
      const fields = { ...(n.fields ?? {}) };
      const classification = fields.classification;
      if (taskDraft.kind !== 'task') {
        delete fields.start;
        delete fields.end;
        delete fields.progress;
        delete fields.status;
        delete fields.recurrence;
        return { ...n, kind: 'idea', fields: classification == null ? fields : { ...fields, classification }, updatedAt: now };
      }
      fields.start = trimmedStart;
      fields.end = trimmedEnd;
      if (progressValue == null) delete fields.progress;
      else fields.progress = progressValue;
      fields.status = taskDraft.status;
      if (taskDraft.recurrence.trim()) fields.recurrence = taskDraft.recurrence.trim();
      else delete fields.recurrence;
      return { ...n, kind: 'task', fields: classification == null ? fields : { ...fields, classification }, updatedAt: now };
    });

    await applySnapshot(graphId, { nodes: nextNodes, edges: edgesRef.current });
    setLastSync(new Date().toLocaleTimeString());

    const duration = performance.now() - startTs;
    const classification = getNodeClassification(selectedId, nextNodes);
    postMetric('task.update.duration', duration, { graphId, nodeId: selectedId, kind: taskDraft.kind });
    logVisit('task-update', selectedId, graphId, classification);
    postAudit('task-update', graphId, {
      nodeId: selectedId,
      kind: taskDraft.kind,
      start: trimmedStart,
      end: trimmedEnd,
      progress: progressValue,
      status: taskDraft.status,
      recurrence: taskDraft.recurrence.trim() || undefined,
      classification,
    });
  };

  const batchUpdateTaskStatus = async () => {
    if (isReadonly) return;
    const startTs = performance.now();
    pushHistory(graphId, takeCurrentSnapshot());
    const now = new Date().toISOString();
    let changed = 0;
    const nextNodes = nodesRef.current.map((n) => {
      if (n.kind !== 'task') return n;
      const fields = { ...(n.fields ?? {}) };
      if (fields.status === batchStatus) return n;
      fields.status = batchStatus;
      changed += 1;
      return { ...n, fields, updatedAt: now };
    });
    await applySnapshot(graphId, { nodes: nextNodes, edges: edgesRef.current });
    refreshVisible(nextNodes);
    setLastSync(new Date().toLocaleTimeString());

    const duration = performance.now() - startTs;
    postMetric('task.batch.status.duration', duration, { graphId, status: batchStatus, changed });
    logVisit('task-batch-status', selectedId ?? undefined, graphId, getNodeClassification(selectedId));
    postAudit('task-batch-status', graphId, { status: batchStatus, changed });
  };

  const graphNodes = nodesRef.current;
  const graphEdges = edgesRef.current;
  const selectedNode = selectedId ? graphNodes.find((n) => n.id === selectedId) : undefined;

  const getFieldString = (node: PositionedNode, key: string) => {
    const raw = node.fields?.[key];
    return typeof raw === 'string' ? raw : '';
  };
  const getFieldNumber = (node: PositionedNode, key: string) => {
    const raw = node.fields?.[key];
    return typeof raw === 'number' && Number.isFinite(raw) ? raw : undefined;
  };
  const getTaskStatus = (node: PositionedNode) => {
    const raw = getFieldString(node, 'status');
    if (raw === 'todo' || raw === 'doing' || raw === 'done') return raw;
    return 'todo';
  };
  const getEdgeDependencyType = (edge: PositionedEdge): DependencyType => {
    const raw = (edge as any).dependencyType as unknown;
    if (raw == null) return 'FS';
    return isDependencyType(raw) ? raw : 'FS';
  };

  const derived = useMemo(() => {
    const nodeById = new Map(graphNodes.map((n) => [n.id, n]));
    const dependencyEdges = graphEdges.filter((e) => e.relation === 'depends-on');
    const dependencyOutCountById = new Map<string, number>();
    const dependencyInCountById = new Map<string, number>();
    const dependencyByFrom = new Map<string, PositionedEdge[]>();
    const dependencyByTo = new Map<string, PositionedEdge[]>();
    dependencyEdges.forEach((e) => {
      dependencyOutCountById.set(e.from, (dependencyOutCountById.get(e.from) ?? 0) + 1);
      dependencyInCountById.set(e.to, (dependencyInCountById.get(e.to) ?? 0) + 1);
      const outBucket = dependencyByFrom.get(e.from) ?? [];
      outBucket.push(e);
      dependencyByFrom.set(e.from, outBucket);
      const inBucket = dependencyByTo.get(e.to) ?? [];
      inBucket.push(e);
      dependencyByTo.set(e.to, inBucket);
    });

    const taskBlockedInfoById = new Map<string, { blocked: boolean; reasons: string[] }>();
    graphNodes.forEach((n) => {
      if (n.kind !== 'task') return;
      const deps = dependencyByFrom.get(n.id) ?? [];
      if (deps.length === 0) {
        taskBlockedInfoById.set(n.id, { blocked: false, reasons: [] });
        return;
      }

      const reasons: string[] = [];
      const fromStartRaw = getFieldString(n, 'start');
      const fromEndRaw = getFieldString(n, 'end');
      const fromStart = parseDate(fromStartRaw);
      const fromEnd = parseDate(fromEndRaw);

      deps.forEach((edge) => {
        const rawType = (edge as any).dependencyType as unknown;
        if (rawType != null && !isDependencyType(rawType)) {
          reasons.push(`无效依赖类型：${String(rawType)}`);
          return;
        }
        const depType = ((rawType == null ? 'FS' : rawType) as DependencyType) || 'FS';
        const upstream = nodeById.get(edge.to);
        if (!upstream) {
          reasons.push(`${depType}: 上游节点不存在（${edge.to}）`);
          return;
        }
        const upstreamLabel = upstream.label || upstream.id;
        const upStartRaw = getFieldString(upstream, 'start');
        const upEndRaw = getFieldString(upstream, 'end');
        const upStart = parseDate(upStartRaw);
        const upEnd = parseDate(upEndRaw);

        const missing = (name: string) => `缺少或无效字段：${name}`;

        if (depType === 'FS') {
          if (fromStart == null) return reasons.push(`FS: ${missing('from.start')}`);
          if (upEnd == null) return reasons.push(`FS: ${missing(`上游(${upstreamLabel}).end`)}`);
          if (fromStart < upEnd)
            reasons.push(`FS: start(${fromStartRaw || '-'}) < 上游(${upstreamLabel}) end(${upEndRaw || '-'})`);
          return;
        }
        if (depType === 'SS') {
          if (fromStart == null) return reasons.push(`SS: ${missing('from.start')}`);
          if (upStart == null) return reasons.push(`SS: ${missing(`上游(${upstreamLabel}).start`)}`);
          if (fromStart < upStart)
            reasons.push(`SS: start(${fromStartRaw || '-'}) < 上游(${upstreamLabel}) start(${upStartRaw || '-'})`);
          return;
        }
        if (depType === 'FF') {
          if (fromEnd == null) return reasons.push(`FF: ${missing('from.end')}`);
          if (upEnd == null) return reasons.push(`FF: ${missing(`上游(${upstreamLabel}).end`)}`);
          if (fromEnd < upEnd)
            reasons.push(`FF: end(${fromEndRaw || '-'}) < 上游(${upstreamLabel}) end(${upEndRaw || '-'})`);
          return;
        }
        if (depType === 'SF') {
          if (fromEnd == null) return reasons.push(`SF: ${missing('from.end')}`);
          if (upStart == null) return reasons.push(`SF: ${missing(`上游(${upstreamLabel}).start`)}`);
          if (fromEnd < upStart)
            reasons.push(`SF: end(${fromEndRaw || '-'}) < 上游(${upstreamLabel}) start(${upStartRaw || '-'})`);
          return;
        }
      });

      taskBlockedInfoById.set(n.id, { blocked: reasons.length > 0, reasons });
    });

    return {
      nodeById,
      dependencyEdges,
      dependencyOutCountById,
      dependencyInCountById,
      dependencyByFrom,
      dependencyByTo,
      taskBlockedInfoById,
    };
  }, [graphNodes, graphEdges]);

  const { nodeById, dependencyOutCountById, dependencyInCountById, dependencyByFrom, dependencyByTo, taskBlockedInfoById } =
    derived;
  const outgoingDependencies = selectedId ? dependencyByFrom.get(selectedId) ?? [] : [];
  const incomingDependencies = selectedId ? dependencyByTo.get(selectedId) ?? [] : [];

  const selectedBlockInfo = selectedId ? taskBlockedInfoById.get(selectedId) : undefined;
  const boardColumns = [
    { key: 'todo', label: 'Todo' },
    { key: 'doing', label: 'Doing' },
    { key: 'done', label: 'Done' },
  ] as const;

  useEffect(() => {
    if (!selectedId) {
      setTaskDraft(null);
      setTaskError('');
      return;
    }
    const node = nodesRef.current.find((n) => n.id === selectedId);
    if (!node) {
      setTaskDraft(null);
      setTaskError('');
      return;
    }
    const kind = node.kind === 'task' ? 'task' : 'idea';
    const start = typeof node.fields?.start === 'string' ? node.fields.start : '';
    const end = typeof node.fields?.end === 'string' ? node.fields.end : '';
    const progress = typeof node.fields?.progress === 'number' && Number.isFinite(node.fields.progress) ? String(node.fields.progress) : '';
    const status = isValidTaskStatus(String(node.fields?.status ?? '')) ? (node.fields?.status as any) : 'todo';
    const recurrence = typeof node.fields?.recurrence === 'string' ? node.fields.recurrence : '';
    setTaskDraft({ kind, start, end, progress, status, recurrence });
    setTaskError('');
  }, [selectedId, graphId, historyVersion]);

  return (
    <div className="shell">
      <header className="topbar">CDM 工作台 · 框架壳</header>
      <div className="toolbar">
        <div className="toolbar-group">
          <span className="toolbar-label">视图</span>
          {viewModes.map((v) => (
            <button key={v.key} className={viewMode === v.key ? 'btn active' : 'btn'} onClick={() => switchView(v.key)}>
              {v.label}
            </button>
          ))}
        </div>
        <div className="toolbar-group">
          <span className="toolbar-label">布局</span>
          {layoutModes.map((m) => (
            <button
              key={m.key}
              className={state.mode === m.key ? 'btn active' : 'btn'}
              onClick={() => handleMode(m.key)}
              disabled={isReadonly}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="toolbar-group">
          <span className="toolbar-label">开关</span>
          {toggleList.map((t) => (
            <button
              key={t.key}
              className={state.toggles?.[t.key] ? 'btn active' : 'btn'}
              onClick={() => handleToggle(t.key)}
              disabled={isReadonly}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="toolbar-group">
          <span className="toolbar-label">视口</span>
          <button className="btn" onClick={() => pan(-40, 0)}>
            ←
          </button>
          <button className="btn" onClick={() => pan(40, 0)}>
            →
          </button>
          <button className="btn" onClick={() => pan(0, -40)}>
            ↑
          </button>
          <button className="btn" onClick={() => pan(0, 40)}>
            ↓
          </button>
          <button className="btn" onClick={() => zoom(0.1)}>
            放大
          </button>
          <button className="btn" onClick={() => zoom(-0.1)}>
            缩小
          </button>
          <span className="toolbar-label">缩放 {scale.toFixed(2)}</span>
        </div>
        <div className="toolbar-group">
          <span className="toolbar-label">下钻</span>
          <button className="btn" onClick={drill} disabled={selectedId == null || isReadonly}>
            下钻到选中
          </button>
          <button className="btn" onClick={() => nudgeSelected()} disabled={selectedId == null || isReadonly}>
            移动选中
          </button>
          <button
            className="btn"
            onClick={undo}
            disabled={isReadonly || (historyRef.current.get(graphId)?.past.length ?? 0) === 0}
          >
            撤销
          </button>
          <button
            className="btn"
            onClick={redo}
            disabled={isReadonly || (historyRef.current.get(graphId)?.future.length ?? 0) === 0}
          >
            重做
          </button>
          <button className="btn" onClick={goBack} disabled={ctxStack.current.length === 0}>
            返回上级
          </button>
          <span className="toolbar-label">Graph: {graphId}</span>
          <button className="btn" onClick={goRoot} disabled={ctxStack.current.length === 0}>
            返回主图
          </button>
          <div className="breadcrumb" aria-label="breadcrumb">
            {(() => {
              const depth = ctxStack.current.length;
              const rootGraphId = ctxStack.current[0]?.graphId ?? graphId;
              return (
                <>
                  <button className="breadcrumb-crumb" onClick={goRoot} disabled={depth === 0}>
                    {rootGraphId}
                  </button>
                  {drillStack.current.map((ctx, idx) => {
                    const crumbDepth = idx + 1;
                    const isCurrent = crumbDepth === depth;
                    const label = ctx.label ? `${ctx.label}` : ctx.nodeId;
                    return (
                      <span key={`${ctx.graphId}-${idx}`} className="breadcrumb-item">
                        <span className="breadcrumb-sep">/</span>
                        <button
                          className="breadcrumb-crumb"
                          onClick={() => returnToDepth(crumbDepth)}
                          disabled={isCurrent}
                        >
                          {label}
                        </button>
                      </span>
                    );
                  })}
                </>
              );
            })()}
          </div>
        </div>
        <div className="toolbar-meta">
          <span>版本：{state.version}</span>
          {state.updatedAt && <span>更新：{new Date(state.updatedAt).toLocaleTimeString()}</span>}
          {lastSync && <span>同步：{lastSync}</span>}
          {isReadonly && <span className="warning">只读模式</span>}
          {state.saving && <span>保存中…</span>}
          {state.error && <span className="error">错误：{state.error}</span>}
        </div>
      </div>
      <div className="layout">
        <aside className="sidebar">左侧导航/资源树</aside>
        <main className="canvas">
          <Section title="画布">
            <p>当前视图：{viewModes.find((v) => v.key === viewMode)?.label}</p>
            <p>当前布局：{layoutModes.find((m) => m.key === state.mode)?.label}</p>
            <p>开关状态：{toggleList.map((t) => `${t.label}:${state.toggles?.[t.key] ? '开' : '关'}`).join(' / ')}</p>
            {viewMode === 'mindmap' && (
              <>
                <div className="canvas-wrapper">
              <canvas ref={canvasRef} width={880} height={520} className="layout-canvas" />
              <div className="watermark">CONFIDENTIAL · CDM</div>
            </div>
            <p>
              视口可见节点：{visibleCount}/{sampleNodeCount} · 缩放 {scale.toFixed(2)} · 偏移 ({offset.x.toFixed(0)},{' '}
              {offset.y.toFixed(0)})
            </p>
            <div className="perf-panel">
              <div className="perf-title">性能快照</div>
              <div className="perf-row">
                <span>节点数</span>
                <span>{sampleNodeCount}</span>
              </div>
              <div className="perf-row">
                <span>最近渲染耗时</span>
                <span>{lastRenderMs ? `${lastRenderMs.toFixed(2)} ms` : '未测'}</span>
              </div>
              <div className="perf-row">
                <span>下钻 P95</span>
                <span>{drillP95 ? `${drillP95.toFixed(2)} ms` : '未测'}</span>
              </div>
              <div className="perf-row">
                <span>返回 P95</span>
                <span>{returnP95 ? `${returnP95.toFixed(2)} ms` : '未测'}</span>
              </div>
              <div className="perf-row">
                <span>样本数</span>
                <span>
                  {drillSamplesRef.current.length}/{returnSamplesRef.current.length}
                </span>
              </div>
              <button
                className="btn"
              onClick={() => {
                const nodes = Array.from({ length: sampleNodeCount }, (_, i) => ({
                  id: i,
                  x: Math.random() * 2000,
                  y: Math.random() * 2000,
                }));
                const start = performance.now();
                // 简易视口裁剪：只保留前 200 个示例用于渲染
                nodes.slice(0, 200).map((n) => n.x + n.y);
                const end = performance.now();
                setLastRenderMs(end - start);
                fetch(`${apiBase}/metrics`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    id: `metric-${Date.now()}`,
                    name: 'render.baseline',
                    value: end - start,
                    unit: 'ms',
                    createdAt: new Date().toISOString(),
                    context: { nodeCount: sampleNodeCount, mode: state.mode },
                  }),
                }).catch((e) => console.warn('metric post failed', e));
              }}
            >
              运行 1k 节点渲染基线
            </button>
          </div>
              </>
            )}
            {viewMode === 'board' ? (
              <div className="board">
                {boardColumns.map((col) => {
                  const colNodes = nodesRef.current.filter((n) => n.kind === 'task' && getTaskStatus(n) === col.key);
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
                            onClick={() => handleSelect(n.id)}
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
            ) : (
              <div className="virtual-list" onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)}>
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
                    onClick={() => handleSelect(n.id)}
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
                        时间轴 #{displayIndex} - {masked ? '（遮罩）' : n.label} · {start || '-'} → {end || '-'} · 状态 {status} · 依赖 {outCount}/{inCount}
                        {blocked && <span className="warning"> · blocked</span>}
                        {blocked && blockedReason && <span className="muted">（{blockedReason}）</span>}
                      </>
                    )}
                  </div>
                );
              })}
              <div style={{ height: nodesRef.current.length * rowHeight }} aria-hidden />
              </div>
            )}
            <p>当前选中节点：{selectedId ?? '无'}</p>
          </Section>
        </main>
        <aside className="inspector">
          <Section title="任务">
            {!selectedId ? (
              <div className="muted">请选择一个节点以编辑任务字段。</div>
            ) : (
              <>
                {taskError && <div className="error">{taskError}</div>}
                <div className="dep-add">
                  <span className="muted">类型</span>
                  <select
                    className="select"
                    value={taskDraft?.kind ?? 'idea'}
                    onChange={(e) => toggleSelectedTaskKind((e.target as HTMLSelectElement).value as 'idea' | 'task')}
                    disabled={isReadonly}
                    data-testid="task-kind"
                  >
                    <option value="idea">idea</option>
                    <option value="task">task</option>
                  </select>
                  <span className="muted">状态</span>
                  <select
                    className="select"
                    value={taskDraft?.status ?? 'todo'}
                    onChange={(e) =>
                      setTaskDraft((d) =>
                        d
                          ? {
                              ...d,
                              status: (e.target as HTMLSelectElement).value as 'todo' | 'doing' | 'done',
                            }
                          : d
                      )
                    }
                    disabled={isReadonly || taskDraft?.kind !== 'task'}
                    data-testid="task-status"
                  >
                    <option value="todo">todo</option>
                    <option value="doing">doing</option>
                    <option value="done">done</option>
                  </select>
                </div>
                {taskDraft?.kind === 'task' && selectedBlockInfo?.blocked && (
                  <div className="warning" data-testid="task-blocked">
                    blocked：{selectedBlockInfo.reasons[0]}
                  </div>
                )}
                <div className="dep-block">
                  <div className="dep-add">
                    <span className="muted">start</span>
                    <input
                      className="select"
                      value={taskDraft?.start ?? ''}
                      placeholder="YYYY-MM-DD 或 ISO"
                      onChange={(e) => setTaskDraft((d) => (d ? { ...d, start: (e.target as HTMLInputElement).value } : d))}
                      disabled={isReadonly || taskDraft?.kind !== 'task'}
                      data-testid="task-start"
                    />
                  </div>
                  <div className="dep-add">
                    <span className="muted">end</span>
                    <input
                      className="select"
                      value={taskDraft?.end ?? ''}
                      placeholder="YYYY-MM-DD 或 ISO"
                      onChange={(e) => setTaskDraft((d) => (d ? { ...d, end: (e.target as HTMLInputElement).value } : d))}
                      disabled={isReadonly || taskDraft?.kind !== 'task'}
                      data-testid="task-end"
                    />
                  </div>
                  <div className="dep-add">
                    <span className="muted">progress</span>
                    <input
                      className="select"
                      value={taskDraft?.progress ?? ''}
                      placeholder="0-100"
                      inputMode="numeric"
                      onChange={(e) =>
                        setTaskDraft((d) => (d ? { ...d, progress: (e.target as HTMLInputElement).value } : d))
                      }
                      disabled={isReadonly || taskDraft?.kind !== 'task'}
                      data-testid="task-progress"
                    />
                  </div>
                  <div className="dep-add">
                    <span className="muted">recurrence</span>
                    <input
                      className="select"
                      value={taskDraft?.recurrence ?? ''}
                      placeholder="例如: every-week"
                      onChange={(e) =>
                        setTaskDraft((d) => (d ? { ...d, recurrence: (e.target as HTMLInputElement).value } : d))
                      }
                      disabled={isReadonly || taskDraft?.kind !== 'task'}
                      data-testid="task-recurrence"
                    />
                  </div>
                  <div className="dep-add">
                    <button className="btn" onClick={saveTaskFields} disabled={isReadonly || !taskDraft}>
                      保存任务
                    </button>
                  </div>
                </div>

                <div className="dep-block">
                  <div className="dep-subtitle">批量</div>
                  <div className="dep-add">
                    <select
                      className="select"
                      value={batchStatus}
                      onChange={(e) => setBatchStatus((e.target as HTMLSelectElement).value as 'todo' | 'doing' | 'done')}
                      disabled={isReadonly}
                      data-testid="task-batch-status"
                    >
                      <option value="todo">todo</option>
                      <option value="doing">doing</option>
                      <option value="done">done</option>
                    </select>
                    <button className="btn" onClick={batchUpdateTaskStatus} disabled={isReadonly}>
                      批量设置所有任务 status
                    </button>
                  </div>
                </div>

                {isReadonly && <div className="warning">只读模式：无法编辑任务字段。</div>}
              </>
            )}
          </Section>
          <Section title="依赖">
            {!selectedId ? (
              <div className="muted">请选择一个节点以查看依赖。</div>
            ) : (
              <>
                <div className="dep-meta">
                  <div className="dep-selected">
                    选中：<strong>{selectedNode?.label ?? selectedId}</strong>
                  </div>
                </div>
                <div className="dep-add">
                  <select
                    className="select"
                    value={dependencyCandidateId}
                    onChange={(e) => setDependencyCandidateId((e.target as HTMLSelectElement).value)}
                    disabled={isReadonly}
                    data-testid="dep-candidate-target"
                  >
                    <option value="">选择要依赖的节点…</option>
                    {nodesRef.current
                      .filter((n) => n.id !== selectedId)
                      .map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.label}
                        </option>
                      ))}
                  </select>
                  <select
                    className="select"
                    value={dependencyCandidateType}
                    onChange={(e) =>
                      setDependencyCandidateType((e.target as HTMLSelectElement).value as DependencyType)
                    }
                    disabled={isReadonly}
                    data-testid="dep-candidate-type"
                  >
                    {dependencyTypes.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <button className="btn" onClick={addDependency} disabled={isReadonly || !dependencyCandidateId}>
                    添加依赖
                  </button>
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
                            {nodeById.get(e.to)?.label ?? e.to}{' '}
                            <span className="muted">({effectiveType})</span>
                            {invalidType && <span className="warning">（invalid: {String(rawType)}）</span>}
                          </span>
                          <select
                            className={`select ${invalidType ? 'invalid' : ''}`}
                            value={effectiveType}
                            onChange={(ev) =>
                              upsertDependencyType(e.from, e.to, (ev.target as HTMLSelectElement).value as DependencyType)
                            }
                            disabled={isReadonly}
                            data-testid={`dep-type-${e.from}-${e.to}`}
                          >
                            {dependencyTypes.map((t) => (
                              <option key={t.key} value={t.key}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                          <button
                            className="btn btn-small"
                            onClick={() => removeDependency(e.from, e.to)}
                            disabled={isReadonly}
                          >
                            移除
                          </button>
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
                            {nodeById.get(e.from)?.label ?? e.from}{' '}
                            <span className="muted">({effectiveType})</span>
                            {invalidType && <span className="warning">（invalid: {String(rawType)}）</span>}
                          </span>
                          <button
                            className="btn btn-small"
                            onClick={() => removeDependency(e.from, e.to)}
                            disabled={isReadonly}
                          >
                            移除
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
                {isReadonly && <div className="warning">只读模式：无法编辑依赖。</div>}
              </>
            )}
          </Section>
          <Section title="右侧面板">属性 / 访问记录 / 模板 / AI 建议</Section>
          <Section title="通知抽屉">通知与审计快捷入口</Section>
        </aside>
      </div>
    </div>
  );
}

export default App;
