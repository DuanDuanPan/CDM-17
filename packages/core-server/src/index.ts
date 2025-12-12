import { PluginModule, PluginManifest } from '@cdm/types';

export interface ServerHooks {
  audit: (manifest: PluginManifest, message: string, payload?: Record<string, unknown>) => void;
}

export class PluginRegistry {
  private registry = new Map<string, PluginModule>();
  private hooks: ServerHooks;

  constructor(hooks?: Partial<ServerHooks>) {
    this.hooks = {
      audit: hooks?.audit ?? (() => undefined),
    } as ServerHooks;
  }

  register(plugin: PluginModule) {
    if (this.registry.has(plugin.manifest.name)) {
      throw new Error(`Plugin ${plugin.manifest.name} already registered`);
    }
    this.registry.set(plugin.manifest.name, plugin);
    this.hooks.audit(plugin.manifest, 'registered');
  }

  list(): PluginManifest[] {
    return Array.from(this.registry.values()).map((p) => p.manifest);
  }

  async initAll() {
    for (const plugin of this.registry.values()) {
      await plugin.register({
        audit: (event) => this.hooks.audit(plugin.manifest, 'audit-event', { event }),
        registerRoute: () => undefined,
      });
    }
  }
}

export const createPluginRegistry = (hooks?: Partial<ServerHooks>) => new PluginRegistry(hooks);

export * from './layout';
