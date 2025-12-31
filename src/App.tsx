import { Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/app-shell'
import { Toaster } from '@/components/ui/toaster'
import { DashboardPage } from '@/pages/dashboard'
import { AccountsPage } from '@/pages/accounts'
import { TransactionsPage } from '@/pages/transactions'
import { CategoriesPage } from '@/pages/categories'
import { SettingsPage } from '@/pages/settings'

function App() {
  return (
    <>
      <AppShell>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
      <Toaster />
    </>
  )
}

export default App
