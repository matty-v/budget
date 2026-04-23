import { test } from '@playwright/test'

const SPREADSHEET_ID = '11Y6G17JpZ_S2sOdyGLSwojK_swYIDxHksTNLR4PUyps'

test.use({ viewport: { width: 420, height: 900 } })

test('budget annual tab', async ({ page }) => {
  await page.addInitScript((id) => {
    localStorage.setItem('budget_spreadsheet_id', id)
  }, SPREADSHEET_ID)
  await page.goto('/#/budget')
  await page.waitForSelector('text=Override period', { timeout: 15000 })
  // The tab's "Annual" is the first on the page (before category-card Annual buttons)
  await page.getByRole('button', { name: 'Annual' }).first().click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: '/tmp/shots/03-budget-annual.png', fullPage: true })
})
