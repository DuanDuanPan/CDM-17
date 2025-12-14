import { useCallback, useRef, type Dispatch, type SetStateAction } from 'react';
import type { DrillContext } from '@cdm/types';
import type { GraphSnapshot, PositionedNode } from '../model/types';
import { buildSubgraphSnapshot } from '../services/graph-snapshot';

type LogVisitFn = (action: string, nodeId: string | undefined, graphId: string, classification: string) => void;
type PostAuditFn = (action: string, target: string, metadata?: Record<string, unknown>) => void;
type StartGraphTimingFn = (kind: 'drill' | 'return', toGraphId: string, context: Record<string, unknown>) => void;

export type UseWorkspaceNavigationOptions = {
  graphId: string;
  setGraphId: (next: string) => void;
  isReadonly: boolean;

  selectedId: string | null;
  setSelectedId: Dispatch<SetStateAction<string | null>>;
  offset: { x: number; y: number };
  setOffset: Dispatch<SetStateAction<{ x: number; y: number }>>;
  scale: number;
  setScale: Dispatch<SetStateAction<number>>;

  takeSnapshot: () => GraphSnapshot;
  loadSnapshot: (id: string) => Promise<GraphSnapshot>;
  saveSnapshot: (id: string, snapshot: GraphSnapshot) => Promise<void>;
  preloadSnapshot: (id: string, snapshot: GraphSnapshot) => void;
  pushHistory: (graphId: string, snapshot: GraphSnapshot) => void;

  getNodeClassification: (nodeId?: string | null, nodes?: PositionedNode[]) => string;
  logVisit: LogVisitFn;
  postAudit: PostAuditFn;
  startGraphTiming: StartGraphTimingFn;
};

