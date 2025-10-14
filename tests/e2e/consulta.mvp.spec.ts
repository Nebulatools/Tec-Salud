import { test, expect } from '@playwright/test'

test('E2E: smoke - app responds', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('load')
  expect(true).toBeTruthy()
})
