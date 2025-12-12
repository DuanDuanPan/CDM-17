import { Node, Edge, LayoutState, LayoutMode } from '@cdm/types';
import { RealtimeClient, HttpClient, LayoutApi, TelemetryApi, GraphApi, GraphSnapshot } from '@cdm/sdk';

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
  private telemetry: TelemetryApi;
  private graphApi: GraphApi;
  private graphId: string;
  private channel?: BroadcastChannel;
  private onChange?: (state: LayoutControllerState) => void;
  private onGraphSync?: (snapshot: GraphSnapshot) => void;
  private ws?: WebSocket;
  private wsRole: 'editor' | 'viewer';

  constructor(
    graphId: string,
    apiBase = typeof window !== 'undefined'
      ? (window as any).__CDM_API__ ?? 'http://localhost:4000'
      : 'http://localhost:4000',
    onChange?: (s: LayoutControllerState) => void,
    wsRole: 'editor' | 'viewer' = 'editor',
    onGraphSync?: (snapshot: GraphSnapshot) => void
  ) {
    this.graphId = graphId;
    this.api = new LayoutApi(new HttpClient(apiBase));
    this.telemetry = new TelemetryApi(new HttpClient(apiBase));
    this.graphApi = new GraphApi(new HttpClient(apiBase));
    this.state = { mode: 'free', toggles: defaultToggles, version: 0 };
    this.onChange = onChange;
    this.wsRole = wsRole;
    this.onGraphSync = onGraphSync;
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel(`layout-${graphId}`);
      this.channel.addEventListener('message', (ev) => {
        const incoming = ev.data as LayoutControllerState;
        if (!incoming?.version || incoming.version <= this.state.version) return;
        this.state = { ...incoming, saving: false, error: undefined };
        this.onChange?.(this.state);
      });
    }
    if (typeof WebSocket !== 'undefined') {
      const token =
        typeof window !== 'undefined' ? (window as any).__CDM_WS_TOKEN__ : undefined;
      const wsUrl = `${apiBase.replace('http', 'ws')}/ws?graphId=${graphId}&role=${wsRole}${token ? `&token=${token}` : ''}`;
      this.ws = new WebSocket(wsUrl);
      this.ws.addEventListener('message', (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === 'layout-sync' && msg.state?.version > this.state.version) {
            this.state = { ...this.state, ...msg.state, saving: false, error: undefined };
            this.broadcast();
            this.onChange?.(this.state);
          }
          if (msg.type === 'graph-sync' && msg.snapshot) {
            this.onGraphSync?.(msg.snapshot as GraphSnapshot);
          }
        } catch {
          // ignore malformed
        }
      });
    }
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
      this.broadcast();
      this.onChange?.(this.state);
      return this.state;
    } catch (err) {
      this.state = { ...this.state, error: (err as Error).message };
      return this.state;
    }
  }

  setMode(mode: LayoutMode) {
    this.state = { ...this.state, mode };
    this.broadcast();
    this.onChange?.(this.state);
  }

  async loadGraph(): Promise<GraphSnapshot> {
    return this.graphApi.getGraph(this.graphId);
  }

  async saveGraph(snapshot: GraphSnapshot) {
    return this.graphApi.saveGraph(this.graphId, snapshot);
  }

  sendGraphUpdate(snapshot: GraphSnapshot, actor = 'system') {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'graph-update', snapshot, actor }));
    }
  }

  toggle(flag: keyof LayoutToggles) {
    this.state = {
      ...this.state,
      toggles: { ...this.state.toggles, [flag]: !this.state.toggles[flag] },
    };
    this.broadcast();
    this.onChange?.(this.state);
  }

  async save(updatedBy = 'system') {
    this.state = { ...this.state, saving: true, error: undefined };
    this.broadcast();
    this.onChange?.(this.state);
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
      this.broadcast();
      this.onChange?.(this.state);
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'layout-update', state: saved, actor: updatedBy }));
      }
      this.telemetry.sendMetric({
        name: 'layout.save',
        value: saved.version,
        unit: 'version',
        context: { mode: saved.mode, toggles: saved.payload },
      });
      return this.state;
    } catch (err) {
      this.state = { ...this.state, saving: false, error: (err as Error).message };
      return this.state;
    }
  }

  private broadcast() {
    if (this.channel) {
      this.channel.postMessage({ ...this.state });
    }
  }
}
