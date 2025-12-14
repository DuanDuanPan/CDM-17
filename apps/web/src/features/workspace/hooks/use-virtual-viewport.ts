import { useEffect, useMemo, useState } from 'react';
import type { PositionedNode } from '../model/types';

export type UseVirtualViewportOptions = {
  rowHeight: number;
  viewportHeight: number;
  overscan?: number;
};

export function useVirtualViewport(nodes: PositionedNode[], { rowHeight, viewportHeight, overscan = 10 }: UseVirtualViewportOptions) {
  const [scrollTop, setScrollTop] = useState(0);
  const [visibleStart, setVisibleStart] = useState(0);

  const visibleNodes = useMemo(() => {
    const start = Math.floor(scrollTop / rowHeight);
    const end = Math.min(nodes.length, start + Math.ceil(viewportHeight / rowHeight) + overscan);
    return nodes.slice(start, end);
  }, [nodes, overscan, rowHeight, scrollTop, viewportHeight]);

  useEffect(() => {
    setVisibleStart(Math.floor(scrollTop / rowHeight));
  }, [rowHeight, scrollTop]);

  return { scrollTop, setScrollTop, visibleStart, visibleNodes };
}

