import { PluginRegistry } from '@cdm/core-server';
import permission from '@cdm/plugin-permission';
import auditLog from '@cdm/plugin-audit-log';
import notification from '@cdm/plugin-notification';
import exportShare from '@cdm/plugin-export-share';
import templateAi from '@cdm/plugin-template-ai';
import layoutFree from '@cdm/plugin-layout-free';

export const presetDefault = [
  permission,
  auditLog,
  notification,
  exportShare,
  templateAi,
  layoutFree,
];

export const loadPreset = (registry: PluginRegistry) => {
  presetDefault.forEach((plugin) => registry.register(plugin));
  return registry;
};

export default presetDefault;
