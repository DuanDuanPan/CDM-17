import { test, expect, chromium, type Browser } from '@playwright/test';

const getDependencyCounts = async (raw: string) => {
  const match = raw.match(/依赖\s+(\d+)\/(\d+)/);
  if (!match) throw new Error(`cannot parse dependency counts: ${raw}`);
  return { out: Number(match[1]), in: Number(match[2]) };
};

test('dependency add/remove broadcasts to viewer', async ({ request }) => {
  const token = 'test-token';
  const graphId = 'demo-graph';
  const apiBase = 'http://127.0.0.1:4000';

  const originalResp = await request.get(`${apiBase}/graph/${encodeURIComponent(graphId)}`, {
    headers: { 'x-cdm-token': token },
  });
  expect(originalResp.ok()).toBeTruthy();
  const originalSnapshot = (await originalResp.json()) as { nodes?: any[]; edges?: any[] };

  const buildSeed = (count = 20) => {
    const now = new Date().toISOString();
    return {
      nodes: Array.from({ length: count }, (_, i) => ({
        id: `node-${i}`,
        label: `节点 ${i}`,
        kind: 'idea',
        fields: { classification: 'public' },
        createdAt: now,
        updatedAt: now,
        x: i * 20,
        y: i * 10,
      })),
      edges: [],
    };
  };

  const activeSnapshot =
    (originalSnapshot.nodes?.length ?? 0) > 1 ? originalSnapshot : (buildSeed() as typeof originalSnapshot);

  if (activeSnapshot !== originalSnapshot) {
    await request.put(`${apiBase}/graph/${encodeURIComponent(graphId)}`, {
      headers: { 'x-cdm-token': token },
      data: activeSnapshot,
    });
  }

  const outgoing = new Set(
    (activeSnapshot.edges ?? [])
      .filter((e) => e && typeof e === 'object' && (e as any).relation === 'depends-on' && (e as any).from === 'node-0')
      .map((e) => (e as any).to)
      .filter((to) => typeof to === 'string')
  );
  const candidate = (activeSnapshot.nodes ?? []).find(
    (n) => n && typeof n === 'object' && typeof (n as any).id === 'string' && (n as any).id !== 'node-0' && !outgoing.has((n as any).id)
  ) as { id: string; label?: string } | undefined;

  if (!candidate) throw new Error('no dependency candidate found');
  const candidateId = candidate.id;
  const candidateLabel = typeof candidate.label === 'string' ? candidate.label : candidateId;

  let browser: Browser | undefined;
  try {
    browser = await chromium.launch({ headless: true });
    const editorCtx = await browser.newContext();
    await editorCtx.addInitScript(() => {
      (window as any).__CDM_WS_TOKEN__ = 'test-token';
    });
    const viewerCtx = await browser.newContext();

    const editor = await editorCtx.newPage();
    const viewer = await viewerCtx.newPage();

    await editor.goto('/');
    await viewer.goto('/?readonly=1');

    await viewer.getByRole('button', { name: '甘特' }).click();
    await expect(viewer.getByText('当前视图：甘特')).toBeVisible();

    const viewerRow0 = viewer.locator('.virtual-row', { hasText: '任务 #0' }).first();
    const baselineText = (await viewerRow0.textContent()) ?? '';
    const baselineCounts = await getDependencyCounts(baselineText);

    await editor.getByText('节点 #0').click();
    await expect(editor.getByText('当前选中节点：node-0')).toBeVisible();

    await editor.getByTestId('dep-candidate-target').selectOption(candidateId);
    await editor.getByRole('button', { name: '添加依赖' }).click();

    await expect(viewerRow0).toContainText(`依赖 ${baselineCounts.out + 1}/${baselineCounts.in}`, { timeout: 4000 });

    const depRow = editor.locator('.dep-row', { hasText: candidateLabel }).first();
    await depRow.getByRole('button', { name: '移除' }).click();

    await expect(viewerRow0).toContainText(`依赖 ${baselineCounts.out}/${baselineCounts.in}`, { timeout: 4000 });
  } finally {
    await browser?.close().catch(() => undefined);
    await request.put(`${apiBase}/graph/${encodeURIComponent(graphId)}`, {
      headers: { 'x-cdm-token': token },
      data: originalSnapshot,
    });
  }
});
