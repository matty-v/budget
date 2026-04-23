import { NavLink } from 'react-router-dom'
import { Home, ArrowLeftRight, Tag, PiggyBank, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { to: '/categories', icon: Tag, label: 'Categories' },
  { to: '/budget', icon: PiggyBank, label: 'Budget' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function NavBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t">
      <div className="container max-w-lg mx-auto px-4 flex justify-between py-3">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            aria-label={label}
            className={({ isActive }) =>
              cn(
                'p-2 transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )
            }
          >
            <Icon className="h-6 w-6" />
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
