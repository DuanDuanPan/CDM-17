import { Button, Input, Select } from '@cdm/ui';
import { Section } from './section';

export type TaskDraft = {
  kind: 'idea' | 'task';
  start: string;
  end: string;
  progress: string;
  status: 'todo' | 'doing' | 'done';
  recurrence: string;
};

export type TaskPanelProps = {
  selectedId: string | null;
  isReadonly: boolean;
  taskDraft: TaskDraft | null;
  taskError: string;
  selectedBlockedReason?: string;

  onToggleKind: (nextKind: 'idea' | 'task') => void;
  setTaskDraft: (updater: (prev: TaskDraft | null) => TaskDraft | null) => void;

  onSave: () => void;

  batchStatus: 'todo' | 'doing' | 'done';
  setBatchStatus: (next: 'todo' | 'doing' | 'done') => void;
  onBatchUpdate: () => void;
};

export function TaskPanel({
  selectedId,
  isReadonly,
  taskDraft,
  taskError,
  selectedBlockedReason,
  onToggleKind,
  setTaskDraft,
  onSave,
  batchStatus,
  setBatchStatus,
  onBatchUpdate,
}: TaskPanelProps) {
  return (
    <Section title="任务">
      {!selectedId ? (
        <div className="muted">请选择一个节点以编辑任务字段。</div>
      ) : (
        <>
          {taskError && <div className="error">{taskError}</div>}
          <div className="dep-add">
            <span className="muted">类型</span>
            <Select
              value={taskDraft?.kind ?? 'idea'}
              onChange={(e) => onToggleKind(e.currentTarget.value as 'idea' | 'task')}
              disabled={isReadonly}
              data-testid="task-kind"
            >
              <option value="idea">idea</option>
              <option value="task">task</option>
            </Select>
            <span className="muted">状态</span>
              <Select
                value={taskDraft?.status ?? 'todo'}
                onChange={(e) =>
                  setTaskDraft((d) =>
                    d
                      ? {
                          ...d,
                          status: e.currentTarget.value as 'todo' | 'doing' | 'done',
                        }
                      : d
                  )
                }
                disabled={isReadonly || taskDraft?.kind !== 'task'}
                data-testid="task-status"
              >
              <option value="todo">todo</option>
              <option value="doing">doing</option>
              <option value="done">done</option>
            </Select>
          </div>

          {taskDraft?.kind === 'task' && selectedBlockedReason && (
            <div className="warning" data-testid="task-blocked">
              blocked：{selectedBlockedReason}
            </div>
          )}

          <div className="dep-block">
            <div className="dep-add">
              <span className="muted">start</span>
              <Input
                value={taskDraft?.start ?? ''}
                placeholder="YYYY-MM-DD 或 ISO"
                onChange={(e) =>
                  setTaskDraft((d) => (d ? { ...d, start: e.currentTarget.value } : d))
                }
                disabled={isReadonly || taskDraft?.kind !== 'task'}
                data-testid="task-start"
              />
            </div>
            <div className="dep-add">
              <span className="muted">end</span>
              <Input
                value={taskDraft?.end ?? ''}
                placeholder="YYYY-MM-DD 或 ISO"
                onChange={(e) => setTaskDraft((d) => (d ? { ...d, end: e.currentTarget.value } : d))}
                disabled={isReadonly || taskDraft?.kind !== 'task'}
                data-testid="task-end"
              />
            </div>
            <div className="dep-add">
              <span className="muted">progress</span>
              <Input
                value={taskDraft?.progress ?? ''}
                placeholder="0-100"
                onChange={(e) =>
                  setTaskDraft((d) => (d ? { ...d, progress: e.currentTarget.value } : d))
                }
                disabled={isReadonly || taskDraft?.kind !== 'task'}
                data-testid="task-progress"
              />
            </div>
            <div className="dep-add">
              <span className="muted">recurrence</span>
              <Input
                value={taskDraft?.recurrence ?? ''}
                placeholder="例如: every-week"
                onChange={(e) =>
                  setTaskDraft((d) => (d ? { ...d, recurrence: e.currentTarget.value } : d))
                }
                disabled={isReadonly || taskDraft?.kind !== 'task'}
                data-testid="task-recurrence"
              />
            </div>
            <div className="dep-add">
              <Button size="sm" variant="secondary" onClick={onSave} disabled={isReadonly || !taskDraft}>
                保存任务
              </Button>
            </div>
          </div>

          <div className="dep-block">
            <div className="dep-subtitle">批量</div>
            <div className="dep-add">
              <Select
                value={batchStatus}
                onChange={(e) => setBatchStatus(e.currentTarget.value as 'todo' | 'doing' | 'done')}
                disabled={isReadonly}
                data-testid="task-batch-status"
              >
                <option value="todo">todo</option>
                <option value="doing">doing</option>
                <option value="done">done</option>
              </Select>
              <Button size="sm" variant="secondary" onClick={onBatchUpdate} disabled={isReadonly}>
                批量设置所有任务 status
              </Button>
            </div>
          </div>

          {isReadonly && <div className="warning">只读模式：无法编辑任务字段。</div>}
        </>
      )}
    </Section>
  );
}
