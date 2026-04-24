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

// Sidebar nav for lg+ viewports. Mobile/tablet still gets the bottom NavBar.
export function SideNav() {
  return (
    <nav className="hidden lg:flex fixed top-0 left-0 bottom-0 w-56 flex-col border-r bg-background/80 backdrop-blur-sm pt-16 pb-4 px-3 gap-1">
      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
              isActive
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
            )
          }
        >
          <Icon className="h-5 w-5" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
