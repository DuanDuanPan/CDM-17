import { PluginModule } from '@cdm/types';

const plugin: PluginModule = {
  manifest: {
    name: '@cdm/plugin-layout-free',
    version: '0.0.1',
    displayName: '自由布局插件',
    provides: ['free-layout'],
  },
  async register(ctx) {
    ctx.audit?.({
      id: `audit-layout-${Math.random().toString(16).slice(2)}`,
      actor: 'system',
      action: 'layout-free-plugin-loaded',
      target: 'layout',
      createdAt: new Date().toISOString(),
    });

    ctx.registerRoute?.('/layout/ping', () => ({ ok: true }));
  },
};

export default plugin;
