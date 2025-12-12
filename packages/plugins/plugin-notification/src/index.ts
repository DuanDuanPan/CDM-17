import { PluginModule } from '@cdm/types';

const plugin: PluginModule = {
  manifest: {
    name: '@cdm/plugin-notification',
    version: '0.0.1',
    displayName: '通知插件',
    provides: ['notification'],
  },
  async register(ctx) {
    ctx.audit?.({
      id: `audit-notify-${Math.random().toString(16).slice(2)}`,
      actor: 'system',
      action: 'notification-plugin-loaded',
      target: 'notification',
      createdAt: new Date().toISOString(),
    });

    ctx.registerRoute?.('/notification/ping', () => ({ ok: true }));
  },
};

export default plugin;
