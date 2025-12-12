import Fastify from 'fastify';
import { createPluginRegistry } from '@cdm/core-server';
import { createLayoutService } from '@cdm/core-server/src/layout';
import { LayoutState, AuditEvent, PerfMetric } from '@cdm/types';
import { loadPreset } from '@cdm/preset-default';

const app = Fastify({ logger: true });
const registry = loadPreset(createPluginRegistry());
const layoutService = createLayoutService();
const auditEvents: AuditEvent[] = [];
const metrics: PerfMetric[] = [];

const recordAudit = (evt: AuditEvent) => {
  const enriched = { ...evt, id: evt.id ?? `audit-${auditEvents.length + 1}` };
  auditEvents.push(enriched);
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

  instance.post<{ Body: PerfMetric }>('/metrics', async (req) => {
    const metric = req.body;
    metrics.push(metric);
    return metric;
  });

  instance.get('/metrics', async () => metrics);
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
