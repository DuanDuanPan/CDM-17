import { useEffect, useMemo, useState } from 'react';
import './style.css';
import { LayoutController, LayoutControllerState } from '@cdm/core-client';
import { useRef } from 'react';

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

function App() {
  const isReadonly = useMemo(() => new URLSearchParams(window.location.search).get('readonly') === '1', []);
  const controller = useMemo(
    () =>
      new LayoutController(
        'demo-graph',
        apiBase,
        (s) => {
          setState({ ...s });
        },
        isReadonly ? 'viewer' : 'editor'
      ),
    [apiBase, isReadonly]
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
  const apiBase = 'http://localhost:4000';
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nodesRef = useRef<Array<{ id: number; x: number; y: number }>>([]);
  const edgesRef = useRef<Array<{ from: number; to: number }>>([]);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);

  // 初始化数据集（节点/边）
  useEffect(() => {
    if (nodesRef.current.length === 0) {
      nodesRef.current = Array.from({ length: sampleNodeCount }, (_, i) => ({
        id: i,
        x: Math.random() * 2000 - 500,
        y: Math.random() * 2000 - 500,
      }));
      edgesRef.current = Array.from({ length: sampleNodeCount - 1 }, (_, i) => ({
        from: i,
        to: i + 1,
      }));
    }
  }, [sampleNodeCount]);

  // 虚拟列表视口
  useEffect(() => {
    const updateVisible = () => {
      const start = Math.floor(scrollTop / rowHeight);
      const end = Math.min(sampleNodeCount, start + Math.ceil(viewportHeight / rowHeight) + 10);
      setVisibleNodes(nodesRef.current.slice(start, end));
    };
    updateVisible();
  }, [scrollTop, sampleNodeCount, rowHeight, viewportHeight]);

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
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      edgesRef.current.forEach((e) => {
        if (!visibleIds.has(e.from) || !visibleIds.has(e.to)) return;
        const from = nodesRef.current[e.from];
        const to = nodesRef.current[e.to];
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
      });

      ctx.fillStyle = '#2563eb';
      visible.forEach((n) => {
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
  }, [offset, scale]);

  useEffect(() => {
    controller.load().then(setState);
  }, [controller]);

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
              {!isReadonly && <div className="watermark">CONFIDENTIAL · CDM</div>}
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
              {visibleNodes.map((n) => (
                <div key={n.id} className="virtual-row" style={{ transform: `translateY(${n.id * rowHeight}px)` }}>
                  节点 #{n.id} — x:{n.x.toFixed(1)} y:{n.y.toFixed(1)}
                </div>
              ))}
              <div style={{ height: sampleNodeCount * rowHeight }} aria-hidden />
            </div>
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
