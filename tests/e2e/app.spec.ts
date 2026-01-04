import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'https://meeting-dev.aidreams-factory.com';

test.describe('Meeting Visualizer E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    // Wait for full hydration
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test('should display the main page with title', async ({ page }) => {
    await expect(page).toHaveTitle(/Meeting Visualizer/i);
  });

  test('should have text input area', async ({ page }) => {
    const textArea = page.locator('textarea');
    await expect(textArea).toBeVisible();
  });

  test('should have generate button', async ({ page }) => {
    const generateButton = page.locator('button', { hasText: /生成|Generate/i });
    await expect(generateButton).toBeVisible();
  });

  test('should have slide count selector', async ({ page }) => {
    const slideCountSelector = page.locator('select, input[type="number"]').first();
    await expect(slideCountSelector).toBeVisible();
  });

  test('should disable generate button when text is empty', async ({ page }) => {
    const generateButton = page.locator('button', { hasText: /生成|Generate/i });

    // Button should be disabled when textarea is empty
    const isButtonDisabled = await generateButton.isDisabled();
    expect(isButtonDisabled).toBeTruthy();
  });

  test('should accept text input', async ({ page }) => {
    const textArea = page.locator('textarea');
    await textArea.fill('テスト用の議事録テキストです。会議の内容を入力します。');

    await expect(textArea).toHaveValue(/テスト用の議事録テキストです/);
  });

  test('should enable generate button after entering text', async ({ page }) => {
    const textArea = page.locator('textarea#transcript');
    const text = `本日の会議では、以下の議題について議論を行いました。

1. プロジェクトの進捗状況について
2. 技術的な課題
3. 次のステップ

参加者: 田中、佐藤、鈴木
次回会議: 来週月曜日 14:00`;

    // Use the same approach as full-flow.spec.ts which works
    await textArea.fill(text);
    await expect(textArea).toHaveValue(/本日の会議では/);

    // Select slide count to trigger React state update
    const slideSelect = page.locator('select#slideMode');
    await slideSelect.selectOption('2');
    await expect(slideSelect).toHaveValue('2');

    // The generate button should be enabled after selecting options
    const generateButton = page.locator('button[type="submit"]');
    await expect(generateButton).toBeEnabled({ timeout: 10000 });
  });

  test('should be able to click generate button with valid input', async ({ page }) => {
    const textArea = page.locator('textarea#transcript');
    const text = `本日の会議では、以下の議題について議論を行いました。

1. プロジェクトの進捗状況について
2. 技術的な課題
3. 次のステップ`;

    // Use the same approach as full-flow.spec.ts which works
    await textArea.fill(text);
    await expect(textArea).toHaveValue(/本日の会議では/);

    // Select options to trigger React state updates
    const slideSelect = page.locator('select#slideMode');
    await slideSelect.selectOption('2');

    const generateButton = page.locator('button[type="submit"]');
    await expect(generateButton).toBeEnabled({ timeout: 10000 });

    // Click and verify no error occurs
    await generateButton.click();

    // Wait for processing to start - button should become disabled
    await expect(generateButton).toBeDisabled({ timeout: 5000 });

    // Page should still be functional (not crashed)
    const pageTitle = await page.title();
    expect(pageTitle).toBeDefined();
  });
});

test.describe('Health Check', () => {
  test('API health endpoint should be accessible', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/health`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.status).toBe('healthy');
  });
});
