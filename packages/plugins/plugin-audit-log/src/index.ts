import { AuditEvent, PluginModule } from '@cdm/types';

const entries: AuditEvent[] = [];

const plugin: PluginModule = {
  manifest: {
    name: '@cdm/plugin-audit-log',
    version: '0.0.1',
    displayName: '审计日志插件',
    provides: ['audit-log'],
  },
  async register(ctx) {
    ctx.audit?.({
      id: `audit-log-${Math.random().toString(16).slice(2)}`,
      actor: 'system',
      action: 'audit-log-plugin-loaded',
      target: 'audit',
      createdAt: new Date().toISOString(),
    });

    ctx.registerRoute?.('/audit/logs', () => entries);
  },
};

export default plugin;
