import { test, expect } from '@playwright/test'

test.describe('Smoke Tests', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  })

  test('accounts page loads via navigation', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Accounts' }).click()
    await expect(page.getByRole('heading', { name: 'Accounts' })).toBeVisible()
  })

  test('transactions page loads via navigation', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Transactions' }).click()
    await expect(page.getByRole('heading', { name: 'Transactions' })).toBeVisible()
  })

  test('categories page loads via navigation', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Categories' }).click()
    await expect(page.getByRole('heading', { name: 'Categories' })).toBeVisible()
  })

  test('settings page loads via navigation', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Settings' }).click()
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  })

  test('budget page loads via navigation', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Budget' }).click()
    await expect(page.getByRole('heading', { name: 'Budget' })).toBeVisible()
    // Cadence tabs render
    await expect(page.getByRole('button', { name: 'Monthly' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Annual' })).toBeVisible()
  })

  test('navigation bar works', async ({ page }) => {
    await page.goto('/')

    // Navigate to Accounts
    await page.getByRole('link', { name: 'Accounts' }).click()
    await expect(page.getByRole('heading', { name: 'Accounts' })).toBeVisible()

    // Navigate to Transactions
    await page.getByRole('link', { name: 'Transactions' }).click()
    await expect(page.getByRole('heading', { name: 'Transactions' })).toBeVisible()

    // Navigate to Categories
    await page.getByRole('link', { name: 'Categories' }).click()
    await expect(page.getByRole('heading', { name: 'Categories' })).toBeVisible()

    // Navigate to Budget
    await page.getByRole('link', { name: 'Budget' }).click()
    await expect(page.getByRole('heading', { name: 'Budget' })).toBeVisible()

    // Navigate to Settings
    await page.getByRole('link', { name: 'Settings' }).click()
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()

    // Navigate back to Home
    await page.getByRole('link', { name: 'Home' }).click()
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  })

  test('unknown routes redirect to home', async ({ page }) => {
    await page.goto('/nonexistent-page')
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  })
})
