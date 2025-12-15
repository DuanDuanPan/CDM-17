import { expect, test } from '@playwright/test';

test('x6 perf sample runs for 1k dataset (smoke)', async ({ page }) => {
  test.setTimeout(60_000);

  await page.goto('/?poc=x6');

  await page.getByTestId('x6-dataset').selectOption('1k');

  const hud = page.getByTestId('x6-hud');
  await expect(hud).toContainText('数据集：1k', { timeout: 15_000 });

  await page.getByTestId('x6-perf').click();

  await expect(hud).toContainText('缩放P95≈', { timeout: 60_000 });
  await expect(hud).toContainText('移动P95≈');

  // eslint-disable-next-line no-console
  console.log('x6-perf hud:', await hud.innerText());
});


