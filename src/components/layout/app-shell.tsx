import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { NavBar } from './nav-bar'
import { SideNav } from './side-nav'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="px-4 lg:pl-6 h-12 flex items-center">
          <Link to="/" className="flex items-center gap-2 font-semibold text-foreground">
            <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="h-6 w-6" />
            Voget Budget
          </Link>
        </div>
      </header>
      <SideNav />
      {/* On mobile/tablet: narrow centered column, bottom nav clearance via pb-20.
          On lg+: full-width main offset by sidebar (lg:pl-56), inner wrapper
          keeps content readable up to max-w-5xl. */}
      <main className="flex-1 w-full px-4 pt-4 pb-20 lg:pl-56 lg:pr-0 lg:pb-8">
        <div className="mx-auto w-full max-w-lg lg:max-w-5xl lg:px-6">
          {children}
        </div>
      </main>
      <NavBar />
    </div>
  )
}
