export type NodeKind = 'idea' | 'task' | 'timeline' | 'board' | 'custom';

export interface Node {
  id: string;
  label: string;
  kind: NodeKind;
  fields?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Edge {
  id: string;
  from: string;
  to: string;
  relation: 'depends-on' | 'blocks' | 'related' | 'parent';
  createdAt: string;
}

export interface Version {
  id: string;
  nodeId: string;
  version: string;
  snapshotUri?: string;
  createdAt: string;
  createdBy: string;
}

export type AccessLevel = 'owner' | 'editor' | 'viewer' | 'commenter';

export interface AccessControlEntry {
  subjectId: string;
  level: AccessLevel;
  expiresAt?: string;
  fields?: string[];
}

export interface Task {
  id: string;
  nodeId: string;
  status: 'todo' | 'doing' | 'done';
  assignee?: string;
  due?: string;
  priority?: 'p0' | 'p1' | 'p2';
}

export interface ExportJob {
  id: string;
  nodeId: string;
  format: 'pdf' | 'image' | 'json';
  status: 'queued' | 'running' | 'done' | 'failed';
  createdAt: string;
  finishedAt?: string;
}

export interface ShareLink {
  id: string;
  nodeId: string;
  token: string;
  expiresAt?: string;
  watermark?: boolean;
  allowedActions?: ('view' | 'comment' | 'export')[];
}

export interface AuditEvent {
  id: string;
  actor: string;
  action: string;
  target: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface VisitLog {
  id: string;
  visitor: string;
  nodeId: string;
  happenedAt: string;
  userAgent?: string;
  ip?: string;
}

export interface PluginManifest {
  name: string;
  version: string;
  displayName: string;
  description?: string;
  provides?: string[];
  requires?: string[];
}

export interface PluginContext {
  audit?: (event: AuditEvent) => void;
  registerRoute?: (path: string, handler: () => unknown) => void;
}

export interface PluginModule {
  manifest: PluginManifest;
  register: (ctx: PluginContext) => Promise<void> | void;
}
