/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  interface Window {
    __CDM_API__?: string;
    __CDM_HTTP_TOKEN__?: string;
    __CDM_WS_TOKEN__?: string;
  }
}

export {};

