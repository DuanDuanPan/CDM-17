import { useCallback, useEffect, useState } from 'react';
import type { TaskDraft } from '../components/task-panel';
import { parseDate } from '../model/parse-date';
import type { GraphSnapshot, PositionedNode } from '../model/types';

type LogVisitFn = (action: string, nodeId: string | undefined, graphId: string, classification: string) => void;
type PostMetricFn = (name: string, value: number, context?: Record<string, unknown>) => void;
type PostAuditFn = (action: string, target: string, metadata?: Record<string, unknown>) => void;

const isValidTaskStatus = (value: string): value is 'todo' | 'doing' | 'done' =>
  value === 'todo' || value === 'doing' || value === 'done';

export type UseWorkspaceTasksOptions = {
  graphId: string;
  isReadonly: boolean;
  selectedId: string | null;
  historyVersion: number;
  takeSnapshot: () => GraphSnapshot;
  applySnapshot: (graphId: string, snapshot: GraphSnapshot) => Promise<void>;
  pushHistory: (graphId: string, snapshot: GraphSnapshot) => void;
  getNodeClassification: (nodeId?: string | null, nodes?: PositionedNode[]) => string;
  setLastSync: (timeLabel: string) => void;
  logVisit: LogVisitFn;
  postMetric: PostMetricFn;
  postAudit: PostAuditFn;
};

