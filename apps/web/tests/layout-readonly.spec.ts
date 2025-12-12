import { test, expect } from '@playwright/test';

test('readonly mode disables controls and shows watermark', async ({ page }) => {
  await page.goto('/?readonly=1');

  await expect(page.getByText('只读模式')).toBeVisible();
  const canvas = page.locator('canvas.layout-canvas');
  await expect(canvas).toBeVisible();

  const layoutButtons = ['自由', '树', '逻辑'];
  for (const label of layoutButtons) {
    await expect(page.getByRole('button', { name: label })).toBeDisabled();
  }

  const toggles = ['吸附', '网格', '对齐线', '距离线'];
  for (const label of toggles) {
    await expect(page.getByRole('button', { name: label })).toBeDisabled();
  }

  // Watermark overlay exists
  await expect(page.locator('.watermark')).toBeVisible();
});
