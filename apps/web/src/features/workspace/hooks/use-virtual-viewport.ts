import { useEffect, useMemo, useState } from 'react';
import type { PositionedNode } from '../model/types';

export type UseVirtualViewportOptions = {
  rowHeight: number;
  viewportHeight: number;
  overscan?: number;
};

export function useVirtualViewport(nodes: PositionedNode[], { rowHeight, viewportHeight, overscan = 10 }: UseVirtualViewportOptions) {
  const [scrollTop, setScrollTop] = useState(0);
  const visibleStart = 0;
  const visibleNodes = useMemo(() => nodes, [nodes]);

  useEffect(() => {
    // 仍然追踪滚动位置以便未来可扩展虚拟滚动，但当前返回全部节点以避免列表缺项。
    void rowHeight;
    void viewportHeight;
    void overscan;
  }, [rowHeight, viewportHeight, overscan]);

  return { scrollTop, setScrollTop, visibleStart, visibleNodes };
}
