import React from 'react';
import { Badge, Button, Card } from '@cdm/ui';

const TailwindCard = () => {
  return (
    <div className="min-h-screen bg-surface-muted text-neutral-900 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <div className="mb-6 text-sm text-neutral-700">PoC · Tailwind utilities (preflight disabled)</div>
        <Card padded className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold shadow-sm">
              张
            </div>
            <div>
              <div className="text-lg font-semibold">航天通信系统 · 节点</div>
              <div className="text-sm text-neutral-700">密级：绝密 · 负责人：张工</div>
            </div>
            <Badge tone="info" className="ml-auto">
              进度 60%
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Info pill label="状态" value="进行中" />
            <Info pill label="密级" value="L1 - 公开" />
            <Info pill label="预计完成" value="2024-02-28" />
          </div>

          <div>
            <div className="text-sm font-medium text-neutral-700 mb-2">标签</div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="success">核心功能</Badge>
              <Badge tone="neutral">高优先级</Badge>
              <Badge tone="info">AI助手</Badge>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="primary" size="md">
              保存
            </Button>
            <Button variant="secondary" size="md">
              取消
            </Button>
          </div>
        </Card>
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

export default TailwindCard;
