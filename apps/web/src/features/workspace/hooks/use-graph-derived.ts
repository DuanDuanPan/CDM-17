import { useMemo } from 'react';
import { isDependencyType, type DependencyType } from '../model/constants';
import { parseDate } from '../model/parse-date';
import type { PositionedEdge, PositionedNode } from '../model/types';

type TaskBlockedInfo = { blocked: boolean; reasons: string[] };

export function useGraphDerived(graphNodes: PositionedNode[], graphEdges: PositionedEdge[]) {
  const getFieldString = (node: PositionedNode, key: string) => {
    const raw = node.fields?.[key];
    return typeof raw === 'string' ? raw : '';
  };

  const getFieldNumber = (node: PositionedNode, key: string) => {
    const raw = node.fields?.[key];
    return typeof raw === 'number' && Number.isFinite(raw) ? raw : undefined;
  };

  const getTaskStatus = (node: PositionedNode) => {
    const raw = getFieldString(node, 'status');
    if (raw === 'todo' || raw === 'doing' || raw === 'done') return raw;
    return 'todo';
  };

  const getEdgeDependencyType = (edge: PositionedEdge): DependencyType => {
    const raw = (edge as any).dependencyType as unknown;
    if (raw == null) return 'FS';
    return isDependencyType(raw) ? raw : 'FS';
  };

  const derived = useMemo(() => {
    const nodeById = new Map(graphNodes.map((n) => [n.id, n]));
    const dependencyEdges = graphEdges.filter((e) => e.relation === 'depends-on');
    const dependencyOutCountById = new Map<string, number>();
    const dependencyInCountById = new Map<string, number>();
    const dependencyByFrom = new Map<string, PositionedEdge[]>();
    const dependencyByTo = new Map<string, PositionedEdge[]>();
    dependencyEdges.forEach((e) => {
      dependencyOutCountById.set(e.from, (dependencyOutCountById.get(e.from) ?? 0) + 1);
      dependencyInCountById.set(e.to, (dependencyInCountById.get(e.to) ?? 0) + 1);
      const outBucket = dependencyByFrom.get(e.from) ?? [];
      outBucket.push(e);
      dependencyByFrom.set(e.from, outBucket);
      const inBucket = dependencyByTo.get(e.to) ?? [];
      inBucket.push(e);
      dependencyByTo.set(e.to, inBucket);
    });

    const taskBlockedInfoById = new Map<string, TaskBlockedInfo>();
    graphNodes.forEach((n) => {
      if (n.kind !== 'task') return;
      const deps = dependencyByFrom.get(n.id) ?? [];
      if (deps.length === 0) {
        taskBlockedInfoById.set(n.id, { blocked: false, reasons: [] });
        return;
      }

      const reasons: string[] = [];
      const fromStartRaw = getFieldString(n, 'start');
      const fromEndRaw = getFieldString(n, 'end');
      const fromStart = parseDate(fromStartRaw);
      const fromEnd = parseDate(fromEndRaw);

      deps.forEach((edge) => {
        const rawType = (edge as any).dependencyType as unknown;
        if (rawType != null && !isDependencyType(rawType)) {
          reasons.push(`无效依赖类型：${String(rawType)}`);
          return;
        }
        const depType = ((rawType == null ? 'FS' : rawType) as DependencyType) || 'FS';
        const upstream = nodeById.get(edge.to);
        if (!upstream) {
          reasons.push(`${depType}: 上游节点不存在（${edge.to}）`);
          return;
        }

        const upstreamLabel = upstream.label || upstream.id;
        const upStartRaw = getFieldString(upstream, 'start');
        const upEndRaw = getFieldString(upstream, 'end');
        const upStart = parseDate(upStartRaw);
        const upEnd = parseDate(upEndRaw);

        const missing = (name: string) => `缺少或无效字段：${name}`;

        if (depType === 'FS') {
          if (fromStart == null) return reasons.push(`FS: ${missing('from.start')}`);
          if (upEnd == null) return reasons.push(`FS: ${missing(`上游(${upstreamLabel}).end`)}`);
          if (fromStart < upEnd)
            reasons.push(`FS: start(${fromStartRaw || '-'}) < 上游(${upstreamLabel}) end(${upEndRaw || '-'})`);
          return;
        }
        if (depType === 'SS') {
          if (fromStart == null) return reasons.push(`SS: ${missing('from.start')}`);
          if (upStart == null) return reasons.push(`SS: ${missing(`上游(${upstreamLabel}).start`)}`);
          if (fromStart < upStart)
            reasons.push(`SS: start(${fromStartRaw || '-'}) < 上游(${upstreamLabel}) start(${upStartRaw || '-'})`);
          return;
        }
        if (depType === 'FF') {
          if (fromEnd == null) return reasons.push(`FF: ${missing('from.end')}`);
          if (upEnd == null) return reasons.push(`FF: ${missing(`上游(${upstreamLabel}).end`)}`);
          if (fromEnd < upEnd)
            reasons.push(`FF: end(${fromEndRaw || '-'}) < 上游(${upstreamLabel}) end(${upEndRaw || '-'})`);
          return;
        }
        if (depType === 'SF') {
          if (fromEnd == null) return reasons.push(`SF: ${missing('from.end')}`);
          if (upStart == null) return reasons.push(`SF: ${missing(`上游(${upstreamLabel}).start`)}`);
          if (fromEnd < upStart)
            reasons.push(`SF: end(${fromEndRaw || '-'}) < 上游(${upstreamLabel}) start(${upStartRaw || '-'})`);
          return;
        }
      });

      taskBlockedInfoById.set(n.id, { blocked: reasons.length > 0, reasons });
    });

    return {
      nodeById,
      dependencyEdges,
      dependencyOutCountById,
      dependencyInCountById,
      dependencyByFrom,
      dependencyByTo,
      taskBlockedInfoById,
    };
  }, [graphNodes, graphEdges]);

  return {
    ...derived,
    getFieldString,
    getFieldNumber,
    getTaskStatus,
    getEdgeDependencyType,
  };
}

