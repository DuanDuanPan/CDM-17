const TailwindCard = () => {
  return (
    <div className="min-h-screen bg-surface-muted text-neutral-900 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <div className="mb-6 text-sm text-neutral-700">PoC · Tailwind utilities (preflight disabled)</div>
        <div className="rounded-xl shadow-lg bg-white border border-border p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold shadow-sm">
              张
            </div>
            <div>
              <div className="text-lg font-semibold">航天通信系统 · 节点</div>
              <div className="text-sm text-neutral-700">密级：绝密 · 负责人：张工</div>
            </div>
            <span className="ml-auto text-xs px-3 py-1 rounded-full bg-info/10 text-info border border-info/30">
              进度 60%
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Info pill label="状态" value="进行中" />
            <Info pill label="密级" value="L1 - 公开" />
            <Info pill label="预计完成" value="2024-02-28" />
          </div>

          <div>
            <div className="text-sm font-medium text-neutral-700 mb-2">标签</div>
            <div className="flex flex-wrap gap-2">
              <Tag text="核心功能" />
              <Tag text="高优先级" />
              <Tag text="AI助手" tone="info" />
            </div>
          </div>

          <div className="flex gap-3">
            <button className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium shadow-sm hover:bg-primary/90">
              保存
            </button>
            <button className="px-4 py-2 rounded-lg border border-border text-neutral-700 hover:bg-surface-muted">
              取消
            </button>
          </div>
        </div>
        <div className="mt-4 text-xs text-neutral-700">
          说明：为避免影响现有样式，Tailwind 配置关闭了 preflight，只引入 utilities/base/component 层。
        </div>
      </div>
    </div>
  );
};

const Info = ({ label, value, pill }: { label: string; value: string; pill?: boolean }) => (
  <div className="flex flex-col gap-1">
    <div className="text-xs text-neutral-700">{label}</div>
    <div
      className={
        pill
          ? 'px-2 py-1 rounded-full bg-surface-muted text-neutral-900 border border-border text-xs'
          : 'text-sm font-medium'
      }
    >
      {value}
    </div>
  </div>
);

const Tag = ({ text, tone = 'success' }: { text: string; tone?: 'success' | 'info' | 'warning' | 'danger' }) => {
  const toneMap: Record<typeof tone, string> = {
    success: 'bg-success/10 text-success border-success/30',
    info: 'bg-info/10 text-info border-info/30',
    warning: 'bg-warning/10 text-warning border-warning/30',
    danger: 'bg-danger/10 text-danger border-danger/30',
  };
  return (
    <span className={`text-xs px-3 py-1 rounded-full border ${toneMap[tone]} shadow-sm`}>
      {text}
    </span>
  );
};

export default TailwindCard;
