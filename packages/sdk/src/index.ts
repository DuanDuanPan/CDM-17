import { LayoutState } from '@cdm/types';

export interface RequestOptions {
  headers?: Record<string, string>;
  retry?: number;
  signal?: AbortSignal;
}

export class HttpClient {
  constructor(private baseUrl: string) {}

  async get<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(path, this.baseUrl).toString();
    const res = await fetch(url, { headers: options.headers, signal: options.signal });
    if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
    return res.json() as Promise<T>;
  }

  async put<T>(path: string, body: unknown, options: RequestOptions = {}): Promise<T> {
    const url = new URL(path, this.baseUrl).toString();
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
      body: JSON.stringify(body),
      signal: options.signal,
    });
    if (!res.ok) throw new Error(`PUT ${url} failed: ${res.status}`);
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
    return this.http.get<LayoutState>(`/layout/${graphId}`);
  }

  saveLayout(graphId: string, state: Omit<LayoutState, 'graphId'>) {
    return this.http.put<LayoutState>(`/layout/${graphId}`, state);
  }
}
