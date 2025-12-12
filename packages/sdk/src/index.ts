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
