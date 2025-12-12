import { PluginModule } from '@cdm/types';

const plugin: PluginModule = {
  manifest: {
    name: '@cdm/plugin-template-ai',
    version: '0.0.1',
    displayName: '模板/AI 插件',
    provides: ['template', 'ai-skeleton'],
  },
  async register(ctx) {
    ctx.audit?.({
      id: `audit-template-${Math.random().toString(16).slice(2)}`,
      actor: 'system',
      action: 'template-ai-plugin-loaded',
      target: 'template/ai',
      createdAt: new Date().toISOString(),
    });

    ctx.registerRoute?.('/template/ping', () => ({ ok: true }));
  },
};

export default plugin;
