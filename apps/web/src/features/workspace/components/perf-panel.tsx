import { Button } from '@cdm/ui';

export type PerfPanelProps = {
  apiBase: string;
  nodeCount: number;
  layoutMode: string;
  lastRenderMs?: number;
  drillP95?: number;
  returnP95?: number;
  drillSamplesCount: number;
  returnSamplesCount: number;
  onMeasured: (ms: number) => void;
};

export function PerfPanel({
  apiBase,
  nodeCount,
  layoutMode,
  lastRenderMs,
  drillP95,
  returnP95,
  drillSamplesCount,
  returnSamplesCount,
  onMeasured,
}: PerfPanelProps) {
  const runBaseline = () => {
    const nodes = Array.from({ length: nodeCount }, (_, i) => ({
      id: i,
      x: Math.random() * 2000,
      y: Math.random() * 2000,
    }));

    const start = performance.now();
    // 简易视口裁剪：只保留前 200 个示例用于渲染
    nodes.slice(0, 200).map((n) => n.x + n.y);
    const end = performance.now();

    onMeasured(end - start);
    fetch(`${apiBase}/metrics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: `metric-${Date.now()}`,
        name: 'render.baseline',
        value: end - start,
        unit: 'ms',
        createdAt: new Date().toISOString(),
        context: { nodeCount, mode: layoutMode },
      }),
    }).catch((e) => console.warn('metric post failed', e));
  };

  return (
    <div className="perf-panel">
      <div className="perf-title">性能快照</div>
      <div className="perf-row">
        <span>节点数</span>
        <span>{nodeCount}</span>
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
          {drillSamplesCount}/{returnSamplesCount}
        </span>
      </div>
      <Button size="sm" variant="secondary" onClick={runBaseline}>
        运行 1k 节点渲染基线
      </Button>
    </div>
  );
}

