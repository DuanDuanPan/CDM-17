export const layoutModes = [
  { key: 'free', label: '自由' },
  { key: 'tree', label: '树' },
  { key: 'logic', label: '逻辑' },
] as const;

export type LayoutMode = (typeof layoutModes)[number]['key'];

export const toggleList = [
  { key: 'snap', label: '吸附' },
  { key: 'grid', label: '网格' },
  { key: 'guide', label: '对齐线' },
  { key: 'distance', label: '距离线' },
] as const;

export type LayoutToggleKey = (typeof toggleList)[number]['key'];

export const viewModes = [
  { key: 'mindmap', label: '脑图' },
  { key: 'gantt', label: '甘特' },
  { key: 'timeline', label: '时间轴' },
  { key: 'board', label: '看板' },
] as const;

export type ViewMode = (typeof viewModes)[number]['key'];

export const dependencyTypes = [
  { key: 'FS', label: 'FS' },
  { key: 'SS', label: 'SS' },
  { key: 'FF', label: 'FF' },
  { key: 'SF', label: 'SF' },
] as const;

export type DependencyType = (typeof dependencyTypes)[number]['key'];

export const isDependencyType = (value: unknown): value is DependencyType =>
  typeof value === 'string' && dependencyTypes.some((t) => t.key === value);

