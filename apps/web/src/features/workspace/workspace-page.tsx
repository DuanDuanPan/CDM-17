import { useCallback, useMemo, useRef, useState } from 'react';
import './styles/workspace.css';
import { CanvasSection } from './components/canvas-section';
import { DependencyPanel } from './components/dependency-panel';
import { Section } from './components/section';
import { TaskPanel } from './components/task-panel';
import { WorkspaceShell } from './components/workspace-shell';
import { WorkspaceToolbar } from './components/workspace-toolbar';
import { useGraphDerived } from './hooks/use-graph-derived';
import { useMindmapRender } from './hooks/use-mindmap-render';
import { useVirtualViewport } from './hooks/use-virtual-viewport';
import { useWorkspaceDependencies } from './hooks/use-workspace-dependencies';
import { useWorkspaceGraph } from './hooks/use-workspace-graph';
import { useWorkspaceHistory } from './hooks/use-workspace-history';
import { useWorkspaceLayout } from './hooks/use-workspace-layout';
import { useWorkspaceNavigation } from './hooks/use-workspace-navigation';
import { useWorkspaceTasks } from './hooks/use-workspace-tasks';
import { useWorkspaceTelemetry } from './hooks/use-workspace-telemetry';
import type { ViewMode } from './model/constants';
import type { PositionedEdge, PositionedNode } from './model/types';
import { runMaybeAsync } from './utils/run-maybe-async';

