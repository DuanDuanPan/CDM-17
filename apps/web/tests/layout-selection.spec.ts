import { test, expect } from '@playwright/test';

// 验证选中保持 & 只读拒绝选择

test('selection persists after scroll', async ({ page }) => {
  await page.goto('/');
  const firstRow = page.getByText('节点 #0');
  await firstRow.click();
  await expect(page.getByText('当前选中节点：node-0')).toBeVisible();

  // 向下滚动，再回到顶部，选中应保持
  await page.locator('.virtual-list').evaluate((el) => {
    el.scrollTop = 600;
  });
  await page.waitForTimeout(200);
  await page.locator('.virtual-list').evaluate((el) => {
    el.scrollTop = 0;
  });
  await expect(page.getByText('当前选中节点：node-0')).toBeVisible();
});

test('readonly cannot change selection', async ({ page }) => {
  await page.goto('/?readonly=1');
  await expect(page.getByText('当前选中节点：无')).toBeVisible();
  const firstRow = page.getByText('节点 #0');
  await firstRow.click();
  await expect(page.getByText('当前选中节点：无')).toBeVisible();
});
