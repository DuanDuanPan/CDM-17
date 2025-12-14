import { useMemo } from 'react';
import TailwindCard from './poc/tailwind-card';
import UiKit from './poc/ui-kit';
import WorkspacePage from './features/workspace/workspace-page';

export default function App() {
  const poc = useMemo(() => new URLSearchParams(window.location.search).get('poc'), []);

  if (poc === 'tailwind') return <TailwindCard />;
  if (poc === 'uikit') return <UiKit />;

  return <WorkspacePage />;
}

