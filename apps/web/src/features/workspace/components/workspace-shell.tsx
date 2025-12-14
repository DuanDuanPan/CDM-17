import type { ReactNode } from 'react';

export type WorkspaceShellProps = {
  toolbar: ReactNode;
  sidebar?: ReactNode;
  main: ReactNode;
  inspector: ReactNode;
};

export function WorkspaceShell({ toolbar, sidebar, main, inspector }: WorkspaceShellProps) {
  return (
    <div className="shell">
      <header className="topbar">CDM 工作台 · 框架壳</header>
      {toolbar}
      <div className="layout">
        <aside className="sidebar">{sidebar ?? '左侧导航/资源树'}</aside>
        <main className="canvas">{main}</main>
        <aside className="inspector">{inspector}</aside>
      </div>
    </div>
  );
}

