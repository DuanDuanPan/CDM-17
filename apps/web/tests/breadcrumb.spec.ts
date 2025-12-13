import { test, expect } from '@playwright/test';

test('breadcrumb supports multi-level return', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).__CDM_WS_TOKEN__ = 'test-token';
  });

  await page.goto('/');

  await page.getByText('节点 #10').click();
  await expect(page.getByText('当前选中节点：node-10')).toBeVisible();

  await page.getByRole('button', { name: '下钻到选中' }).click();
  await expect(page.getByText('Graph: graph-10')).toBeVisible();

  await page.getByText('节点 #11').click();
  await expect(page.getByText('当前选中节点：node-11')).toBeVisible();

  await page.getByRole('button', { name: '下钻到选中' }).click();
  await expect(page.getByText('Graph: graph-11')).toBeVisible();

  const breadcrumb = page.locator('.breadcrumb');

  // Click intermediate crumb (node-10 label) to return one level up
  await breadcrumb.getByRole('button', { name: '节点 10' }).click();
  await expect(page.getByText('Graph: graph-10')).toBeVisible();
  await expect(page.getByText('当前选中节点：node-11')).toBeVisible();

  // Return to root and keep original context
  await page.getByRole('button', { name: '返回主图' }).click();
  await expect(page.getByText('Graph: demo-graph')).toBeVisible();
  await expect(page.getByText('当前选中节点：node-10')).toBeVisible();
});

