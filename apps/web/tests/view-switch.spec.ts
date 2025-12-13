import { test, expect } from '@playwright/test';

const parseViewport = (raw: string) => {
  const scaleMatch = raw.match(/缩放\s+([0-9.]+)/);
  const offsetMatch = raw.match(/偏移\s+\(([-0-9.]+),\s*([-0-9.]+)\)/);
  if (!scaleMatch || !offsetMatch) throw new Error(`cannot parse viewport text: ${raw}`);
  return {
    scale: Number(scaleMatch[1]),
    offsetX: Number(offsetMatch[1]),
    offsetY: Number(offsetMatch[2]),
  };
};

test('view switch preserves selection and viewport', async ({ page }) => {
  await page.goto('/');

  await page.getByText('节点 #0').click();
  await expect(page.getByText('当前选中节点：node-0')).toBeVisible();

  const viewportLine = page.getByText(/视口可见节点：/);
  const before = parseViewport((await viewportLine.textContent()) ?? '');

  await page.getByRole('button', { name: '→' }).click();
  await page.getByRole('button', { name: '放大' }).click();

  const after = parseViewport((await viewportLine.textContent()) ?? '');
  expect(after.scale).not.toBe(before.scale);
  expect(after.offsetX).not.toBe(before.offsetX);

  await page.getByRole('button', { name: '甘特' }).click();
  await expect(page.getByText('当前视图：甘特')).toBeVisible();
  await expect(page.getByText('当前选中节点：node-0')).toBeVisible();

  await page.getByRole('button', { name: '脑图' }).click();
  await expect(page.getByText('当前视图：脑图')).toBeVisible();
  const back = parseViewport((await viewportLine.textContent()) ?? '');

  expect(back.scale).toBe(after.scale);
  expect(back.offsetX).toBe(after.offsetX);
  expect(back.offsetY).toBe(after.offsetY);
});

