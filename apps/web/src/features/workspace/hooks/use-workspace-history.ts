import { useCallback, useMemo, useRef, useState } from 'react';
import type { GraphHistory, GraphSnapshot, PositionedNode } from '../model/types';

type LogVisitFn = (action: string, nodeId: string | undefined, graphId: string, classification: string) => void;
type PostAuditFn = (action: string, target: string, metadata?: Record<string, unknown>) => void;

const cloneGraphSnapshot = (snapshot: GraphSnapshot): GraphSnapshot => {
  if (typeof structuredClone === 'function') return structuredClone(snapshot) as GraphSnapshot;
  return JSON.parse(JSON.stringify(snapshot)) as GraphSnapshot;
};

export type UseWorkspaceHistoryOptions = {
  isReadonly: boolean;
  graphId: string;
  selectedId: string | null;
  takeSnapshot: () => GraphSnapshot;
  applySnapshot: (graphId: string, snapshot: GraphSnapshot) => Promise<void>;
  getNodeClassification: (nodeId?: string | null, nodes?: PositionedNode[]) => string;
  logVisit: LogVisitFn;
  postAudit: PostAuditFn;
};

export function useWorkspaceHistory({
  isReadonly,
  graphId,
  selectedId,
  takeSnapshot,
  applySnapshot,
  getNodeClassification,
  logVisit,
  postAudit,
}: UseWorkspaceHistoryOptions) {
  const historyRef = useRef<Map<string, GraphHistory>>(new Map());
  const [historyVersion, setHistoryVersion] = useState(0);

  const getGraphHistory = useCallback((id: string): GraphHistory => {
    const existing = historyRef.current.get(id);
    if (existing) return existing;
    const next: GraphHistory = { past: [], future: [] };
    historyRef.current.set(id, next);
    return next;
  }, []);

  const pushHistory = useCallback(
    (id: string, snapshot: GraphSnapshot) => {
      const history = getGraphHistory(id);
      history.past.push(cloneGraphSnapshot(snapshot));
      if (history.past.length > 50) history.past.shift();
      history.future.length = 0;
      setHistoryVersion((v) => v + 1);
    },
    [getGraphHistory]
  );

  const canUndo = useMemo(() => (historyRef.current.get(graphId)?.past.length ?? 0) > 0, [graphId, historyVersion]);
  const canRedo = useMemo(() => (historyRef.current.get(graphId)?.future.length ?? 0) > 0, [graphId, historyVersion]);

  const undo = useCallback(async () => {
    if (isReadonly) return;
    const history = getGraphHistory(graphId);
    const prev = history.past.pop();
    if (!prev) return;
    history.future.push(cloneGraphSnapshot(takeSnapshot()));
    setHistoryVersion((v) => v + 1);
    await applySnapshot(graphId, prev);
    const classification = getNodeClassification(selectedId);
    logVisit('undo', selectedId ?? undefined, graphId, classification);
    postAudit('undo', graphId, { nodeId: selectedId, classification });
  }, [applySnapshot, getGraphHistory, getNodeClassification, graphId, isReadonly, logVisit, postAudit, selectedId, takeSnapshot]);

  const redo = useCallback(async () => {
    if (isReadonly) return;
    const history = getGraphHistory(graphId);
    const next = history.future.pop();
    if (!next) return;
    history.past.push(cloneGraphSnapshot(takeSnapshot()));
    if (history.past.length > 50) history.past.shift();
    setHistoryVersion((v) => v + 1);
    await applySnapshot(graphId, next);
    const classification = getNodeClassification(selectedId);
    logVisit('redo', selectedId ?? undefined, graphId, classification);
    postAudit('redo', graphId, { nodeId: selectedId, classification });
  }, [applySnapshot, getGraphHistory, getNodeClassification, graphId, isReadonly, logVisit, postAudit, selectedId, takeSnapshot]);

  return {
    historyRef,
    historyVersion,
    pushHistory,
    canUndo,
    canRedo,
    undo,
    redo,
  };
}

