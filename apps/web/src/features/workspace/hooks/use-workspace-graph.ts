import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GraphSnapshot, PositionedEdge, PositionedNode } from '../model/types';
import { loadGraphSnapshot, saveGraphSnapshot } from '../services/graph-api';
import { seedGraphSnapshot } from '../services/graph-snapshot';

export type UseWorkspaceGraphOptions = {
  apiBase: string;
  authHeaders: Record<string, string>;
  isReadonly: boolean;
  sampleNodeCount: number;
  initialGraphId?: string;
  onGraphLoaded?: (args: { graphId: string; nodes: PositionedNode[]; edges: PositionedEdge[] }) => void | Promise<void>;
  skipRemote?: boolean;
};

export function useWorkspaceGraph({
  apiBase,
  authHeaders,
  isReadonly,
  sampleNodeCount,
  initialGraphId = 'demo-graph',
  onGraphLoaded,
  skipRemote = false,
}: UseWorkspaceGraphOptions) {
  const [graphId, setGraphId] = useState(initialGraphId);
  const nodesRef = useRef<PositionedNode[]>([]);
  const edgesRef = useRef<PositionedEdge[]>([]);
  const [graphVersion, setGraphVersion] = useState(0);
  const preloadedGraphRef = useRef<Map<string, GraphSnapshot>>(new Map());

  const graphNodes = useMemo(() => nodesRef.current, [graphVersion]);
  const graphEdges = useMemo(() => edgesRef.current, [graphVersion]);

  const setSnapshot = useCallback((snapshot: GraphSnapshot) => {
    nodesRef.current = snapshot.nodes;
    edgesRef.current = snapshot.edges;
    setGraphVersion((v) => v + 1);
  }, []);

  const preloadSnapshot = useCallback((id: string, snapshot: GraphSnapshot) => {
    preloadedGraphRef.current.set(id, snapshot);
  }, []);

  const takeSnapshot = useCallback((): GraphSnapshot => {
    return { nodes: nodesRef.current, edges: edgesRef.current };
  }, []);

  const applySnapshot = useCallback(
    async (id: string, snapshot: GraphSnapshot) => {
      setSnapshot(snapshot);
      await saveGraphSnapshot(apiBase, authHeaders, id, snapshot, skipRemote);
    },
    [apiBase, authHeaders, setSnapshot, skipRemote]
  );

  const saveSnapshot = useCallback(
    async (id: string, snapshot: GraphSnapshot) => {
      await saveGraphSnapshot(apiBase, authHeaders, id, snapshot, skipRemote);
    },
    [apiBase, authHeaders, skipRemote]
  );

  const loadSnapshot = useCallback(
    async (id: string) => {
      return loadGraphSnapshot(apiBase, authHeaders, id, skipRemote, 5000);
    },
    [apiBase, authHeaders, skipRemote]
  );

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      let snap: GraphSnapshot | undefined = preloadedGraphRef.current.get(graphId);
      if (snap) preloadedGraphRef.current.delete(graphId);
      if (!snap) {
        try {
          snap = await loadGraphSnapshot(apiBase, authHeaders, graphId, skipRemote, 5000);
        } catch (err) {
          console.warn('load graph failed', err);
        }
      }
      if (!snap?.nodes || snap.nodes.length === 0) {
        if (skipRemote) {
          setSnapshot({ nodes: [], edges: [] });
        } else {
          const seeded = seedGraphSnapshot(sampleNodeCount);
          setSnapshot(seeded);
          if (!isReadonly) {
            try {
              await saveGraphSnapshot(apiBase, authHeaders, graphId, seeded, skipRemote);
            } catch (err) {
              console.warn('seed graph save failed', err);
            }
          }
        }
      } else {
        setSnapshot(snap);
      }
      if (cancelled) return;
      const nodes = nodesRef.current;
      const edges = edgesRef.current;
      await onGraphLoaded?.({ graphId, nodes, edges });
    };
    void init();
    return () => {
      cancelled = true;
    };
  }, [apiBase, authHeaders, graphId, isReadonly, onGraphLoaded, sampleNodeCount, setSnapshot, skipRemote]);

  return {
    graphId,
    setGraphId,
    graphNodes,
    graphEdges,
    nodesRef,
    edgesRef,
    graphVersion,
    setSnapshot,
    preloadSnapshot,
    takeSnapshot,
    applySnapshot,
    saveSnapshot,
    loadSnapshot,
  };
}
