import { LayoutState, PerfMetric } from '@cdm/types';
import { Node, Edge } from '@cdm/types';

export interface RequestOptions {
  headers?: Record<string, string>;
  retry?: number;
  signal?: AbortSignal;
}

const getBrowserAuthToken = () => {
  if (typeof window === 'undefined') return undefined;
  const w = window as any;
  return (w.__CDM_HTTP_TOKEN__ as string | undefined) ?? (w.__CDM_WS_TOKEN__ as string | undefined);
};

const withAuthHeaders = (headers: Record<string, string> = {}) => {
  const token = getBrowserAuthToken();
  if (!token) return headers;
  if (headers['x-cdm-token']) return headers;
  return { ...headers, 'x-cdm-token': token };
};

export class HttpClient {
  constructor(private baseUrl: string) {}

  async get<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(path, this.baseUrl).toString();
    const res = await fetch(url, { headers: withAuthHeaders(options.headers), signal: options.signal });
    if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
    return res.json() as Promise<T>;
  }

  async put<T>(path: string, body: unknown, options: RequestOptions = {}): Promise<T> {
    const url = new URL(path, this.baseUrl).toString();
    const res = await fetch(url, {
      method: 'PUT',
      headers: withAuthHeaders({ 'Content-Type': 'application/json', ...(options.headers ?? {}) }),
      body: JSON.stringify(body),
      signal: options.signal,
    });
    if (!res.ok) throw new Error(`PUT ${url} failed: ${res.status}`);
    return res.json() as Promise<T>;
  }

  async post<T>(path: string, body: unknown, options: RequestOptions = {}): Promise<T> {
    const url = new URL(path, this.baseUrl).toString();
    const res = await fetch(url, {
      method: 'POST',
      headers: withAuthHeaders({ 'Content-Type': 'application/json', ...(options.headers ?? {}) }),
      body: JSON.stringify(body),
      signal: options.signal,
    });
    if (!res.ok) throw new Error(`POST ${url} failed: ${res.status}`);
    return res.json() as Promise<T>;
  }
}

export class RealtimeClient {
  private connected = false;

  connect(roomId: string) {
    // Placeholder for WS connector; hook metrics/acl later
    this.connected = true;
    return { roomId, connected: this.connected };
  }
}

export class LayoutApi {
  constructor(private http: HttpClient) {}

  getLayout(graphId: string) {
    return this.http.get<LayoutState>(`/layout/${encodeURIComponent(graphId)}`);
  }

  saveLayout(graphId: string, state: Omit<LayoutState, 'graphId'>) {
    return this.http.put<LayoutState>(`/layout/${encodeURIComponent(graphId)}`, state);
  }
}

export class TelemetryApi {
  constructor(private http: HttpClient) {}

  sendMetric(metric: Omit<PerfMetric, 'id' | 'createdAt'> & { createdAt?: string }) {
    const payload: PerfMetric = {
      id: `metric-${Date.now()}`,
      createdAt: metric.createdAt ?? new Date().toISOString(),
      name: metric.name,
      value: metric.value,
      unit: metric.unit,
      context: metric.context,
    };
    return this.http.post<PerfMetric>('/metrics', payload);
  }
}

export interface GraphSnapshot {
  nodes: Node[];
  edges: Edge[];
}

export class GraphApi {
  constructor(private http: HttpClient) {}

  getGraph(graphId: string) {
    return this.http.get<GraphSnapshot>(`/graph/${encodeURIComponent(graphId)}`);
  }

  saveGraph(graphId: string, snapshot: GraphSnapshot) {
    return this.http.put<{ ok: boolean }>(`/graph/${encodeURIComponent(graphId)}`, snapshot);
  }
}
