import { useCallback, useState } from 'react';
import type { DependencyType } from '../model/constants';
import type { GraphSnapshot, PositionedEdge } from '../model/types';

type LogVisitFn = (action: string, nodeId: string | undefined, graphId: string, classification: string) => void;
type PostMetricFn = (name: string, value: number, context?: Record<string, unknown>) => void;
type PostAuditFn = (action: string, target: string, metadata?: Record<string, unknown>) => void;

export type UseWorkspaceDependenciesOptions = {
  graphId: string;
  isReadonly: boolean;
  selectedId: string | null;
  takeSnapshot: () => GraphSnapshot;
  applySnapshot: (graphId: string, snapshot: GraphSnapshot) => Promise<void>;
  pushHistory: (graphId: string, snapshot: GraphSnapshot) => void;
  getNodeClassification: (nodeId?: string | null, nodes?: GraphSnapshot['nodes']) => string;
  setLastSync: (timeLabel: string) => void;
  logVisit: LogVisitFn;
  postMetric: PostMetricFn;
  postAudit: PostAuditFn;
};

export function useWorkspaceDependencies({
  graphId,
  isReadonly,
  selectedId,
  takeSnapshot,
  applySnapshot,
  pushHistory,
  getNodeClassification,
  setLastSync,
  logVisit,
  postMetric,
  postAudit,
}: UseWorkspaceDependenciesOptions) {
  const [dependencyCandidateId, setDependencyCandidateId] = useState<string>('');
  const [dependencyCandidateType, setDependencyCandidateType] = useState<DependencyType>('FS');

  const addDependency = useCallback(async () => {
    if (!selectedId || isReadonly) return;
    const dependsOnId = dependencyCandidateId;
    if (!dependsOnId || dependsOnId === selectedId) return;
    const dependencyType = dependencyCandidateType;

    const { nodes, edges } = takeSnapshot();
    const exists = edges.some((e) => e.relation === 'depends-on' && e.from === selectedId && e.to === dependsOnId);
    if (exists) return;

    const startTs = performance.now();
    pushHistory(graphId, { nodes, edges });
    const now = new Date().toISOString();
    const nextEdges: PositionedEdge[] = [
      ...edges,
      {
        id: `dep-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        from: selectedId,
        to: dependsOnId,
        relation: 'depends-on',
        dependencyType,
        createdAt: now,
      },
    ];
    await applySnapshot(graphId, { nodes, edges: nextEdges });
    setDependencyCandidateId('');
    setLastSync(new Date().toLocaleTimeString());

    const duration = performance.now() - startTs;
    const classification = getNodeClassification(selectedId);
    postMetric('dependency.add.duration', duration, {
      graphId,
      from: selectedId,
      to: dependsOnId,
      dependencyType,
      nodeCount: nodes.length,
      edgeCount: nextEdges.length,
    });
    logVisit('dependency-add', selectedId, graphId, classification);
    postAudit('dependency-add', graphId, {
      from: selectedId,
      to: dependsOnId,
      relation: 'depends-on',
      dependencyType,
      classification,
    });
  }, [
    applySnapshot,
    dependencyCandidateId,
    dependencyCandidateType,
    getNodeClassification,
    graphId,
    isReadonly,
    logVisit,
    postAudit,
    postMetric,
    pushHistory,
    selectedId,
    setLastSync,
    takeSnapshot,
  ]);

  const removeDependency = useCallback(
    async (fromId: string, toId: string) => {
      if (isReadonly) return;
      const startTs = performance.now();
      const { nodes, edges } = takeSnapshot();
      pushHistory(graphId, { nodes, edges });
      const nextEdges = edges.filter((e) => !(e.relation === 'depends-on' && e.from === fromId && e.to === toId));
      await applySnapshot(graphId, { nodes, edges: nextEdges });
      setLastSync(new Date().toLocaleTimeString());

      const duration = performance.now() - startTs;
      const classification = getNodeClassification(selectedId);
      postMetric('dependency.remove.duration', duration, {
        graphId,
        from: fromId,
        to: toId,
        nodeCount: nodes.length,
        edgeCount: nextEdges.length,
      });
      logVisit('dependency-remove', selectedId ?? undefined, graphId, classification);
      postAudit('dependency-remove', graphId, {
        from: fromId,
        to: toId,
        relation: 'depends-on',
        classification,
      });
    },
    [
      applySnapshot,
      getNodeClassification,
      graphId,
      isReadonly,
      logVisit,
      postAudit,
      postMetric,
      pushHistory,
      selectedId,
      setLastSync,
      takeSnapshot,
    ]
  );

  const upsertDependencyType = useCallback(
    async (fromId: string, toId: string, dependencyType: DependencyType) => {
      if (isReadonly) return;
      const startTs = performance.now();
      const { nodes, edges } = takeSnapshot();
      pushHistory(graphId, { nodes, edges });
      const nextEdges = edges.map((e) =>
        e.relation === 'depends-on' && e.from === fromId && e.to === toId ? { ...e, dependencyType } : e
      );
      await applySnapshot(graphId, { nodes, edges: nextEdges });
      setLastSync(new Date().toLocaleTimeString());

      const duration = performance.now() - startTs;
      const classification = getNodeClassification(selectedId);
      postMetric('dependency.type.update.duration', duration, {
        graphId,
        from: fromId,
        to: toId,
        dependencyType,
        edgeCount: nextEdges.length,
      });
      logVisit('dependency-type-update', selectedId ?? undefined, graphId, classification);
      postAudit('dependency-type-update', graphId, { from: fromId, to: toId, dependencyType, classification });
    },
    [
      applySnapshot,
      getNodeClassification,
      graphId,
      isReadonly,
      logVisit,
      postAudit,
      postMetric,
      pushHistory,
      selectedId,
      setLastSync,
      takeSnapshot,
    ]
  );

  return {
    dependencyCandidateId,
    setDependencyCandidateId,
    dependencyCandidateType,
    setDependencyCandidateType,
    addDependency,
    removeDependency,
    upsertDependencyType,
  };
}

