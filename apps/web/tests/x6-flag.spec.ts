import { expect, test } from '@playwright/test';

test('x6 canvas renders via feature flag', async ({ page }) => {
  test.setTimeout(30_000);

  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.stack ?? String(err)));
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (text.startsWith('Warning: Attempted to synchronously unmount a root while React was already rendering.')) return;
    if (text.includes('403 (Forbidden)')) return;
    errors.push(text);
  });

  await page.goto('/?canvas=x6', { waitUntil: 'domcontentloaded' });

  const left = page.locator('[data-testid="x6-left"]');
  const canvas = page.locator('[data-testid="x6-canvas"]');
  const inspector = page.locator('[data-testid="x6-inspector"]');

  await expect(left).toBeVisible({ timeout: 15_000 });
  await expect(canvas).toBeVisible({ timeout: 15_000 });
  await expect(inspector).toBeVisible({ timeout: 15_000 });

  await expect(canvas.getByText('航天通信系统').first()).toBeVisible({ timeout: 15_000 });

  expect(errors).toEqual([]);
});
