import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { queryClient } from '@/lib/query-client'
import App from './App'
import './index.css'

// Apply theme before render to prevent flash
const theme = localStorage.getItem('budget-app-theme') || 'system'
const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
const effectiveTheme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme
document.documentElement.classList.add(effectiveTheme)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('SW registration failed:', error)
    })
  })
}
