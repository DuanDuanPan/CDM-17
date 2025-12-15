import { expect, test } from '@playwright/test';

test('x6 workspace spike renders and is interactive', async ({ page }) => {
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

  await page.goto('/?poc=x6', { waitUntil: 'domcontentloaded' });

  const left = page.locator('[data-testid="x6-left"]');
  const canvas = page.locator('[data-testid="x6-canvas"]');
  const inspector = page.locator('[data-testid="x6-inspector"]');

  await expect(left).toBeVisible({ timeout: 15_000 });
  await expect(canvas).toBeVisible({ timeout: 15_000 });
  await expect(inspector).toBeVisible({ timeout: 15_000 });

  await expect(page.locator('[data-testid="x6-view-mindmap"]')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('[data-testid="x6-view-gantt"]')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('[data-testid="x6-view-timeline"]')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('[data-testid="x6-view-board"]')).toBeVisible({ timeout: 15_000 });

  // Select a node to populate inspector fields.
  const rootNodeLabel = canvas.getByText('航天通信系统').first();
  await expect(rootNodeLabel).toBeVisible({ timeout: 15_000 });
  await rootNodeLabel.click();
  await expect(inspector).toContainText('航天通信系统');

  // Visual evidence snapshots (spike-level, keep focused to stable regions).
  await expect(left).toHaveScreenshot('x6-left.png');
  await expect(canvas).toHaveScreenshot('x6-canvas-demo.png', { maxDiffPixels: 600 });
  await expect(inspector).toHaveScreenshot('x6-inspector.png');

  expect(errors).toEqual([]);
});
