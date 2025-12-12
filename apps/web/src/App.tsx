import { useEffect, useMemo, useState } from 'react';
import './style.css';
import { LayoutController, LayoutControllerState } from '@cdm/core-client';

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
      new LayoutController('demo-graph', 'http://localhost:4000', (s) => {
        setState({ ...s });
      }),
    []
  );
  const [state, setState] = useState<LayoutControllerState>(controller.getState());
  const [lastSync, setLastSync] = useState<string>();
  const [lastRenderMs, setLastRenderMs] = useState<number>();
  const [sampleNodeCount] = useState(1000);
  const [visibleNodes, setVisibleNodes] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [scrollTop, setScrollTop] = useState(0);
  const viewportHeight = 320;
  const rowHeight = 30;

  useEffect(() => {
    const nodes = Array.from({ length: sampleNodeCount }, (_, i) => ({
      id: i,
      x: Math.random() * 2000,
      y: Math.random() * 2000,
    }));
    const updateVisible = () => {
      const start = Math.floor(scrollTop / rowHeight);
      const end = Math.min(sampleNodeCount, start + Math.ceil(viewportHeight / rowHeight) + 10);
      setVisibleNodes(nodes.slice(start, end));
    };
    updateVisible();
  }, [scrollTop, sampleNodeCount]);

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
            <p>占位：后续接入真实画布渲染与协同。</p>
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
