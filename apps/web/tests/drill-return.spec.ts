import { test, expect } from '@playwright/test';

test('drill-edit-return keeps context', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).__CDM_WS_TOKEN__ = 'test-token';
  });
  await page.goto('/');

  await page.getByText('节点 #10').click();
  await expect(page.getByText('当前选中节点：node-10')).toBeVisible();

  await page.getByRole('button', { name: '下钻到选中' }).click();
  await expect(page.getByText('Graph: graph-10')).toBeVisible();

  // 在子图中移动一个节点
  await page.getByRole('button', { name: '移动选中' }).click();

  await page.getByRole('button', { name: '返回上级' }).click();
  await expect(page.getByText('Graph: demo-graph')).toBeVisible();
  await expect(page.getByText('当前选中节点：node-10')).toBeVisible();
});

test('readonly cannot drill', async ({ page }) => {
  await page.goto('/?readonly=1');
  await expect(page.getByRole('button', { name: '下钻到选中' })).toBeDisabled();
});

