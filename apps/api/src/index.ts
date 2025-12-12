import Fastify from 'fastify';
import { createPluginRegistry } from '@cdm/core-server';
import { createLayoutService } from '@cdm/core-server';
import { LayoutState, AuditEvent, PerfMetric, VisitLog } from '@cdm/types';
import { InMemoryGraphRepository } from '@cdm/database';
import { WebSocketServer, WebSocket } from 'ws';
import fs from 'fs';
import path from 'path';
import { loadPreset } from '@cdm/preset-default';

const app = Fastify({ logger: true });
const registry = loadPreset(createPluginRegistry());
const repo = new InMemoryGraphRepository();
const layoutService = createLayoutService(repo);
const auditEvents: AuditEvent[] = [];
const metrics: PerfMetric[] = [];
const visitLogs: VisitLog[] = [];
const wsClients = new Map<string, Set<WebSocket>>(); // graphId -> clients
const dataDir = path.join(process.cwd(), 'data');
const auditFile = path.join(dataDir, 'audit-log.jsonl');
const visitFile = path.join(dataDir, 'visit-log.jsonl');
const metricFile = path.join(dataDir, 'metrics-log.jsonl');

fs.mkdirSync(dataDir, { recursive: true });

const appendJsonl = (filepath: string, obj: unknown) => {
  fs.appendFileSync(filepath, JSON.stringify(obj) + '\n', 'utf8');
};

const recordAudit = (evt: AuditEvent) => {
  const enriched = { ...evt, id: evt.id ?? `audit-${auditEvents.length + 1}` };
  auditEvents.push(enriched);
  appendJsonl(auditFile, enriched);
  app.log.info({ audit: enriched }, 'audit recorded');
};

app.get('/health', async () => ({
  status: 'ok',
  service: 'cdm-api',
  plugins: registry.list(),
}));

app.register(async (instance) => {
  await registry.initAll();
  instance.log.info('Preset plugins initialized');

  instance.get<{
    Params: { graphId: string };
  }>('/layout/:graphId', async (req) => {
    const state = layoutService.getLayout(req.params.graphId);
    recordAudit({
      actor: 'system',
      action: 'layout-read',
      target: req.params.graphId,
      createdAt: new Date().toISOString(),
    } as AuditEvent);
    return state ?? { graphId: req.params.graphId, message: 'not-found' };
  });

  instance.put<{
    Params: { graphId: string };
    Body: Omit<LayoutState, 'graphId'>;
  }>('/layout/:graphId', async (req) => {
    const saved = layoutService.saveLayout({
      ...req.body,
      graphId: req.params.graphId,
      updatedAt: new Date().toISOString(),
    });
    recordAudit({
      id: `audit-${auditEvents.length + 1}`,
      actor: 'system',
      action: 'layout-write',
      target: req.params.graphId,
      createdAt: new Date().toISOString(),
      metadata: { mode: saved.mode, version: saved.version },
    });
    return saved;
  });

  instance.get('/audit/events', async () => auditEvents);
  instance.post<{ Body: VisitLog }>('/visits', async (req) => {
    const log = { ...req.body, id: req.body.id ?? `visit-${visitLogs.length + 1}` };
    visitLogs.push(log);
    repo.logVisit(log);
    appendJsonl(visitFile, log);
    return log;
  });

  instance.get('/visits', async () => visitLogs);

  instance.post<{ Body: PerfMetric }>('/metrics', async (req) => {
    const metric = req.body;
    metrics.push(metric);
    appendJsonl(metricFile, metric);
    return metric;
  });

  instance.get('/metrics', async () => metrics);

  instance.get('/graph/:graphId', async (req) => {
    const data = repo.getGraph((req.params as { graphId: string }).graphId) ?? { nodes: [], edges: [] };
    return data;
  });

  instance.put<{ Params: { graphId: string }; Body: { nodes: unknown[]; edges: unknown[] } }>('/graph/:graphId', async (req) => {
    repo.saveGraph(req.params.graphId, req.body.nodes as any[], req.body.edges as any[]);
    recordAudit({
      id: `audit-${auditEvents.length + 1}`,
      actor: 'system',
      action: 'graph-write',
      target: req.params.graphId,
      createdAt: new Date().toISOString(),
    });
    return { ok: true };
  });
});

// WebSocket协同：ws://host:4000?graphId=demo-graph&role=editor
const wss = new WebSocketServer({ noServer: true });
const editorToken = process.env.WS_EDITOR_TOKEN;

app.server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url ?? '', `http://${request.headers.host}`);
  if (url.pathname !== '/ws') return;
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

wss.on('connection', (ws, request) => {
  const url = new URL(request.url ?? '', `http://${request.headers.host}`);
  const graphId = url.searchParams.get('graphId') ?? 'default';
  const roleParam = url.searchParams.get('role') ?? 'viewer';
  const token = url.searchParams.get('token');
  const role: 'editor' | 'viewer' =
    roleParam === 'editor' && editorToken && token === editorToken ? 'editor' : 'viewer';
  const set = wsClients.get(graphId) ?? new Set<WebSocket>();
  set.add(ws);
  wsClients.set(graphId, set);

  ws.on('close', () => {
    set.delete(ws);
  });

  ws.on('message', (data) => {
    try {
      const parsed = JSON.parse(data.toString()) as { type: string; state?: LayoutState; actor?: string };
      if (parsed.type === 'layout-update' && parsed.state) {
        if (role === 'viewer') {
          ws.send(JSON.stringify({ type: 'error', message: 'readonly client' }));
          return;
        }
        const saved = layoutService.saveLayout(parsed.state);
        recordAudit({
          id: `audit-${auditEvents.length + 1}`,
          actor: parsed.actor ?? 'ws-client',
          action: 'layout-write-ws',
          target: saved.graphId,
          createdAt: new Date().toISOString(),
          metadata: { mode: saved.mode, version: saved.version },
        });
        const peers = wsClients.get(graphId) ?? new Set<WebSocket>();
        peers.forEach((peer) => {
          if (peer !== ws && peer.readyState === WebSocket.OPEN) {
            peer.send(JSON.stringify({ type: 'layout-sync', state: saved }));
          }
        });
      }
    } catch (err) {
      ws.send(JSON.stringify({ type: 'error', message: (err as Error).message }));
    }
  });
});

const start = async () => {
  try {
    await app.listen({ port: 4000, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