export default function WorkspacePage() {
  const isReadonly = useMemo(() => new URLSearchParams(window.location.search).get('readonly') === '1', []);
  const apiBase = useMemo(() => import.meta.env.VITE_API_BASE || window.__CDM_API__ || window.location.origin, []);
  const authToken = useMemo(() => window.__CDM_HTTP_TOKEN__ || window.__CDM_WS_TOKEN__, []);
  const authHeaders = useMemo(() => (authToken ? { 'x-cdm-token': authToken } : {}), [authToken]);

  const [lastSync, setLastSync] = useState<string>();
  const [viewMode, setViewMode] = useState<ViewMode>('mindmap');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const sampleNodeCount = 1000;

  const finalizeGraphTimingRef = useRef<(id: string, nodeCount: number, edgeCount: number) => Promise<void>>(
    async () => undefined
  );

  const handleGraphLoaded = useCallback(
    async ({ graphId, nodes, edges }: { graphId: string; nodes: PositionedNode[]; edges: PositionedEdge[] }) => {
      await finalizeGraphTimingRef.current(graphId, nodes.length, edges.length);
    },
    []
  );

  const graph = useWorkspaceGraph({
    apiBase,
    authHeaders,
    isReadonly,
    sampleNodeCount,
    onGraphLoaded: handleGraphLoaded,
  });

  const getNodeClassification = (nodeId?: string | null, nodes: PositionedNode[] = graph.graphNodes) => {
    if (!nodeId) return 'public';
    const node = nodes.find((n) => n.id === nodeId);
    const classification = node?.fields?.classification;
    return typeof classification === 'string' ? classification : 'public';
  };

  const telemetry = useWorkspaceTelemetry({
    apiBase,
    authHeaders,
    isReadonly,
    viewMode,
    graphId: graph.graphId,
    nodeCount: graph.graphNodes.length,
    edgeCount: graph.graphEdges.length,
  });
  finalizeGraphTimingRef.current = telemetry.finalizeGraphTiming;

  const { visibleStart, visibleNodes, setScrollTop } = useVirtualViewport(graph.graphNodes, {
    rowHeight: 30,
    viewportHeight: 320,
  });

  const mindmap = useMindmapRender({
    viewMode,
    canvasRef,
    nodesRef: graph.nodesRef,
    edgesRef: graph.edgesRef,
    offset,
    scale,
    isReadonly,
  });

  const handleGraphSync = useCallback(
    (snapshot: { nodes?: unknown[]; edges?: unknown[] }) => {
      graph.setSnapshot({
        nodes: (snapshot.nodes ?? []) as PositionedNode[],
        edges: (snapshot.edges ?? []) as PositionedEdge[],
      });
    },
    [graph.setSnapshot]
  );

  const layout = useWorkspaceLayout({
    graphId: graph.graphId,
    apiBase,
    isReadonly,
    onGraphSync: handleGraphSync,
    onSynced: setLastSync,
  });

  const history = useWorkspaceHistory({
    isReadonly,
    graphId: graph.graphId,
    selectedId,
    takeSnapshot: graph.takeSnapshot,
    applySnapshot: graph.applySnapshot,
    getNodeClassification,
    logVisit: telemetry.logVisit,
    postAudit: telemetry.postAudit,
  });

  const nav = useWorkspaceNavigation({
    graphId: graph.graphId,
    setGraphId: graph.setGraphId,
    isReadonly,
    selectedId,
    setSelectedId,
    offset,
    setOffset,
    scale,
    setScale,
    takeSnapshot: graph.takeSnapshot,
    loadSnapshot: graph.loadSnapshot,
    saveSnapshot: graph.saveSnapshot,
    preloadSnapshot: graph.preloadSnapshot,
    pushHistory: history.pushHistory,
    getNodeClassification,
    logVisit: telemetry.logVisit,
    postAudit: telemetry.postAudit,
    startGraphTiming: telemetry.startGraphTiming,
  });

  const deps = useWorkspaceDependencies({
    graphId: graph.graphId,
    isReadonly,
    selectedId,
    takeSnapshot: graph.takeSnapshot,
    applySnapshot: graph.applySnapshot,
    pushHistory: history.pushHistory,
    getNodeClassification,
    setLastSync,
    logVisit: telemetry.logVisit,
    postMetric: telemetry.postMetric,
    postAudit: telemetry.postAudit,
  });

  const tasks = useWorkspaceTasks({
    graphId: graph.graphId,
    isReadonly,
    selectedId,
    historyVersion: history.historyVersion,
    takeSnapshot: graph.takeSnapshot,
    applySnapshot: graph.applySnapshot,
    pushHistory: history.pushHistory,
    getNodeClassification,
    setLastSync,
    logVisit: telemetry.logVisit,
    postMetric: telemetry.postMetric,
    postAudit: telemetry.postAudit,
  });

  const pan = (dx: number, dy: number) => setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
  const zoom = (delta: number) => setScale((s) => Math.max(0.4, Math.min(2, s + delta)));
  const handleSelect = (id: string) => {
    if (isReadonly) return;
    setSelectedId(id);
  };

  const nudgeSelected = async (dx = 20, dy = 20) => {
    if (!selectedId || isReadonly) return;
    const snapshot = graph.takeSnapshot();
    history.pushHistory(graph.graphId, snapshot);
    const selectedClassification = getNodeClassification(selectedId);
    const updated = snapshot.nodes.map((n) =>
      n.id === selectedId ? { ...n, x: n.x + dx, y: n.y + dy, updatedAt: new Date().toISOString() } : n
    );
    await graph.applySnapshot(graph.graphId, { nodes: updated, edges: snapshot.edges });
    telemetry.logVisit('edit', selectedId, graph.graphId, selectedClassification);
    telemetry.postAudit('subgraph-edit', graph.graphId, { nodeId: selectedId, classification: selectedClassification });
  };

  const switchView = (next: ViewMode) => {
    if (next === viewMode) return;
    telemetry.startViewSwitchTiming(viewMode, next);
    setViewMode(next);
    const selectedClassification = getNodeClassification(selectedId);
    telemetry.logVisit('view-switch', selectedId ?? undefined, graph.graphId, selectedClassification);
    telemetry.postAudit('view-switch', graph.graphId, {
      from: viewMode,
      to: next,
      nodeId: selectedId,
      classification: selectedClassification,
    });
  };

  const selectedNode = selectedId ? graph.graphNodes.find((n) => n.id === selectedId) : undefined;
  const derived = useGraphDerived(graph.graphNodes, graph.graphEdges);
  const outgoingDependencies = selectedId ? derived.dependencyByFrom.get(selectedId) ?? [] : [];
  const incomingDependencies = selectedId ? derived.dependencyByTo.get(selectedId) ?? [] : [];
  const selectedBlockInfo = selectedId ? derived.taskBlockedInfoById.get(selectedId) : undefined;

  return (
    <WorkspaceShell
      toolbar={
        <WorkspaceToolbar
          viewMode={viewMode}
          onSwitchView={switchView}
          layoutMode={layout.state.mode}
          onLayoutMode={layout.handleMode}
          toggles={layout.state.toggles}
          onToggle={layout.handleToggle}
          isReadonly={isReadonly}
          hasSelection={selectedId != null}
          onPan={pan}
          onZoom={zoom}
          onDrill={nav.drill}
          onNudgeSelected={() => nudgeSelected()}
          onUndo={history.undo}
          onRedo={history.redo}
          canUndo={history.canUndo}
          canRedo={history.canRedo}
          onGoBack={nav.goBack}
          onGoRoot={nav.goRoot}
          graphId={graph.graphId}
          ctxDepth={nav.ctxDepth}
          rootGraphId={nav.rootGraphId}
          drillStack={nav.drillStack.current}
          onReturnToDepth={nav.returnToDepth}
          stateMeta={layout.state}
          lastSync={lastSync}
        />
      }
      main={
        <CanvasSection
          viewMode={viewMode}
          layoutMode={layout.state.mode}
          toggles={layout.state.toggles}
          isReadonly={isReadonly}
          canvasRef={canvasRef}
          visibleCount={mindmap.visibleCount}
          sampleNodeCount={sampleNodeCount}
          scale={scale}
          offset={offset}
          apiBase={apiBase}
          lastRenderMs={mindmap.lastRenderMs}
          drillP95={telemetry.drillP95}
          returnP95={telemetry.returnP95}
          drillSamplesCount={telemetry.drillSamplesCount}
          returnSamplesCount={telemetry.returnSamplesCount}
          onMeasured={mindmap.setLastRenderMs}
          nodes={graph.graphNodes}
          selectedId={selectedId}
          onSelect={handleSelect}
          dependencyOutCountById={derived.dependencyOutCountById}
          dependencyInCountById={derived.dependencyInCountById}
          taskBlockedInfoById={derived.taskBlockedInfoById}
          getTaskStatus={derived.getTaskStatus}
          getFieldString={derived.getFieldString}
          getFieldNumber={derived.getFieldNumber}
          visibleNodes={visibleNodes}
          visibleStart={visibleStart}
          rowHeight={30}
          onScrollTopChange={setScrollTop}
        />
      }
      inspector={
        <>
          <TaskPanel
            selectedId={selectedId}
            isReadonly={isReadonly}
            taskDraft={tasks.taskDraft}
            taskError={tasks.taskError}
            selectedBlockedReason={selectedBlockInfo?.blocked ? selectedBlockInfo.reasons[0] : undefined}
            onToggleKind={(nextKind) => runMaybeAsync(() => tasks.toggleSelectedTaskKind(nextKind))}
            setTaskDraft={(updater) => tasks.setTaskDraft(updater)}
            onSave={() => runMaybeAsync(() => tasks.saveTaskFields())}
            batchStatus={tasks.batchStatus}
            setBatchStatus={tasks.setBatchStatus}
            onBatchUpdate={() => runMaybeAsync(() => tasks.batchUpdateTaskStatus())}
          />
          <DependencyPanel
            selectedId={selectedId}
            selectedNodeLabel={selectedNode?.label ?? selectedId ?? undefined}
            isReadonly={isReadonly}
            nodes={graph.graphNodes}
            nodeById={derived.nodeById}
            dependencyCandidateId={deps.dependencyCandidateId}
            setDependencyCandidateId={deps.setDependencyCandidateId}
            dependencyCandidateType={deps.dependencyCandidateType}
            setDependencyCandidateType={deps.setDependencyCandidateType}
            onAddDependency={deps.addDependency}
            outgoingDependencies={outgoingDependencies}
            incomingDependencies={incomingDependencies}
            onRemoveDependency={deps.removeDependency}
            onUpsertDependencyType={deps.upsertDependencyType}
            getEdgeDependencyType={derived.getEdgeDependencyType}
          />
          <Section title="右侧面板">属性 / 访问记录 / 模板 / AI 建议</Section>
          <Section title="通知抽屉">通知与审计快捷入口</Section>
        </>
      }
    />
  );
}
