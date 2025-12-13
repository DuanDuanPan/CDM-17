import { test, expect } from '@playwright/test';

const getXY = (text: string) => {
  const match = text.match(/x:([\d.-]+)\s+y:([\d.-]+)/);
  if (!match) throw new Error(`could not parse coords from: ${text}`);
  return { x: Number(match[1]), y: Number(match[2]) };
};

test('undo/redo works across drill contexts', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).__CDM_WS_TOKEN__ = 'test-token';
  });
  await page.goto('/');

  const rootRow = page.getByRole('button', { name: /节点 #12/ });
  await rootRow.click();
  await expect(page.getByText('当前选中节点：node-12')).toBeVisible();

  const rootBefore = getXY(await rootRow.innerText());

  await page.getByRole('button', { name: '下钻到选中' }).click();
  await expect(page.getByText('Graph: graph-12')).toBeVisible();

  const childRow = page.getByRole('button', { name: /节点 #12/ });
  const childBefore = getXY(await childRow.innerText());

  await page.getByRole('button', { name: '移动选中' }).click();
  await expect
    .poll(async () => getXY(await childRow.innerText()).x)
    .toBeCloseTo(childBefore.x + 20, 5);

  await page.getByRole('button', { name: '撤销' }).click();
  await expect.poll(async () => getXY(await childRow.innerText()).x).toBeCloseTo(childBefore.x, 5);

  await page.getByRole('button', { name: '重做' }).click();
  await expect
    .poll(async () => getXY(await childRow.innerText()).x)
    .toBeCloseTo(childBefore.x + 20, 5);

  await page.getByRole('button', { name: '返回上级' }).click();
  await expect(page.getByText('Graph: demo-graph')).toBeVisible();
  await expect(page.getByText('当前选中节点：node-12')).toBeVisible();

  // 子图编辑已写回主图：坐标应变化
  await expect
    .poll(async () => getXY(await rootRow.innerText()).x)
    .toBeCloseTo(rootBefore.x + 20, 5);

  // 撤销应跨上下文回到合并前的主图快照
  await page.getByRole('button', { name: '撤销' }).click();
  await expect.poll(async () => getXY(await rootRow.innerText()).x).toBeCloseTo(rootBefore.x, 5);

  await page.getByRole('button', { name: '重做' }).click();
  await expect
    .poll(async () => getXY(await rootRow.innerText()).x)
    .toBeCloseTo(rootBefore.x + 20, 5);
});
