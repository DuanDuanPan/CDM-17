import { useCallback, useEffect, useState } from 'react';
import { LayoutController, type LayoutControllerState } from '@cdm/core-client';
import type { GraphSnapshot } from '@cdm/sdk';

export type UseWorkspaceLayoutOptions = {
  graphId: string;
  apiBase: string;
  isReadonly: boolean;
  onGraphSync?: (snapshot: GraphSnapshot) => void;
  onSynced?: (timeLabel: string) => void;
};

export function useWorkspaceLayout({ graphId, apiBase, isReadonly, onGraphSync, onSynced }: UseWorkspaceLayoutOptions) {
  const [controller, setController] = useState<LayoutController | null>(null);
  const [state, setState] = useState<LayoutControllerState>({
    mode: 'free',
    toggles: { snap: true, grid: true, guide: true, distance: false },
    version: 0,
  });

  useEffect(() => {
    const c = new LayoutController(
      graphId,
      apiBase,
      (s) => setState({ ...s }),
      isReadonly ? 'viewer' : 'editor',
      onGraphSync
    );
    setController(c);
    c.load().then(setState);
    return () => c.close();
  }, [apiBase, graphId, isReadonly, onGraphSync]);

  const handleMode = useCallback(
    async (mode: LayoutControllerState['mode']) => {
      if (isReadonly || !controller) return;
      controller.setMode(mode);
      setState({ ...controller.getState(), mode });
      const saved = await controller.save('web-shell');
      setState({ ...saved });
      onSynced?.(new Date().toLocaleTimeString());
    },
    [controller, isReadonly, onSynced]
  );

  const handleToggle = useCallback(
    async (key: keyof LayoutControllerState['toggles']) => {
      if (isReadonly || !controller) return;
      controller.toggle(key);
      setState({ ...controller.getState() });
      const saved = await controller.save('web-shell');
      setState({ ...saved });
      onSynced?.(new Date().toLocaleTimeString());
    },
    [controller, isReadonly, onSynced]
  );

  return { state, handleMode, handleToggle };
}

