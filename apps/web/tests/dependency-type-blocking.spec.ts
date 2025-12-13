import { test, expect } from '@playwright/test';

const token = 'test-token';
const graphId = 'demo-graph';
const apiBase = 'http://127.0.0.1:4000';

const buildSeed = () => {
  const now = new Date().toISOString();
  return {
    nodes: Array.from({ length: 10 }, (_, i) => ({
      id: `node-${i}`,
      label: `节点 ${i}`,
      kind: 'task',
      fields: {
        classification: 'public',
        start: '2025-01-01',
        end: '2025-01-02',
        progress: 0,
        status: i % 3 === 0 ? 'todo' : i % 3 === 1 ? 'doing' : 'done',
      },
      createdAt: now,
      updatedAt: now,
      x: i * 20,
      y: i * 10,
    })),
    edges: [],
  };
};

test('dependency type toggles blocked state', async ({ page, request }) => {
  const originalResp = await request.get(`${apiBase}/graph/${encodeURIComponent(graphId)}`, {
    headers: { 'x-cdm-token': token },
  });
  expect(originalResp.ok()).toBeTruthy();
  const originalSnapshot = (await originalResp.json()) as { nodes?: any[]; edges?: any[] };

  await request.put(`${apiBase}/graph/${encodeURIComponent(graphId)}`, {
    headers: { 'x-cdm-token': token },
    data: buildSeed(),
  });

  try {
    await page.addInitScript(() => {
      (window as any).__CDM_WS_TOKEN__ = 'test-token';
    });
    await page.goto('/');

    // Configure node-0 dates: start=end=2025-01-06
    await page.getByText('节点 #0').click();
    await expect(page.getByText('当前选中节点：node-0')).toBeVisible();
    await page.getByTestId('task-start').fill('2025-01-06');
    await page.getByTestId('task-end').fill('2025-01-06');
    await page.getByRole('button', { name: '保存任务' }).click();

    // Configure node-5 dates: start=2025-01-06, end=2025-01-07
    await page.getByText('节点 #5').click();
    await expect(page.getByText('当前选中节点：node-5')).toBeVisible();
    await page.getByTestId('task-start').fill('2025-01-06');
    await page.getByTestId('task-end').fill('2025-01-07');
    await page.getByRole('button', { name: '保存任务' }).click();

    // Add dependency: node-0 depends on node-5 with FS (should be blocked)
    await page.getByText('节点 #0').click();
    await page.getByTestId('dep-candidate-target').selectOption('node-5');
    await page.getByTestId('dep-candidate-type').selectOption('FS');
    await page.getByRole('button', { name: '添加依赖' }).click();
    await expect(page.getByTestId('task-blocked')).toBeVisible();

    // Switch to SS should unblock (start>=upstream.start)
    await page.getByTestId('dep-type-node-0-node-5').selectOption('SS');
    await expect(page.getByTestId('task-blocked')).toBeHidden();
  } finally {
    await request.put(`${apiBase}/graph/${encodeURIComponent(graphId)}`, {
      headers: { 'x-cdm-token': token },
      data: originalSnapshot,
    });
  }
});

test('batch status updates all task nodes', async ({ page, request }) => {
  const originalResp = await request.get(`${apiBase}/graph/${encodeURIComponent(graphId)}`, {
    headers: { 'x-cdm-token': token },
  });
  expect(originalResp.ok()).toBeTruthy();
  const originalSnapshot = (await originalResp.json()) as { nodes?: any[]; edges?: any[] };

  await request.put(`${apiBase}/graph/${encodeURIComponent(graphId)}`, {
    headers: { 'x-cdm-token': token },
    data: buildSeed(),
  });

  try {
    await page.addInitScript(() => {
      (window as any).__CDM_WS_TOKEN__ = 'test-token';
    });
    await page.goto('/');

    await page.getByText('节点 #0').click();
    await page.getByTestId('task-batch-status').selectOption('done');
    await page.getByRole('button', { name: '批量设置所有任务 status' }).click();

    await page.getByRole('button', { name: '看板' }).click();
    await expect(page.getByText(/Todo\s*\(0\)/)).toBeVisible();
    await expect(page.getByText(/Doing\s*\(0\)/)).toBeVisible();
    await expect(page.getByText(/Done\s*\(10\)/)).toBeVisible();
  } finally {
    await request.put(`${apiBase}/graph/${encodeURIComponent(graphId)}`, {
      headers: { 'x-cdm-token': token },
      data: originalSnapshot,
    });
  }
});

