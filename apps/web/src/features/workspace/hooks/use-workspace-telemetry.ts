import { useCallback, useEffect, useRef, useState } from 'react';
import type { ViewMode } from '../model/constants';

type PendingGraphTiming = {
  kind: 'drill' | 'return';
  startTs: number;
  toGraphId: string;
  context: Record<string, unknown>;
};

type PendingViewSwitch = { from: ViewMode; to: ViewMode; startTs: number };

const percentile = (values: number[], p: number) => {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil(p * sorted.length) - 1;
  const idx = Math.max(0, Math.min(sorted.length - 1, rank));
  return sorted[idx];
};

export type UseWorkspaceTelemetryOptions = {
  apiBase: string;
  authHeaders: Record<string, string>;
  isReadonly: boolean;
  viewMode: ViewMode;
  graphId: string;
  nodeCount: number;
  edgeCount: number;
};

export function useWorkspaceTelemetry({
  apiBase,
  authHeaders,
  isReadonly,
  viewMode,
  graphId,
  nodeCount,
  edgeCount,
}: UseWorkspaceTelemetryOptions) {
  const drillSamplesRef = useRef<number[]>([]);
  const returnSamplesRef = useRef<number[]>([]);
  const [drillP95, setDrillP95] = useState<number>();
  const [returnP95, setReturnP95] = useState<number>();
  const pendingGraphTimingRef = useRef<PendingGraphTiming | null>(null);
  const pendingViewSwitchRef = useRef<PendingViewSwitch | null>(null);

  const logVisit = useCallback(
    (action: string, nodeId: string | undefined, currentGraphId: string, classification: string) => {
      fetch(`${apiBase}/visits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitor: 'web-shell',
          nodeId: nodeId ?? 'na',
          graphId: currentGraphId,
          action,
          role: isReadonly ? 'viewer' : 'editor',
          classification,
          happenedAt: new Date().toISOString(),
        }),
      }).catch(() => undefined);
    },
    [apiBase, isReadonly]
  );

  const postMetric = useCallback(
    (name: string, value: number, context?: Record<string, unknown>) => {
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
    },
    [apiBase]
  );

  const postAudit = useCallback(
    (action: string, target: string, metadata?: Record<string, unknown>) => {
      fetch(`${apiBase}/audit/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          actor: 'web-shell',
          action,
          target,
          createdAt: new Date().toISOString(),
          metadata,
        }),
      }).catch(() => undefined);
    },
    [apiBase, authHeaders]
  );

  const recordTiming = useCallback(
    (kind: 'drill' | 'return', ms: number) => {
      const bucket = kind === 'drill' ? drillSamplesRef.current : returnSamplesRef.current;
      bucket.push(ms);
      if (bucket.length > 200) bucket.shift();
      const p95 = percentile(bucket, 0.95);
      if (kind === 'drill') setDrillP95(p95);
      else setReturnP95(p95);
    },
    [setDrillP95, setReturnP95]
  );

  const startGraphTiming = useCallback((kind: 'drill' | 'return', toGraphId: string, context: Record<string, unknown>) => {
    pendingGraphTimingRef.current = { kind, startTs: performance.now(), toGraphId, context };
  }, []);

  const finalizeGraphTiming = useCallback(
    async (currentGraphId: string, currentNodeCount: number, currentEdgeCount: number) => {
      const pending = pendingGraphTimingRef.current;
      if (!pending || pending.toGraphId !== currentGraphId) return;
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const duration = performance.now() - pending.startTs;
      pendingGraphTimingRef.current = null;
      recordTiming(pending.kind, duration);
      postMetric(`${pending.kind}.duration`, duration, {
        ...pending.context,
        nodeCount: currentNodeCount,
        edgeCount: currentEdgeCount,
      });
    },
    [postMetric, recordTiming]
  );

  const startViewSwitchTiming = useCallback((from: ViewMode, to: ViewMode) => {
    pendingViewSwitchRef.current = { from, to, startTs: performance.now() };
  }, []);

  useEffect(() => {
    const pending = pendingViewSwitchRef.current;
    if (!pending || pending.to !== viewMode) return;
    const raf = requestAnimationFrame(() => {
      pendingViewSwitchRef.current = null;
      const duration = performance.now() - pending.startTs;
      postMetric('view.switch.duration', duration, {
        from: pending.from,
        to: pending.to,
        graphId,
        nodeCount,
        edgeCount,
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [edgeCount, graphId, nodeCount, postMetric, viewMode]);

  return {
    logVisit,
    postMetric,
    postAudit,
    drillP95,
    returnP95,
    drillSamplesCount: drillSamplesRef.current.length,
    returnSamplesCount: returnSamplesRef.current.length,
    startGraphTiming,
    finalizeGraphTiming,
    startViewSwitchTiming,
  };
}

