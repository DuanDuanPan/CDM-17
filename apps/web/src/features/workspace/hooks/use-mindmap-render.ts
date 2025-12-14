import { useEffect, useState } from 'react';
import type { RefObject } from 'react';
import type { PositionedEdge, PositionedNode } from '../model/types';
import type { ViewMode } from '../model/constants';

export type UseMindmapRenderOptions = {
  viewMode: ViewMode;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  nodesRef: RefObject<PositionedNode[]>;
  edgesRef: RefObject<PositionedEdge[]>;
  offset: { x: number; y: number };
  scale: number;
  isReadonly: boolean;
};

export function useMindmapRender({ viewMode, canvasRef, nodesRef, edgesRef, offset, scale, isReadonly }: UseMindmapRenderOptions) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [lastRenderMs, setLastRenderMs] = useState<number>();

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
      const nodes = nodesRef.current;
      const edges = edgesRef.current;
      const visible = nodes.filter(
        (n) => n.x > -offset.x - 50 && n.x < -offset.x + vw + 50 && n.y > -offset.y - 50 && n.y < -offset.y + vh + 50
      );
      const visibleIds = new Set(visible.map((n) => n.id));
      setVisibleCount(visible.length);
      const nodeById = new Map(nodes.map((n) => [n.id, n]));
      ctx.lineWidth = 1;
      edges.forEach((e) => {
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
  }, [canvasRef, edgesRef, isReadonly, nodesRef, offset, scale, viewMode]);

  return { visibleCount, lastRenderMs, setLastRenderMs };
}

