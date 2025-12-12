import Fastify from 'fastify';
import { createPluginRegistry } from '@cdm/core-server';
import { createLayoutService } from '@cdm/core-server/src/layout';
import { LayoutState } from '@cdm/types';
import { loadPreset } from '@cdm/preset-default';

const app = Fastify({ logger: true });
const registry = loadPreset(createPluginRegistry());
const layoutService = createLayoutService();

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
    return saved;
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