export function useWorkspaceNavigation({
  graphId,
  setGraphId,
  isReadonly,
  selectedId,
  setSelectedId,
  offset,
  setOffset,
  scale,
  setScale,
  takeSnapshot,
  loadSnapshot,
  saveSnapshot,
  preloadSnapshot,
  pushHistory,
  getNodeClassification,
  logVisit,
  postAudit,
  startGraphTiming,
}: UseWorkspaceNavigationOptions) {
  const ctxStack = useRef<
    Array<{
      graphId: string;
      offset: { x: number; y: number };
      scale: number;
      selectedId: string | null;
      selectedClassification: string;
    }>
  >([]);
  const drillStack = useRef<DrillContext[]>([]);

  const ctxDepth = ctxStack.current.length;
  const rootGraphId = ctxStack.current[0]?.graphId ?? graphId;

  const mergeChildIntoParent = useCallback(
    async (childGraphId: string, parentGraphId: string) => {
      const childSnap = await loadSnapshot(childGraphId);
      const parentSnap = await loadSnapshot(parentGraphId);

      if (childSnap.nodes.length === 0) return;
      if (!isReadonly) pushHistory(parentGraphId, { nodes: parentSnap.nodes, edges: parentSnap.edges });

      const now = new Date().toISOString();
      const parentNodes = parentSnap.nodes;
      const parentById = new Map(parentNodes.map((n) => [n.id, n]));
      const childIds = new Set(childSnap.nodes.map((n) => n.id));

      childSnap.nodes.forEach((child) => {
        const parent = parentById.get(child.id);
        parentById.set(child.id, parent ? { ...parent, ...child, updatedAt: now } : { ...child, updatedAt: now });
      });

      const mergedNodes: PositionedNode[] = [];
      const seen = new Set<string>();
      parentNodes.forEach((node) => {
        const merged = parentById.get(node.id) ?? node;
        mergedNodes.push(merged);
        seen.add(node.id);
      });
      childSnap.nodes.forEach((node) => {
        if (seen.has(node.id)) return;
        const merged = parentById.get(node.id) ?? node;
        mergedNodes.push(merged);
        seen.add(node.id);
      });

      const parentEdges = parentSnap.edges;
      const preservedEdges = parentEdges.filter((e) => !(childIds.has(e.from) && childIds.has(e.to)));
      const mergedEdges = [...preservedEdges, ...childSnap.edges];
      const edgeKeys = new Set<string>();
      const dedupedEdges = mergedEdges.filter((e) => {
        const key = `${e.from}->${e.to}:${e.relation ?? 'related'}`;
        if (edgeKeys.has(key)) return false;
        edgeKeys.add(key);
        return true;
      });

      const mergedSnapshot = { nodes: mergedNodes, edges: dedupedEdges };
      await saveSnapshot(parentGraphId, mergedSnapshot);
      preloadSnapshot(parentGraphId, mergedSnapshot);
    },
    [isReadonly, loadSnapshot, preloadSnapshot, pushHistory, saveSnapshot]
  );

  const drill = useCallback(async () => {
    if (!selectedId || isReadonly) return;
    const selectedClassification = getNodeClassification(selectedId);
    ctxStack.current.push({ graphId, offset, scale, selectedId, selectedClassification });
    const nodeKey = selectedId.startsWith('node-') ? selectedId.slice('node-'.length) : selectedId;
    const nextId = `graph-${nodeKey}`;

    const { nodes, edges } = takeSnapshot();
    const subset = buildSubgraphSnapshot(nodes, edges, selectedId, 50);
    try {
      await saveSnapshot(nextId, subset);
    } catch (err) {
      console.warn('drill snapshot save failed', err);
    }
    preloadSnapshot(nextId, subset);

    const selectedNode = nodes.find((n) => n.id === selectedId);
    drillStack.current.push({ graphId: nextId, parentGraphId: graphId, nodeId: selectedId, label: selectedNode?.label });

    startGraphTiming('drill', nextId, { from: graphId, to: nextId, nodeId: selectedId });
    setGraphId(nextId);
    logVisit('drill', selectedId, graphId, selectedClassification);
    postAudit('drill', nextId, { parentGraphId: graphId, nodeId: selectedId, classification: selectedClassification });
  }, [
    getNodeClassification,
    graphId,
    isReadonly,
    logVisit,
    offset,
    postAudit,
    preloadSnapshot,
    saveSnapshot,
    scale,
    selectedId,
    setGraphId,
    startGraphTiming,
    takeSnapshot,
  ]);

  const returnToDepth = useCallback(
    async (targetDepth: number) => {
      const currentDepth = ctxStack.current.length;
      if (currentDepth === 0) return;
      if (targetDepth < 0 || targetDepth >= currentDepth) return;

      const fromGraphId = graphId;
      const fromDepth = currentDepth;
      let currentGraphId = graphId;
      let targetCtx:
        | {
            graphId: string;
            offset: { x: number; y: number };
            scale: number;
            selectedId: string | null;
            selectedClassification: string;
          }
        | undefined;
      let steps = 0;

      while (ctxStack.current.length > targetDepth) {
        const prev = ctxStack.current.pop();
        if (!prev) break;
        await mergeChildIntoParent(currentGraphId, prev.graphId);
        currentGraphId = prev.graphId;
        targetCtx = prev;
        steps += 1;
        drillStack.current.pop();
      }

      if (!targetCtx) return;

      startGraphTiming('return', targetCtx.graphId, { from: fromGraphId, to: targetCtx.graphId, steps, fromDepth });
      setGraphId(targetCtx.graphId);
      setOffset(targetCtx.offset);
      setScale(targetCtx.scale);
      setSelectedId(targetCtx.selectedId);
      logVisit('return', targetCtx.selectedId ?? undefined, targetCtx.graphId, targetCtx.selectedClassification);
      postAudit('return', targetCtx.graphId, {
        from: fromGraphId,
        nodeId: targetCtx.selectedId,
        steps,
        fromDepth,
        classification: targetCtx.selectedClassification,
      });
    },
    [graphId, logVisit, mergeChildIntoParent, postAudit, setGraphId, setOffset, setScale, setSelectedId, startGraphTiming]
  );

  const goBack = useCallback(async () => {
    if (ctxStack.current.length === 0) return;
    await returnToDepth(ctxStack.current.length - 1);
  }, [returnToDepth]);

  const goRoot = useCallback(async () => {
    if (ctxStack.current.length === 0) return;
    await returnToDepth(0);
  }, [returnToDepth]);

  return {
    ctxStack,
    drillStack,
    ctxDepth,
    rootGraphId,
    drill,
    returnToDepth,
    goBack,
    goRoot,
  };
}
