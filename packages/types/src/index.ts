export type NodeKind = 'idea' | 'task' | 'timeline' | 'board' | 'custom';

export interface Node {
  id: string;
  label: string;
  kind: NodeKind;
  fields?: Record<string, unknown>;
  masked?: boolean;
  x?: number;
  y?: number;
  folded?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Edge {
  from: string;
  to: string;
  id?: string;
  relation?: 'depends-on' | 'blocks' | 'related' | 'parent';
  dependencyType?: 'FS' | 'SS' | 'FF' | 'SF';
  createdAt?: string;
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
  graphId?: string;
  action?: string;
  role?: 'viewer' | 'editor';
  classification?: string;
}

export interface DrillContext {
  graphId: string;
  parentGraphId?: string;
  nodeId: string;
  label?: string;
  payload?: Record<string, unknown>;
}

export type LayoutMode = 'free' | 'tree' | 'logic';

export interface LayoutState {
  graphId: string;
  mode: LayoutMode;
  version: number;
  updatedAt: string;
  updatedBy: string;
  /** arbitrary layout payload: node positions, fold state, toggle flags */
  payload: Record<string, unknown>;
}

export interface PerfMetric {
  id: string;
  name: string;
  value: number;
  unit?: string;
  createdAt: string;
  context?: Record<string, unknown>;
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
