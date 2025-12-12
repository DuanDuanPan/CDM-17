import { PluginModule } from '@cdm/types';

const plugin: PluginModule = {
  manifest: {
    name: '@cdm/plugin-export-share',
    version: '0.0.1',
    displayName: '导出/分享插件',
    provides: ['export', 'share'],
  },
  async register(ctx) {
    ctx.audit?.({
      id: `audit-export-${Math.random().toString(16).slice(2)}`,
      actor: 'system',
      action: 'export-share-plugin-loaded',
      target: 'export/share',
      createdAt: new Date().toISOString(),
    });

    ctx.registerRoute?.('/export/ping', () => ({ ok: true }));
    ctx.registerRoute?.('/share/ping', () => ({ ok: true }));
  },
};

export default plugin;
