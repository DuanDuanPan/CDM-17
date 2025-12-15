import type { GraphSnapshot, PositionedEdge, PositionedNode } from '../model/types';

type HeadersInit = Record<string, string>;

export async function loadGraphSnapshot(
  apiBase: string,
  authHeaders: HeadersInit,
  id: string,
  skipRemote = false,
  timeoutMs = 2000
): Promise<GraphSnapshot> {
  if (skipRemote) {
    return { nodes: [], edges: [] };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const res = await fetch(`${apiBase}/graph/${encodeURIComponent(id)}`, {
    headers: authHeaders,
    signal: controller.signal,
  }).finally(() => clearTimeout(timer));
  if (!res.ok) throw new Error(`GET /graph/${id} failed: ${res.status}`);
  const raw = (await res.json()) as { nodes?: unknown[]; edges?: unknown[] };
  const now = new Date().toISOString();
  const nodes: PositionedNode[] = (raw.nodes ?? []).map((node, idx) => {
    const n = (node ?? {}) as Partial<PositionedNode>;
    const x = typeof n.x === 'number' && Number.isFinite(n.x) ? n.x : Math.random() * 2000 - 500;
    const y = typeof n.y === 'number' && Number.isFinite(n.y) ? n.y : Math.random() * 2000 - 500;
    return {
      ...n,
      id: typeof n.id === 'string' ? n.id : `node-${idx}`,
      label: typeof n.label === 'string' ? n.label : `节点 ${idx}`,
      kind: (n.kind as PositionedNode['kind']) ?? 'idea',
      createdAt: typeof n.createdAt === 'string' ? n.createdAt : now,
      updatedAt: typeof n.updatedAt === 'string' ? n.updatedAt : now,
      x,
      y,
    };
  });
  const edges: PositionedEdge[] = (raw.edges ?? []).map((edge) => (edge ?? {}) as PositionedEdge);
  return { nodes, edges };
}

export async function saveGraphSnapshot(
  apiBase: string,
  authHeaders: HeadersInit,
  id: string,
  snapshot: GraphSnapshot,
  skipRemote = false,
  timeoutMs = 2000
) {
  if (skipRemote) return;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const res = await fetch(`${apiBase}/graph/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify(snapshot),
    signal: controller.signal,
  }).finally(() => clearTimeout(timer));
  if (!res.ok) throw new Error(`PUT /graph/${id} failed: ${res.status}`);
}
