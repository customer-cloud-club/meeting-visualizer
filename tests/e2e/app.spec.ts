import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'https://meeting-dev.aidreams-factory.com';

test.describe('Meeting Visualizer E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
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
    const textArea = page.locator('textarea');
    await textArea.fill('テスト用の議事録です。本日の会議では以下の内容を議論しました。1. プロジェクトの進捗状況 2. 次のマイルストーン 3. 課題と対策');

    const generateButton = page.locator('button', { hasText: /生成|Generate/i });

    // Wait for button to become enabled
    await page.waitForTimeout(500);
    const isEnabled = await generateButton.isEnabled();
    expect(isEnabled).toBeTruthy();
  });

  test('should be able to click generate button with valid input', async ({ page }) => {
    const textArea = page.locator('textarea');
    await textArea.fill('テスト用の議事録です。本日の会議では以下の内容を議論しました。1. プロジェクトの進捗状況 2. 次のマイルストーン 3. 課題と対策');

    const generateButton = page.locator('button', { hasText: /生成|Generate/i });
    await page.waitForTimeout(500);

    // Button should be enabled and clickable
    const isEnabled = await generateButton.isEnabled();
    expect(isEnabled).toBeTruthy();

    // Click and verify no error occurs
    await generateButton.click();

    // Wait a moment for the action to process
    await page.waitForTimeout(500);

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
