import Fastify from 'fastify';
import { createPluginRegistry } from '@cdm/core-server';
import { loadPreset } from '@cdm/preset-default';

const app = Fastify({ logger: true });
const registry = loadPreset(createPluginRegistry());

app.get('/health', async () => ({
  status: 'ok',
  service: 'cdm-api',
  plugins: registry.list(),
}));

app.register(async (instance) => {
  await registry.initAll();
  instance.log.info('Preset plugins initialized');
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