export function useWorkspaceTasks({
  graphId,
  isReadonly,
  selectedId,
  historyVersion,
  takeSnapshot,
  applySnapshot,
  pushHistory,
  getNodeClassification,
  setLastSync,
  logVisit,
  postMetric,
  postAudit,
}: UseWorkspaceTasksOptions) {
  const [taskDraft, setTaskDraft] = useState<TaskDraft | null>(null);
  const [taskError, setTaskError] = useState<string>('');
  const [batchStatus, setBatchStatus] = useState<'todo' | 'doing' | 'done'>('todo');

  useEffect(() => {
    if (!selectedId) {
      setTaskDraft(null);
      setTaskError('');
      return;
    }
    const { nodes } = takeSnapshot();
    const node = nodes.find((n) => n.id === selectedId);
    if (!node) {
      setTaskDraft(null);
      setTaskError('');
      return;
    }
    const kind = node.kind === 'task' ? 'task' : 'idea';
    const start = typeof node.fields?.start === 'string' ? node.fields.start : '';
    const end = typeof node.fields?.end === 'string' ? node.fields.end : '';
    const progress =
      typeof node.fields?.progress === 'number' && Number.isFinite(node.fields.progress) ? String(node.fields.progress) : '';
    const status = isValidTaskStatus(String(node.fields?.status ?? '')) ? (node.fields?.status as any) : 'todo';
    const recurrence = typeof node.fields?.recurrence === 'string' ? node.fields.recurrence : '';
    setTaskDraft({ kind, start, end, progress, status, recurrence });
    setTaskError('');
  }, [graphId, historyVersion, selectedId, takeSnapshot]);

  const toggleSelectedTaskKind = useCallback(
    async (nextKind: 'idea' | 'task') => {
      if (!selectedId || isReadonly) return;
      const startTs = performance.now();
      const { nodes, edges } = takeSnapshot();
      pushHistory(graphId, { nodes, edges });
      const now = new Date().toISOString();
      const nextNodes = nodes.map((n) => {
        if (n.id !== selectedId) return n;
        const fields = { ...(n.fields ?? {}) };
        const classification = fields.classification;
        if (nextKind !== 'task') {
          delete fields.start;
          delete fields.end;
          delete fields.progress;
          delete fields.status;
          delete fields.recurrence;
        } else {
          if (!isValidTaskStatus(String(fields.status ?? ''))) fields.status = 'todo';
          if (typeof fields.progress !== 'number') fields.progress = 0;
          if (typeof fields.start !== 'string') fields.start = '';
          if (typeof fields.end !== 'string') fields.end = '';
          if (typeof fields.recurrence !== 'string') fields.recurrence = '';
        }
        return {
          ...n,
          kind: nextKind,
          fields: classification == null ? fields : { ...fields, classification },
          updatedAt: now,
        };
      });
      await applySnapshot(graphId, { nodes: nextNodes, edges });
      setLastSync(new Date().toLocaleTimeString());

      const duration = performance.now() - startTs;
      const classification = getNodeClassification(selectedId);
      postMetric('task.kind.toggle.duration', duration, { graphId, nodeId: selectedId, nextKind, nodeCount: nextNodes.length });
      logVisit('task-kind-toggle', selectedId, graphId, classification);
      postAudit('task-kind-toggle', graphId, { nodeId: selectedId, nextKind, classification });
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

  const saveTaskFields = useCallback(async () => {
    if (!selectedId || isReadonly || !taskDraft) return;
    setTaskError('');

    const trimmedStart = taskDraft.start.trim();
    const trimmedEnd = taskDraft.end.trim();
    const startTs = performance.now();

    const progressRaw = taskDraft.progress.trim();
    const progressValue = progressRaw === '' ? undefined : Number(progressRaw);
    if (progressRaw !== '' && (!Number.isFinite(progressValue) || progressValue < 0 || progressValue > 100)) {
      setTaskError('progress 必须是 0-100 的数字');
      return;
    }

    if (trimmedStart && parseDate(trimmedStart) == null) {
      setTaskError('start 日期格式无效（支持 YYYY-MM-DD 或 ISO）');
      return;
    }
    if (trimmedEnd && parseDate(trimmedEnd) == null) {
      setTaskError('end 日期格式无效（支持 YYYY-MM-DD 或 ISO）');
      return;
    }

    const { nodes, edges } = takeSnapshot();
    pushHistory(graphId, { nodes, edges });
    const now = new Date().toISOString();
    const nextNodes = nodes.map((n) => {
      if (n.id !== selectedId) return n;
      const fields = { ...(n.fields ?? {}) };
      const classification = fields.classification;
      if (taskDraft.kind !== 'task') {
        delete fields.start;
        delete fields.end;
        delete fields.progress;
        delete fields.status;
        delete fields.recurrence;
        return {
          ...n,
          kind: 'idea',
          fields: classification == null ? fields : { ...fields, classification },
          updatedAt: now,
        };
      }
      fields.start = trimmedStart;
      fields.end = trimmedEnd;
      if (progressValue == null) delete fields.progress;
      else fields.progress = progressValue;
      fields.status = taskDraft.status;
      if (taskDraft.recurrence.trim()) fields.recurrence = taskDraft.recurrence.trim();
      else delete fields.recurrence;
      return {
        ...n,
        kind: 'task',
        fields: classification == null ? fields : { ...fields, classification },
        updatedAt: now,
      };
    });

    await applySnapshot(graphId, { nodes: nextNodes, edges });
    setLastSync(new Date().toLocaleTimeString());

    const duration = performance.now() - startTs;
    const classification = getNodeClassification(selectedId, nextNodes);
    postMetric('task.update.duration', duration, { graphId, nodeId: selectedId, kind: taskDraft.kind });
    logVisit('task-update', selectedId, graphId, classification);
    postAudit('task-update', graphId, { nodeId: selectedId, kind: taskDraft.kind, classification });
  }, [
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
    taskDraft,
  ]);

  const batchUpdateTaskStatus = useCallback(async () => {
    if (isReadonly) return;
    const startTs = performance.now();
    const { nodes, edges } = takeSnapshot();
    pushHistory(graphId, { nodes, edges });
    const now = new Date().toISOString();
    let changed = 0;
    const nextNodes = nodes.map((n) => {
      if (n.kind !== 'task') return n;
      const fields = { ...(n.fields ?? {}) };
      if (fields.status === batchStatus) return n;
      fields.status = batchStatus;
      changed += 1;
      return { ...n, fields, updatedAt: now };
    });
    await applySnapshot(graphId, { nodes: nextNodes, edges });
    setLastSync(new Date().toLocaleTimeString());

    const duration = performance.now() - startTs;
    postMetric('task.batch.status.duration', duration, { graphId, status: batchStatus, changed });
    logVisit('task-batch-status', selectedId ?? undefined, graphId, getNodeClassification(selectedId));
    postAudit('task-batch-status', graphId, { status: batchStatus, changed });
  }, [
    applySnapshot,
    batchStatus,
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

  return {
    taskDraft,
    setTaskDraft,
    taskError,
    batchStatus,
    setBatchStatus,
    toggleSelectedTaskKind,
    saveTaskFields,
    batchUpdateTaskStatus,
  };
}

