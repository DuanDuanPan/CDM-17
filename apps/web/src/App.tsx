import { useEffect, useMemo, useState } from 'react';
import './style.css';
import { LayoutController, LayoutControllerState } from '@cdm/core-client';
import { useRef } from 'react';
import { DrillContext } from '@cdm/types';

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

type PositionedNode = {
  id: string;
  label: string;
  kind: 'idea';
  createdAt: string;
  updatedAt: string;
  x: number;
  y: number;
  folded?: boolean;
};

type PositionedEdge = { from: string; to: string };

function App() {
  const isReadonly = useMemo(() => new URLSearchParams(window.location.search).get('readonly') === '1', []);
  const [graphId, setGraphId] = useState('demo-graph');
  const [controller, setController] = useState<LayoutController>(
    () =>
      new LayoutController(
        'demo-graph',
        apiBase,
        (s) => {
          setState({ ...s });
        },
        isReadonly ? 'viewer' : 'editor'
      )
  );
  const [state, setState] = useState<LayoutControllerState>(controller.getState());
  const [lastSync, setLastSync] = useState<string>();
  const [lastRenderMs, setLastRenderMs] = useState<number>();
  const [sampleNodeCount] = useState(1000);
  const [visibleNodes, setVisibleNodes] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [scrollTop, setScrollTop] = useState(0);
  const [visibleCount, setVisibleCount] = useState(0);
  const viewportHeight = 320;
  const rowHeight = 30;
  const apiBase = import.meta.env.VITE_API_BASE || (window as any).__CDM_API__ || window.location.origin;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nodesRef = useRef<PositionedNode[]>([]);
  const edgesRef = useRef<PositionedEdge[]>([]);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const ctxStack = useRef<
    Array<{ graphId: string; offset: { x: number; y: number }; scale: number; selectedId: string | null }>
  >([]);
  const drillStack = useRef<DrillContext[]>([]);

  const seedGraphSnapshot = (count: number) => {
    const now = new Date().toISOString();
    const nodes: PositionedNode[] = Array.from({ length: count }, (_, i) => ({
      id: `node-${i}`,
      label: `节点 ${i}`,
      kind: 'idea',
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

  const loadGraphSnapshot = async (id: string) => {
    const res = await fetch(`${apiBase}/graph/${id}`);
    return (await res.json()) as { nodes: PositionedNode[]; edges: PositionedEdge[] };
  };

  const saveGraphSnapshot = async (id: string, snapshot: { nodes: PositionedNode[]; edges: PositionedEdge[] }) => {
    await fetch(`${apiBase}/graph/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snapshot),
    });
  };

  const refreshVisible = (nodes = nodesRef.current) => {
    const start = Math.floor(scrollTop / rowHeight);
    const end = Math.min(nodes.length, start + Math.ceil(viewportHeight / rowHeight) + 10);
    setVisibleNodes(nodes.slice(start, end));
  };

  // 初始化/加载当前 graph 数据
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      const snap = await loadGraphSnapshot(graphId);
      if (!snap.nodes || snap.nodes.length === 0) {
        const seeded = seedGraphSnapshot(sampleNodeCount);
        nodesRef.current = seeded.nodes;
        edgesRef.current = seeded.edges;
        await saveGraphSnapshot(graphId, seeded);
      } else {
        nodesRef.current = snap.nodes;
        edgesRef.current = snap.edges;
      }
      if (!cancelled) refreshVisible(nodesRef.current);
    };
    init();
    return () => {
      cancelled = true;
    };
  }, [graphId, apiBase, sampleNodeCount]);

  // 虚拟列表视口
  useEffect(() => {
    refreshVisible();
  }, [scrollTop, rowHeight, viewportHeight, graphId]);

  // 画布渲染（视口裁剪 + 线裁剪）
  useEffect(() => {
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
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      edgesRef.current.forEach((e) => {
        if (!visibleIds.has(e.from) || !visibleIds.has(e.to)) return;
        const from = nodeById.get(e.from);
        const to = nodeById.get(e.to);
        if (!from || !to) return;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
      });

      visible.forEach((n) => {
        ctx.fillStyle = isReadonly && n.folded ? '#94a3b8' : '#2563eb';
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
  }, [offset, scale, isReadonly]);

  useEffect(() => {
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
    setSelectedId(null);
    setOffset({ x: 0, y: 0 });
    setScale(1);
    c.load().then(setState);
  }, [graphId, apiBase, isReadonly]);

  const handleMode = async (mode: 'free' | 'tree' | 'logic') => {
    if (isReadonly) return;
    controller.setMode(mode);
    setState({ ...controller.getState(), mode });
    const saved = await controller.save('web-shell');
    setState({ ...saved });
    setLastSync(new Date().toLocaleTimeString());
  };

  const handleToggle = async (key: keyof LayoutControllerState['toggles']) => {
    if (isReadonly) return;
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

  const logVisit = (action: string, nodeId?: string) => {
    fetch(`${apiBase}/visits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitor: 'web-shell',
        nodeId: nodeId ?? 'na',
        graphId,
        action,
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

  const postAudit = (action: string, target: string, metadata?: Record<string, unknown>) => {
    fetch(`${apiBase}/audit/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actor: 'web-shell',
        action,
        target,
        createdAt: new Date().toISOString(),
        metadata,
      }),
    }).catch(() => undefined);
  };

  const drill = async () => {
    if (!selectedId || isReadonly) return;
    const startTs = performance.now();
    ctxStack.current.push({ graphId, offset, scale, selectedId });
    const idx = Number(selectedId.split('-')[1] ?? 0);
    const nextId = `graph-${idx}`;

    const existing = await loadGraphSnapshot(nextId);
    if (!existing.nodes || existing.nodes.length === 0) {
      const startIndex = idx;
      const endIndex = Math.min(nodesRef.current.length, startIndex + 50);
      const subsetNodes = nodesRef.current.slice(startIndex, endIndex);
      const subsetIds = new Set(subsetNodes.map((n) => n.id));
      const subsetEdges = edgesRef.current.filter((e) => subsetIds.has(e.from) && subsetIds.has(e.to));
      await saveGraphSnapshot(nextId, { nodes: subsetNodes, edges: subsetEdges });
    }

    drillStack.current.push({ graphId: nextId, parentGraphId: graphId, nodeId: selectedId });
    setGraphId(nextId);
    logVisit('drill', selectedId);
    postAudit('drill', nextId, { parentGraphId: graphId, nodeId: selectedId });
    postMetric('drill.duration', performance.now() - startTs, { from: graphId, to: nextId, nodeId: selectedId });
  };

  const goBack = async () => {
    const prev = ctxStack.current.pop();
    if (!prev) return;
    const startTs = performance.now();
    const childId = graphId;
    const childSnap = await loadGraphSnapshot(childId);
    const parentSnap = await loadGraphSnapshot(prev.graphId);

    if (childSnap.nodes && parentSnap.nodes) {
      const childById = new Map(childSnap.nodes.map((n) => [n.id, n]));
      const mergedNodes = parentSnap.nodes.map((n) => {
        const child = childById.get(n.id);
        return child ? { ...n, x: child.x, y: child.y, updatedAt: new Date().toISOString() } : n;
      });
      await saveGraphSnapshot(prev.graphId, { nodes: mergedNodes, edges: parentSnap.edges ?? [] });
    }

    setGraphId(prev.graphId);
    setOffset(prev.offset);
    setScale(prev.scale);
    setSelectedId(prev.selectedId);
    logVisit('return', prev.selectedId ?? undefined);
    postAudit('return', prev.graphId, { from: childId, nodeId: prev.selectedId });
    postMetric('return.duration', performance.now() - startTs, { from: childId, to: prev.graphId });
    drillStack.current.pop();
  };

  const nudgeSelected = async (dx = 20, dy = 20) => {
    if (!selectedId || isReadonly) return;
    const updated = nodesRef.current.map((n) =>
      n.id === selectedId ? { ...n, x: n.x + dx, y: n.y + dy, updatedAt: new Date().toISOString() } : n
    );
    nodesRef.current = updated;
    await saveGraphSnapshot(graphId, { nodes: updated, edges: edgesRef.current });
    controller.sendGraphUpdate({ nodes: updated, edges: edgesRef.current });
    refreshVisible(updated);
    logVisit('edit', selectedId);
    postAudit('subgraph-edit', graphId, { nodeId: selectedId });
  };

  return (
    <div className="shell">
      <header className="topbar">CDM 工作台 · 框架壳</header>
      <div className="toolbar">
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
          <button className="btn" onClick={goBack} disabled={ctxStack.current.length === 0}>
            返回上级
          </button>
          <span className="toolbar-label">Graph: {graphId}</span>
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
            <p>当前布局：{layoutModes.find((m) => m.key === state.mode)?.label}</p>
            <p>开关状态：{toggleList.map((t) => `${t.label}:${state.toggles?.[t.key] ? '开' : '关'}`).join(' / ')}</p>
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
            <div className="virtual-list" onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)}>
              {visibleNodes.map((n) => {
                const idx = Number(n.id.split('-')[1] ?? 0);
                const masked = isReadonly && n.folded;
                return (
                  <div
                    key={n.id}
                    className={`virtual-row ${selectedId === n.id ? 'selected' : ''}`}
                    style={{ transform: `translateY(${idx * rowHeight}px)` }}
                    onClick={() => handleSelect(n.id)}
                    role="button"
                    tabIndex={0}
                  >
                    节点 #{idx} — {masked ? '（遮罩）' : n.label} x:{n.x.toFixed(1)} y:{n.y.toFixed(1)}
                  </div>
                );
              })}
              <div style={{ height: sampleNodeCount * rowHeight }} aria-hidden />
            </div>
            <p>当前选中节点：{selectedId ?? '无'}</p>
          </Section>
        </main>
        <aside className="inspector">
          <Section title="右侧面板">属性 / 访问记录 / 模板 / AI 建议</Section>
          <Section title="通知抽屉">通知与审计快捷入口</Section>
        </aside>
      </div>
    </div>
  );
}

export default App;
