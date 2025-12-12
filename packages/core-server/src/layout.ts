import { LayoutState } from '@cdm/types';
import { InMemoryGraphRepository } from '@cdm/database';

export class LayoutService {
  constructor(private repo = new InMemoryGraphRepository()) {}

  getLayout(graphId: string): LayoutState | undefined {
    return this.repo.getLayout(graphId);
  }

  saveLayout(state: LayoutState): LayoutState {
    const next: LayoutState = {
      ...state,
      version: state.version ?? Date.now(),
      updatedAt: state.updatedAt ?? new Date().toISOString(),
    };
    this.repo.saveLayout(next);
    return next;
  }
}

export const createLayoutService = () => new LayoutService();
