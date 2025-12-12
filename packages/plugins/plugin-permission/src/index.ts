import { PluginModule } from '@cdm/types';

const plugin: PluginModule = {
  manifest: {
    name: '@cdm/plugin-permission',
    version: '0.0.1',
    displayName: '权限插件',
    provides: ['acl'],
  },
  async register(ctx) {
    ctx.audit?.({
      id: `audit-permission-${Math.random().toString(16).slice(2)}`,
      actor: 'system',
      action: 'permission-plugin-loaded',
      target: 'acl',
      createdAt: new Date().toISOString(),
    });
    ctx.registerRoute?.('/acl/ping', () => ({ ok: true }));
  },
};

export default plugin;
