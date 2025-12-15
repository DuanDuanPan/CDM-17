import { Badge, Button, Card, Input, Select } from '@cdm/ui';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { GraphSnapshot, PositionedNode } from '../workspace/model/types';
import { seedGraphSnapshot } from '../workspace/services/graph-snapshot';
import { demoSnapshot } from './model/demo-snapshot';
import { X6Canvas, type X6CanvasSelected } from './components/x6-canvas';

type ViewKey = 'mindmap' | 'gantt' | 'timeline' | 'board';

function getNodeFieldString(node: PositionedNode | undefined, key: string) {
  const v = node?.fields?.[key];
  return typeof v === 'string' ? v : '';
}

function getNodeFieldNumber(node: PositionedNode | undefined, key: string) {
  const v = node?.fields?.[key];
  return typeof v === 'number' ? v : undefined;
}

function setNodeField(node: PositionedNode, key: string, value: unknown): PositionedNode {
  return { ...node, fields: { ...(node.fields ?? {}), [key]: value }, updatedAt: new Date().toISOString() };
}

export default function X6WorkspacePage() {
  const isReadonly = useMemo(() => new URLSearchParams(window.location.search).get('readonly') === '1', []);
  const [view, setView] = useState<ViewKey>('mindmap');
  const [dataset, setDataset] = useState<'demo' | '1k'>('demo');
  const [gridEnabled, setGridEnabled] = useState(true);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [connectMode, setConnectMode] = useState(false);
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null);
  const [selected, setSelected] = useState<X6CanvasSelected>({ kind: 'none' });

  const [snapshot, setSnapshot] = useState<GraphSnapshot>(() => demoSnapshot());
  const pendingPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const rafRef = useRef<number | null>(null);

  const nodeById = useMemo(() => new Map(snapshot.nodes.map((n) => [n.id, n])), [snapshot.nodes]);
  const selectedNode = selected.kind === 'node' ? nodeById.get(selected.id) : undefined;

  const projectItems = useMemo(
    () => [
      { id: 'p1', title: '航天通信系统', level: 'L3', nodes: 856, members: 23, active: true },
      { id: 'p2', title: '智能制造平台', level: 'L2', nodes: 642, members: 18, active: false },
      { id: 'p3', title: '数据中台建设', level: 'L3', nodes: 1024, members: 31, active: false },
      { id: 'p4', title: '移动应用开发', level: 'L1', nodes: 401, members: 12, active: false },
    ],
    []
  );

  const switchConnectMode = () => {
    if (isReadonly) return;
    setConnectMode((v) => !v);
    setConnectSourceId(null);
  };

  const onConnectPick = (nodeId: string) => {
    if (!connectMode || isReadonly) return;
    if (!connectSourceId) {
      setConnectSourceId(nodeId);
      setSelected({ kind: 'node', id: nodeId });
      return;
    }
    if (connectSourceId === nodeId) return;
    const now = new Date().toISOString();
    const edgeId = `e-${connectSourceId}-${nodeId}-${Date.now()}`;
    setSnapshot((s) => ({
      nodes: s.nodes,
      edges: [
        ...s.edges,
        { id: edgeId, from: connectSourceId, to: nodeId, relation: 'depends-on', dependencyType: 'FS', createdAt: now },
      ],
    }));
    setSelected({ kind: 'edge', id: edgeId });
    setConnectMode(false);
    setConnectSourceId(null);
  };

  const updateSelectedNode = (updater: (prev: PositionedNode) => PositionedNode) => {
    if (!selectedNode || isReadonly) return;
    setSnapshot((s) => ({
      nodes: s.nodes.map((n) => (n.id === selectedNode.id ? updater(n) : n)),
      edges: s.edges,
    }));
  };

  const onNodePositionChange = (nodeId: string, pos: { x: number; y: number }) => {
    if (isReadonly) return;
    pendingPositionsRef.current.set(nodeId, pos);
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      const pending = pendingPositionsRef.current;
      pendingPositionsRef.current = new Map();
      rafRef.current = null;
      const now = new Date().toISOString();
      if (pending.size === 0) return;
      setSnapshot((s) => {
        const needChange = s.nodes.some((n) => pending.has(n.id));
        if (!needChange) return s;
        return {
          nodes: s.nodes.map((n) => {
            const p = pending.get(n.id);
            if (!p) return n;
            return { ...n, x: p.x, y: p.y, updatedAt: now };
          }),
          edges: s.edges,
        };
      });
    });
  };

  // 清理 pending RAF
  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const viewTabs: Array<{ key: ViewKey; label: string }> = [
    { key: 'mindmap', label: '脑图' },
    { key: 'gantt', label: '甘特图' },
    { key: 'timeline', label: '时间轴' },
    { key: 'board', label: '看板' },
  ];

  return (
    <div className="min-h-screen bg-surface-muted text-neutral-900">
      <header className="h-14 bg-surface border-b border-border flex items-center gap-4 px-4">
        <div className="flex items-center gap-3 min-w-60">
          <div className="h-9 w-9 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center text-primary font-semibold">
            CDM
          </div>
          <div className="font-semibold">协同脑图工作区</div>
        </div>

        <div className="flex-1 flex justify-center">
          <div className="rounded-full bg-surface-muted border border-border p-1 flex items-center gap-1">
            {viewTabs.map((t) => (
              <button
                key={t.key}
                type="button"
                className={[
                  'px-4 py-1.5 text-sm rounded-full transition',
                  t.key === view
                    ? 'bg-surface shadow-sm border border-border text-neutral-900'
                    : 'text-neutral-700 hover:bg-surface',
                ].join(' ')}
                onClick={() => setView(t.key)}
                data-testid={`x6-view-${t.key}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge tone={isReadonly ? 'warning' : 'success'}>{isReadonly ? '只读' : '可编辑'}</Badge>
          <button type="button" className="h-9 w-9 rounded-xl border border-border bg-surface hover:bg-surface-muted">
            <span className="sr-only">通知</span>
            <svg
              viewBox="0 0 24 24"
              aria-hidden
              className="h-4 w-4 text-neutral-700 mx-auto"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.5 20a1.5 1.5 0 0 0 3 0" />
              <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
            </svg>
          </button>
          <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-semibold">
            张
          </div>
        </div>
      </header>

      <div className="grid grid-cols-[280px_1fr_360px] gap-4 p-4">
        <Card className="p-0 overflow-hidden" padded={false}>
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="font-semibold">工作区</div>
            <button type="button" className="text-neutral-700 hover:text-neutral-900" aria-label="新增">
              ＋
            </button>
          </div>
          <div className="p-3 flex flex-col gap-2 max-h-[720px] overflow-auto" data-testid="x6-left">
            <div className="text-xs text-neutral-700 px-1">我的项目</div>
            {projectItems.map((p) => (
              <div
                key={p.id}
                className={[
                  'rounded-2xl border p-3 transition cursor-pointer',
                  p.active ? 'border-primary/40 bg-primary/5' : 'border-border bg-surface hover:bg-surface-muted',
                ].join(' ')}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center text-primary">
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 12a3 3 0 0 1 3-3h6a3 3 0 1 1 0 6h-6" />
                      <path d="M15 12a3 3 0 0 1-3 3H6a3 3 0 1 1 0-6h6" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{p.title}</div>
                    <div className="text-xs text-neutral-700 flex gap-3">
                      <span>节点 {p.nodes}</span>
                      <span>成员 {p.members}</span>
                    </div>
                  </div>
                  <Badge tone="neutral">{p.level}</Badge>
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 border-t border-border">
            <Button className="w-full" variant="secondary">
              绩效看板
            </Button>
          </div>
        </Card>

        <Card className="p-0 overflow-hidden" padded={false}>
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <div className="font-semibold">画布</div>
            <div className="ml-auto flex items-center gap-2">
              <Button size="sm" variant={gridEnabled ? 'primary' : 'secondary'} onClick={() => setGridEnabled((v) => !v)}>
                网格
              </Button>
              <Button size="sm" variant={snapEnabled ? 'primary' : 'secondary'} onClick={() => setSnapEnabled((v) => !v)}>
                吸附
              </Button>
              <Button size="sm" variant={connectMode ? 'danger' : 'secondary'} onClick={switchConnectMode} disabled={isReadonly}>
                {connectMode ? '取消连线' : '连线'}
              </Button>
              <Select
                value={dataset}
                onChange={(e) => {
                  const next = e.currentTarget.value as 'demo' | '1k';
                  setDataset(next);
                  setSelected({ kind: 'none' });
                  setConnectMode(false);
                  setConnectSourceId(null);
                  setSnapshot(next === '1k' ? seedGraphSnapshot(1000) : demoSnapshot());
                }}
                className="h-9"
                disabled={isReadonly}
                data-testid="x6-dataset"
              >
                <option value="demo">demo</option>
                <option value="1k">1k</option>
              </Select>
            </div>
          </div>

          <div className="h-[720px]">
            {view === 'mindmap' ? (
              <X6Canvas
                dataset={dataset}
                snapshot={snapshot}
                readonly={isReadonly}
                gridEnabled={gridEnabled}
                snapEnabled={snapEnabled}
                connectMode={connectMode}
                connectSourceId={connectSourceId}
                onConnectPick={onConnectPick}
                onNodePositionChange={onNodePositionChange}
                selected={selected}
                onSelectedChange={setSelected}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-neutral-700">
                {view === 'gantt' ? '甘特图（占位）' : view === 'timeline' ? '时间轴（占位）' : '看板（占位）'}
              </div>
            )}
          </div>
        </Card>

        <Card className="p-0 overflow-hidden" padded={false}>
          <div className="px-4 py-3 border-b border-border flex items-center justify-between" data-testid="x6-inspector">
            <div className="font-semibold truncate">{selectedNode?.label ?? '未选择节点'}</div>
            <button type="button" className="text-neutral-700 hover:text-neutral-900" aria-label="更多">
              <svg
                viewBox="0 0 24 24"
                aria-hidden
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5.5h.01" />
                <path d="M12 12h.01" />
                <path d="M12 18.5h.01" />
              </svg>
            </button>
          </div>

          <div className="px-3 py-2 border-b border-border flex gap-2">
            {['属性', '版本', '依赖', 'AI 助手'].map((t) => (
              <button
                key={t}
                type="button"
                className="px-3 py-1.5 rounded-xl border border-border bg-surface hover:bg-surface-muted text-sm text-neutral-700"
              >
                {t}
              </button>
            ))}
          </div>

          <div className="p-4 flex flex-col gap-4 max-h-[720px] overflow-auto">
            <div className="flex flex-col gap-2">
              <div className="text-sm font-semibold text-neutral-700">状态</div>
              <Select
                value={getNodeFieldString(selectedNode, 'status') || 'doing'}
                onChange={(e) => updateSelectedNode((n) => setNodeField(n, 'status', e.currentTarget.value))}
                disabled={isReadonly || !selectedNode}
                data-testid="x6-field-status"
              >
                <option value="todo">未开始</option>
                <option value="doing">进行中</option>
                <option value="done">已完成</option>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <div className="text-sm font-semibold text-neutral-700">密级</div>
              <Select
                value={getNodeFieldString(selectedNode, 'classification') || 'secret'}
                onChange={(e) => updateSelectedNode((n) => setNodeField(n, 'classification', e.currentTarget.value))}
                disabled={isReadonly || !selectedNode}
                data-testid="x6-field-classification"
              >
                <option value="public">L1 - 公开</option>
                <option value="confidential">L2 - 机密</option>
                <option value="secret">L3 - 绝密</option>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <div className="text-sm font-semibold text-neutral-700">负责人</div>
              <Input
                value={getNodeFieldString(selectedNode, 'owner')}
                placeholder="例如：张工"
                onChange={(e) => updateSelectedNode((n) => setNodeField(n, 'owner', e.currentTarget.value))}
                disabled={isReadonly || !selectedNode}
                data-testid="x6-field-owner"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-neutral-700">进度</div>
                <div className="text-xs text-neutral-700">{getNodeFieldNumber(selectedNode, 'progress') ?? 0}%</div>
              </div>
              <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${Math.max(0, Math.min(100, getNodeFieldNumber(selectedNode, 'progress') ?? 0))}%` }}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={isReadonly || !selectedNode}
                  onClick={() =>
                    updateSelectedNode((n) => setNodeField(n, 'progress', Math.min(100, (getNodeFieldNumber(n, 'progress') ?? 0) + 10)))
                  }
                >
                  +10%
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={isReadonly || !selectedNode}
                  onClick={() =>
                    updateSelectedNode((n) => setNodeField(n, 'progress', Math.max(0, (getNodeFieldNumber(n, 'progress') ?? 0) - 10)))
                  }
                >
                  -10%
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="text-sm font-semibold text-neutral-700">标签</div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="success">核心功能</Badge>
                <Badge tone="info">高优先级</Badge>
                <Button size="sm" variant="ghost">
                  + 添加
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="text-sm font-semibold text-neutral-700">描述</div>
              <Input value="" placeholder="添加节点描述…" disabled />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

