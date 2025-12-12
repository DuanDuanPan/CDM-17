import { Node, Edge, LayoutState, LayoutMode } from '@cdm/types';
import { RealtimeClient, HttpClient, LayoutApi } from '@cdm/sdk';

export interface ViewState {
  nodes: Node[];
  edges: Edge[];
  layout: 'mindmap' | 'gantt' | 'timeline' | 'board';
}

export class ViewManager {
  private state: ViewState;
  private client: RealtimeClient;

  constructor(initial: Partial<ViewState> = {}, client = new RealtimeClient()) {
    this.state = {
      nodes: initial.nodes ?? [],
      edges: initial.edges ?? [],
      layout: initial.layout ?? 'mindmap',
    };
    this.client = client;
  }

  getState() {
    return this.state;
  }

  setLayout(layout: ViewState['layout']) {
    this.state = { ...this.state, layout };
  }

  attachCollaboration(roomId: string) {
    this.client.connect(roomId);
  }
}

export interface LayoutToggles {
  snap: boolean;
  grid: boolean;
  guide: boolean;
  distance: boolean;
}

export interface LayoutControllerState {
  mode: LayoutMode;
  toggles: LayoutToggles;
  version: number;
  updatedAt?: string;
  saving?: boolean;
  error?: string;
}

const defaultToggles: LayoutToggles = { snap: true, grid: true, guide: true, distance: false };

export class LayoutController {
  private state: LayoutControllerState;
  private api: LayoutApi;
  private graphId: string;

  constructor(graphId: string, apiBase = 'http://localhost:4000') {
    this.graphId = graphId;
    this.api = new LayoutApi(new HttpClient(apiBase));
    this.state = { mode: 'free', toggles: defaultToggles, version: 0 };
  }

  getState() {
    return this.state;
  }

  async load() {
    try {
      const remote = await this.api.getLayout(this.graphId);
      if (!remote || (remote as { message?: string }).message === 'not-found') return this.state;
      this.state = {
        mode: remote.mode,
        toggles: { ...(defaultToggles as LayoutToggles), ...(remote.payload as LayoutToggles) },
        version: remote.version,
        updatedAt: remote.updatedAt,
      };
      return this.state;
    } catch (err) {
      this.state = { ...this.state, error: (err as Error).message };
      return this.state;
    }
  }

  setMode(mode: LayoutMode) {
    this.state = { ...this.state, mode };
  }

  toggle(flag: keyof LayoutToggles) {
    this.state = {
      ...this.state,
      toggles: { ...this.state.toggles, [flag]: !this.state.toggles[flag] },
    };
  }

  async save(updatedBy = 'system') {
    this.state = { ...this.state, saving: true, error: undefined };
    try {
      const saved = await this.api.saveLayout(this.graphId, {
        mode: this.state.mode,
        version: this.state.version + 1,
        updatedAt: new Date().toISOString(),
        updatedBy,
        payload: this.state.toggles,
        graphId: this.graphId,
      } as unknown as Omit<LayoutState, 'graphId'>);
      this.state = {
        mode: saved.mode,
        toggles: { ...(defaultToggles as LayoutToggles), ...(saved.payload as LayoutToggles) },
        version: saved.version,
        updatedAt: saved.updatedAt,
        saving: false,
      };
      return this.state;
    } catch (err) {
      this.state = { ...this.state, saving: false, error: (err as Error).message };
      return this.state;
    }
  }
}
