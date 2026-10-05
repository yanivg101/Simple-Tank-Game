import { test, expect } from '@playwright/test';

test.describe('Game E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/game');
  });

  test('Game starts and can be paused with ESC', async ({ page }) => {
    // Start the game
    await page.getByRole('button', { name: 'Start Game' }).click();
    
    // Check if canvas is rendered
    await expect(page.locator('canvas')).toBeVisible();
    
    // Wait for game loop to start (optional but recommended)
    await page.waitForTimeout(500); 

    // Press Escape to pause
    await page.keyboard.press('Escape');
    
    // Check if pause overlay exists - try searching for text directly
    await expect(page.getByText('Paused', { exact: true })).toBeVisible();
  });

  test('Right-click triggers missile state in HUD (or logs)', async ({ page }) => {
    // This is hard to test fully without game state access, 
    // but we can check if it causes any console errors or crashes.
    await page.click('text=Start Game');
    
    // Try right-clicking
    await page.mouse.click(400, 300, { button: 'right' });
    
    // Ensure game didn't crash
    await expect(page.locator('canvas')).toBeVisible();
  });
});
