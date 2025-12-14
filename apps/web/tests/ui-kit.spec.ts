import { expect, test } from '@playwright/test';

test('ui kit renders base components', async ({ page }) => {
  await page.goto('/?poc=uikit');

  const card = page.getByTestId('ui-card');
  const btnPrimary = page.getByTestId('ui-btn-primary');
  const btnDisabled = page.getByTestId('ui-btn-disabled');
  const badgeInfo = page.getByTestId('ui-badge-info');
  const input = page.getByTestId('ui-input');
  const select = page.getByTestId('ui-select');

  await expect(card).toBeVisible();
  await expect(btnPrimary).toBeVisible();
  await expect(btnDisabled).toBeDisabled();
  await expect(badgeInfo).toBeVisible();
  await expect(input).toBeVisible();
  await expect(select).toBeVisible();

  // Lightweight visual check for Tailwind-migrated shared components.
  await expect(btnPrimary).toHaveScreenshot('ui-btn-primary.png');
  await expect(badgeInfo).toHaveScreenshot('ui-badge-info.png');
  await expect(input).toHaveScreenshot('ui-input.png');
  await expect(card).toHaveScreenshot('ui-card.png');

  await input.fill('World');
  await expect(input).toHaveValue('World');

  await select.selectOption('beta');
  await expect(select).toHaveValue('beta');
});
