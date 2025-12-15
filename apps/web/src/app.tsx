import { lazy, Suspense, useMemo } from 'react';
import TailwindCard from './poc/tailwind-card';
import UiKit from './poc/ui-kit';
import WorkspacePage from './features/workspace/workspace-page';

const X6WorkspacePage = lazy(() => import('./features/workspace-x6/x6-workspace-page'));

export default function App() {
  const poc = useMemo(() => new URLSearchParams(window.location.search).get('poc'), []);

  if (poc === 'tailwind') return <TailwindCard />;
  if (poc === 'uikit') return <UiKit />;
  if (poc === 'x6')
    return (
      <Suspense fallback={<div className="p-4 text-neutral-700">Loading…</div>}>
        <X6WorkspacePage />
      </Suspense>
    );

  return <WorkspacePage />;
}
