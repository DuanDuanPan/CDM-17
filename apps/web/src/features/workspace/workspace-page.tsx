import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import type { X6CanvasSelected } from '../workspace-x6/components/x6-canvas';
import { X6Canvas } from '../workspace-x6/components/x6-canvas';
import { demoSnapshot } from '../workspace-x6/model/demo-snapshot';
import { runMaybeAsync } from './utils/run-maybe-async';

export default function WorkspacePage() {
  const isReadonly = useMemo(() => new URLSearchParams(window.location.search).get('readonly') === '1', []);
  const apiBase = useMemo(() => import.meta.env.VITE_API_BASE || window.__CDM_API__ || window.location.origin, []);
  const authToken = useMemo(() => window.__CDM_HTTP_TOKEN__ || window.__CDM_WS_TOKEN__, []);
  const authHeaders = useMemo(() => (authToken ? { 'x-cdm-token': authToken } : {}), [authToken]);
  const canvasFlag = useMemo(() => new URLSearchParams(window.location.search).get('canvas'), []);
  const useX6 = canvasFlag === 'x6';
  const skipRemote = useX6;

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
    skipRemote,
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
    skipRemote,
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

  useEffect(() => {
    if (!skipRemote) return;
    if (graph.graphNodes.length > 0) return;
    graph.setSnapshot(demoSnapshot());
  }, [graph.graphNodes.length, graph.setSnapshot, skipRemote]);

  const x6Snapshot = useMemo(
    () => ({ nodes: graph.graphNodes, edges: graph.graphEdges }),
    [graph.graphEdges, graph.graphNodes, graph.graphVersion]
  );
  const onNodePositionChange = useCallback(
    (nodeId: string, pos: { x: number; y: number }) => {
      if (isReadonly) return;
      const now = new Date().toISOString();
      const nextSnap = {
        nodes: graph.graphNodes.map((n) => (n.id === nodeId ? { ...n, x: pos.x, y: pos.y, updatedAt: now } : n)),
        edges: graph.graphEdges,
      };
      graph.setSnapshot(nextSnap);
      if (skipRemote) return;
      void graph.saveSnapshot(graph.graphId, nextSnap);
    },
    [graph, isReadonly, skipRemote]
  );

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
    // debug: track current selection
    if (typeof window !== 'undefined') (window as any).__selectedId = id;
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

  const x6Selected = useMemo<X6CanvasSelected>(
    () => (selectedId ? { kind: 'node', id: selectedId } : { kind: 'none' }),
    [selectedId]
  );

  const handleX6SelectedChange = useCallback(
    (next: X6CanvasSelected) => {
      if (next.kind === 'node') {
        setSelectedId(next.id);
        return;
      }
      if (next.kind === 'multi') {
        setSelectedId(next.ids[0] ?? null);
        return;
      }
      setSelectedId(null);
    },
    [setSelectedId]
  );

  if (useX6) {
    const gridEnabled = layout.state.toggles.grid;
    const snapEnabled = layout.state.toggles.snap;
    const sidebarProjects = graph.graphNodes.slice(0, 12);

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
        sidebar={
          <div className="h-full overflow-auto bg-surface p-3 space-y-2" data-testid="x6-left">
            <div className="text-xs text-neutral-700 px-1">我的项目</div>
            {sidebarProjects.map((n) => {
              const out = derived.dependencyOutCountById.get(n.id) ?? 0;
              const inc = derived.dependencyInCountById.get(n.id) ?? 0;
              const active = n.id === selectedId;
              return (
                <button
                  key={n.id}
                  type="button"
                  className={[
                    'w-full text-left rounded-2xl border p-3 transition',
                    active ? 'border-primary/40 bg-primary/5 shadow-sm' : 'border-border bg-surface hover:bg-surface-muted',
                  ].join(' ')}
                  onClick={() => handleSelect(n.id)}
                  disabled={isReadonly}
                >
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-sm font-semibold">
                      {n.label.slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{n.label}</div>
                      <div className="text-xs text-neutral-700 flex gap-3">
                        <span>出 {out}</span>
                        <span>入 {inc}</span>
                      </div>
                    </div>
                    <span className="text-xs text-neutral-600">{getNodeClassification(n.id)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        }
        main={
          <div className="h-full relative bg-surface-muted">
            <Suspense fallback={<div className="p-4 text-neutral-700">Loading...</div>}>
              <X6Canvas
                dataset={graph.graphNodes.length >= 900 ? '1k' : 'demo'}
                snapshot={x6Snapshot}
                readonly={isReadonly}
                gridEnabled={gridEnabled}
                snapEnabled={snapEnabled}
                connectMode={false}
                connectSourceId={null}
                onConnectPick={() => {}}
                onNodePositionChange={onNodePositionChange}
                selected={x6Selected}
                onSelectedChange={handleX6SelectedChange}
              />
            </Suspense>
          </div>
        }
        inspector={
          <div className="flex flex-col gap-3 h-full overflow-auto" data-testid="x6-inspector">
            <div className="px-3 pt-3 pb-1 border-b border-border">
              <div className="text-sm text-neutral-600">当前选中</div>
              <div className="font-semibold truncate">{selectedNode?.label ?? '未选择节点'}</div>
            </div>
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
            <Section title="Right panel">Attributes / Versions / Dependencies / AI helper</Section>
            <Section title="Notifications">Inbox & quick links</Section>
          </div>
        }
      />
    );
  }

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
          <Section title="Right panel">Attributes / history / templates / AI suggestions</Section>
          <Section title="Notifications">Notifications & collaboration shortcuts</Section>
        </>
      }
    />
  );
}



