import { test } from '@playwright/test'

const SPREADSHEET_ID = '11Y6G17JpZ_S2sOdyGLSwojK_swYIDxHksTNLR4PUyps'

async function configureSheet(page: import('@playwright/test').Page) {
  await page.addInitScript((id) => {
    localStorage.setItem('budget_spreadsheet_id', id)
  }, SPREADSHEET_ID)
}

test.use({ viewport: { width: 420, height: 900 } })

test.describe('screenshots', () => {
  test('dashboard', async ({ page }) => {
    await configureSheet(page)
    await page.goto('/')
    await page.waitForSelector('text=Budget Overview', { timeout: 15000 })
    await page.waitForTimeout(1500) // let async charts render
    await page.screenshot({ path: '/tmp/shots/01-dashboard.png', fullPage: true })
  })

  test('budget page monthly tab', async ({ page }) => {
    await configureSheet(page)
    await page.goto('/#/budget')
    await page.waitForSelector('text=Override period', { timeout: 15000 })
    await page.waitForTimeout(1000)
    await page.screenshot({ path: '/tmp/shots/02-budget-monthly.png', fullPage: true })
  })

  test('budget page annual tab', async ({ page }) => {
    await configureSheet(page)
    await page.goto('/#/budget')
    await page.waitForSelector('text=Override period', { timeout: 15000 })
    await page.getByRole('button', { name: 'Annual' }).click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: '/tmp/shots/03-budget-annual.png', fullPage: true })
  })

  test('budget page seed defaults dialog', async ({ page }) => {
    await configureSheet(page)
    await page.goto('/#/budget')
    await page.waitForSelector('text=Override period', { timeout: 15000 })
    // Click the first unbudgeted category's "Monthly" button to create a visible monthly row
    const makeMonthly = page
      .locator('text=Unbudgeted categories')
      .locator('..')
      .locator('button:has-text("Monthly")')
      .first()
    if (await makeMonthly.isVisible().catch(() => false)) {
      // Skip — would write to the live sheet. Instead just open seed dialog.
    }
    await page.getByRole('button', { name: 'Seed defaults' }).click()
    await page.waitForTimeout(2000)
    await page.screenshot({ path: '/tmp/shots/04-seed-dialog.png', fullPage: true })
  })

  test('categories list', async ({ page }) => {
    await configureSheet(page)
    await page.goto('/#/categories')
    await page.waitForSelector('text=Groceries', { timeout: 15000 })
    await page.waitForTimeout(500)
    await page.screenshot({ path: '/tmp/shots/05-categories.png', fullPage: true })
  })

  test('category edit form with cadence picker', async ({ page }) => {
    await configureSheet(page)
    await page.goto('/#/categories')
    await page.waitForSelector('text=Groceries', { timeout: 15000 })
    // Click the edit (pencil) button on the Groceries card
    const groceriesCard = page.locator('text=Groceries').locator('..').locator('..').locator('..')
    await groceriesCard.getByRole('button').first().click()
    await page.waitForSelector('text=No budget', { timeout: 5000 })
    await page.waitForTimeout(500)
    await page.screenshot({ path: '/tmp/shots/06-category-form.png', fullPage: true })
  })
})
