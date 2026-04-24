import { test, Page } from '@playwright/test'

const SPREADSHEET_ID = 'mock-sheet-id'
const now = '2026-04-23T12:00:00Z'

const accounts = [
  { id: 'acct-1', name: 'USAA Checking', type: 'checking', balance: '12450.33', is_active: 'TRUE', created_at: now, updated_at: now },
]

const cats = [
  { id: 'c-groc', name: 'Groceries',         type: 'expense', icon: '🛒', color: '#4CAF50', budget_amount: '800',  budget_cadence: 'monthly' },
  { id: 'c-dine', name: 'Dining & Takeout',  type: 'expense', icon: '🍽️', color: '#FF9800', budget_amount: '400',  budget_cadence: 'monthly' },
  { id: 'c-util', name: 'Utilities',         type: 'expense', icon: '💡', color: '#9C27B0', budget_amount: '250',  budget_cadence: 'monthly' },
  { id: 'c-ent',  name: 'Entertainment',     type: 'expense', icon: '🎬', color: '#FF5722', budget_amount: '150',  budget_cadence: 'monthly' },
  { id: 'c-trans',name: 'Transportation',    type: 'expense', icon: '⛽', color: '#2196F3', budget_amount: '200',  budget_cadence: 'monthly' },
  { id: 'c-kids', name: 'Kids & Family',     type: 'expense', icon: '👶', color: '#F06292', budget_amount: '600',  budget_cadence: 'monthly' },
  { id: 'c-travel',name: 'Travel',           type: 'expense', icon: '✈️', color: '#009688', budget_amount: '4800', budget_cadence: 'annual' },
  { id: 'c-gifts',name: 'Gifts',             type: 'expense', icon: '🎁', color: '#EC407A', budget_amount: '1200', budget_cadence: 'annual' },
  { id: 'c-shop', name: 'Shopping',          type: 'expense', icon: '🛍️', color: '#795548', budget_amount: '',     budget_cadence: '' },
  { id: 'c-sub',  name: 'Subscriptions',     type: 'expense', icon: '📺', color: '#E91E63', budget_amount: '',     budget_cadence: '' },
  { id: 'c-inc',  name: 'Income',            type: 'income',  icon: '💰', color: '#4CAF50', budget_amount: '',     budget_cadence: '' },
].map((c) => ({ ...c, is_active: 'TRUE', created_at: now, updated_at: now }))

const txns = [
  ...gen('c-groc',  'USAA Checking',  [['2026-04-02', 127.45, 'King Soopers'], ['2026-04-08', 163.21, 'Costco'], ['2026-04-14', 82.14, 'Trader Joes'], ['2026-04-18', 168.3, 'King Soopers']]),
  ...gen('c-dine',  'Chase Sapphire', [['2026-04-03', 48.2, 'Chipotle'], ['2026-04-07', 72.8, 'Mountain Shadows'], ['2026-04-12', 92.5, 'Shugas']]),
  ...gen('c-util',  'USAA Checking',  [['2026-04-05', 142.11, 'Xcel Energy'], ['2026-04-10', 58.44, 'Colorado Springs Utilities']]),
  ...gen('c-ent',   'Chase Sapphire', [['2026-04-04', 52.0, 'Regal Cinemas'], ['2026-04-11', 88.0, 'Dave & Busters']]),
  ...gen('c-trans', 'Chase Sapphire', [['2026-04-06', 42.5, 'Shell']]),
  ...gen('c-kids',  'USAA Checking',  [['2026-04-01', 195.0, 'Brightwheel'], ['2026-04-12', 72.0, 'Childrens Place']]),
  ...gen('c-travel','Chase Sapphire', [['2026-04-09', 232.6, 'Hertz']]),
  { id: 't-inc1', date: '2026-04-15', description: 'Payroll', amount: '7850.00', type: 'income', category_id: 'c-inc', source_account_id: 'USAA Checking', transfer_id: '', notes: '', created_at: now, updated_at: now },
]

function gen(categoryId: string, accountName: string, rows: Array<[string, number, string]>) {
  return rows.map(([date, amt, desc], i) => ({
    id: `t-${categoryId}-${i}`,
    date, description: desc, amount: String(-amt), type: 'expense',
    category_id: categoryId, source_account_id: accountName,
    transfer_id: '', notes: '', created_at: now, updated_at: now,
  }))
}

const budgets = [
  { id: 'b-1', category_id: 'c-dine', period_type: 'monthly', period_key: '2026-04', amount: '500', created_at: now, updated_at: now },
]

async function mockApi(page: Page) {
  await page.addInitScript((id) => {
    localStorage.setItem('budget_spreadsheet_id', id)
  }, SPREADSHEET_ID)
  await page.route('**/sheetsapi-*.run.app/**', async (route) => {
    const url = route.request().url()
    const respond = (body: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
    if (url.endsWith('/health')) return respond({ status: 'ok' })
    if (url.endsWith('/sheets')) return respond({ sheets: [{ title: 'Categories' }, { title: 'Transactions' }, { title: 'Budgets' }] })
    if (url.includes('/sheets/Accounts/rows')) return respond({ rows: accounts })
    if (url.includes('/sheets/Categories/rows')) return respond({ rows: cats })
    if (url.includes('/sheets/Transactions/rows')) return respond({ rows: txns })
    if (url.includes('/sheets/Budgets/rows')) return respond({ rows: budgets })
    return respond({ rows: [] })
  })
}

const pages = [
  { name: 'dashboard', path: '/' },
  { name: 'transactions', path: '/#/transactions' },
  { name: 'categories', path: '/#/categories' },
  { name: 'budgets', path: '/#/budget' },
]

for (const p of pages) {
  test(`mobile ${p.name}`, async ({ page }) => {
    await page.setViewportSize({ width: 420, height: 900 })
    await mockApi(page)
    await page.goto(p.path)
    await page.waitForTimeout(1500)
    await page.screenshot({ path: `/tmp/shots/r-mobile-${p.name}.png`, fullPage: true })
  })

  test(`desktop ${p.name}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await mockApi(page)
    await page.goto(p.path)
    await page.waitForTimeout(1500)
    await page.screenshot({ path: `/tmp/shots/r-desktop-${p.name}.png`, fullPage: false })
  })
}
