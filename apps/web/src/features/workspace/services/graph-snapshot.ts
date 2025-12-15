import type { GraphSnapshot, PositionedEdge, PositionedNode } from '../model/types';

export function seedGraphSnapshot(count: number): GraphSnapshot {
  const now = new Date().toISOString();
  const baseDate = new Date('2025-01-01T00:00:00Z');
  const nodes: PositionedNode[] = Array.from({ length: count }, (_, i) => ({
    id: `node-${i}`,
    label: `节点 ${i}`,
    kind: i % 5 === 0 ? 'task' : 'idea',
    fields: (() => {
      const classification = i % 9 === 0 ? 'confidential' : 'public';
      if (i % 5 !== 0) return { classification };
      const startDate = new Date(baseDate.getTime() + i * 24 * 60 * 60 * 1000);
      const endDate = new Date(baseDate.getTime() + (i + 1) * 24 * 60 * 60 * 1000);
      const status: 'todo' | 'doing' | 'done' = i % 3 === 0 ? 'todo' : i % 3 === 1 ? 'doing' : 'done';
      return {
        classification,
        start: startDate.toISOString().slice(0, 10),
        end: endDate.toISOString().slice(0, 10),
        progress: Math.min(100, (i * 7) % 101),
        status,
      };
    })(),
    createdAt: now,
    updatedAt: now,
    x: Math.random() * 2000 - 500,
    y: Math.random() * 2000 - 500,
    folded: Math.random() > 0.7,
  }));
  const edges: PositionedEdge[] = Array.from({ length: count - 1 }, (_, i) => ({
    id: `edge-${i}-${i + 1}`,
    from: `node-${i}`,
    to: `node-${i + 1}`,
  }));
  return { nodes, edges };
}

export function buildSubgraphSnapshot(
  nodes: PositionedNode[],
  edges: PositionedEdge[],
  rootId: string,
  maxNodes = 50
): GraphSnapshot {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const visited = new Set<string>();
  const queue: string[] = [];
  const seedId = byId.has(rootId) ? rootId : nodes[0]?.id;
  if (!seedId) return { nodes: [], edges: [] };
  visited.add(seedId);
  queue.push(seedId);

  while (queue.length > 0 && visited.size < maxNodes) {
    const current = queue.shift();
    if (!current) continue;
    edges.forEach((e) => {
      if (visited.size >= maxNodes) return;
      if (e.from === current && !visited.has(e.to)) {
        visited.add(e.to);
        queue.push(e.to);
        return;
      }
      if (e.to === current && !visited.has(e.from)) {
        visited.add(e.from);
        queue.push(e.from);
      }
    });
  }

  const subNodes = nodes.filter((n) => visited.has(n.id));
  const ids = new Set(subNodes.map((n) => n.id));
  const subEdges = edges.filter((e) => ids.has(e.from) && ids.has(e.to));
  return { nodes: subNodes, edges: subEdges };
}
