import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { NavBar } from './nav-bar'
import { ThemeToggleButton } from '@/components/theme-toggle'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="container max-w-lg mx-auto px-4 h-12 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <img src={`${import.meta.env.BASE_URL}app-icon.png`} alt="" className="h-6 w-6 rounded" />
            Voget Budget
          </Link>
          <ThemeToggleButton />
        </div>
      </header>
      <main className="flex-1 container max-w-lg mx-auto px-4 pb-20 pt-4">
        {children}
      </main>
      <NavBar />
    </div>
  )
}
