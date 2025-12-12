import { test, expect, chromium } from '@playwright/test';

// 简易协同：两个上下文，一个 editor 一个 viewer，验证 editor 的布局切换广播到 viewer

test('collaboration: editor broadcast to viewer', async () => {
  const browser = await chromium.launch({ headless: true });
  const editorCtx = await browser.newContext();
  await editorCtx.addInitScript(() => {
    (window as any).__CDM_WS_TOKEN__ = 'test-token';
  });
  const viewerCtx = await browser.newContext();
  const editor = await editorCtx.newPage();
  const viewer = await viewerCtx.newPage();

  await editor.goto('/');
  await viewer.goto('/?readonly=1');

  // 初始模式为自由
  const modeButton = editor.getByRole('button', { name: '树' });
  await modeButton.click();
  await expect(editor.getByText('当前布局：树')).toBeVisible();

  await expect(viewer.getByText('当前布局：树')).toBeVisible({ timeout: 4000 });

  await browser.close();
});

// 权限拒绝：viewer 试图切换布局应无效果

test('viewer cannot change layout', async ({ page }) => {
  await page.goto('/?readonly=1');
  await expect(page.getByRole('button', { name: '树' })).toBeDisabled();
});
