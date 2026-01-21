# voget.io Theme Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restyle the budget app to match the voget.io cyberpunk/tech aesthetic with dark-only mode, neon accents, and glassmorphism cards.

**Architecture:** Replace CSS variables with voget.io color palette, add JetBrains Mono font, update UI components with glassmorphism and glow effects, remove theme toggle entirely.

**Tech Stack:** Tailwind CSS, CSS custom properties, Google Fonts (JetBrains Mono)

---

### Task 1: Update CSS Variables and Add Font

**Files:**
- Modify: `src/index.css`

**Step 1: Replace the entire CSS file with new theme**

Replace the contents of `src/index.css` with:

```css
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Base colors - voget.io dark theme */
    --background: 220 50% 4%;
    --foreground: 210 40% 96%;

    /* Card/secondary backgrounds */
    --card: 220 40% 7%;
    --card-foreground: 210 40% 96%;
    --popover: 220 40% 7%;
    --popover-foreground: 210 40% 96%;

    /* Primary - Cyan */
    --primary: 190 100% 50%;
    --primary-foreground: 220 50% 4%;

    /* Secondary - Muted navy */
    --secondary: 220 30% 14%;
    --secondary-foreground: 210 40% 96%;

    /* Muted text */
    --muted: 220 30% 14%;
    --muted-foreground: 215 20% 65%;

    /* Accent - Purple */
    --accent: 263 70% 76%;
    --accent-foreground: 220 50% 4%;

    /* Destructive - Pink */
    --destructive: 330 81% 60%;
    --destructive-foreground: 210 40% 96%;

    /* Borders and inputs */
    --border: 220 30% 18%;
    --input: 220 30% 14%;
    --ring: 190 100% 50%;

    /* Border radius */
    --radius: 0.75rem;
  }
}

@layer base {
  * {
    @apply border-border;
  }

  html {
    font-family: 'JetBrains Mono', monospace;
  }

  body {
    @apply bg-background text-foreground font-light;
  }
}

@layer utilities {
  /* Glow effects for neon aesthetic */
  .glow-cyan {
    text-shadow: 0 0 20px rgba(0, 212, 255, 0.5);
  }

  .glow-pink {
    text-shadow: 0 0 20px rgba(236, 72, 153, 0.5);
  }

  .glow-purple {
    text-shadow: 0 0 20px rgba(167, 139, 250, 0.5);
  }

  /* Glassmorphism card effect */
  .glass-card {
    background: rgba(18, 24, 33, 0.7);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(100, 150, 255, 0.15);
    box-shadow:
      0 0 40px rgba(0, 212, 255, 0.05),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
  }

  .glass-card-hover {
    @apply transition-all duration-300;
  }

  .glass-card-hover:hover {
    border-color: rgba(167, 139, 250, 0.4);
    box-shadow:
      0 0 60px rgba(167, 139, 250, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
    transform: translateY(-2px);
  }

  /* Amount colors - semantic neon */
  .amount-positive {
    @apply text-primary glow-cyan;
  }

  .amount-negative {
    @apply text-destructive glow-pink;
  }

  .amount-transfer {
    @apply text-accent glow-purple;
  }
}
```

**Step 2: Verify the build succeeds**

Run: `npm run build`
Expected: Build completes without CSS errors

**Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat: update CSS variables to voget.io dark theme

- Replace light/dark mode with dark-only voget.io palette
- Add JetBrains Mono font
- Add glow utility classes for neon effects
- Add glassmorphism card utilities"
```

---

### Task 2: Update Tailwind Config

**Files:**
- Modify: `tailwind.config.js`

**Step 1: Update the config for dark-only mode**

Replace the contents of `tailwind.config.js` with:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
}
```

**Step 2: Verify the build succeeds**

Run: `npm run build`
Expected: Build completes successfully

**Step 3: Commit**

```bash
git add tailwind.config.js
git commit -m "feat: update tailwind config for dark-only theme

- Remove darkMode class toggle
- Add JetBrains Mono font family
- Keep semantic color system"
```

---

### Task 3: Update Card Component with Glassmorphism

**Files:**
- Modify: `src/components/ui/card.tsx`

**Step 1: Update Card component styling**

Replace the contents of `src/components/ui/card.tsx` with:

```tsx
import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl text-card-foreground glass-card",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
```

**Step 2: Verify the build succeeds**

Run: `npm run build`
Expected: Build completes successfully

**Step 3: Commit**

```bash
git add src/components/ui/card.tsx
git commit -m "feat: update Card component with glassmorphism effect"
```

---

### Task 4: Update Button Component with Neon Glow

**Files:**
- Modify: `src/components/ui/button.tsx`

**Step 1: Update button variants with glow effects**

Replace the contents of `src/components/ui/button.tsx` with:

```tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(0,212,255,0.4)]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:shadow-[0_0_20px_rgba(236,72,153,0.4)]",
        outline:
          "border border-input bg-transparent shadow-sm hover:bg-secondary hover:text-secondary-foreground hover:border-primary/50",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-secondary hover:text-secondary-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        accent:
          "bg-accent text-accent-foreground shadow-sm hover:bg-accent/90 hover:shadow-[0_0_20px_rgba(167,139,250,0.4)]",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

**Step 2: Verify the build succeeds**

Run: `npm run build`
Expected: Build completes successfully

**Step 3: Commit**

```bash
git add src/components/ui/button.tsx
git commit -m "feat: update Button with neon glow hover effects

- Add cyan glow on primary buttons
- Add pink glow on destructive buttons
- Add accent variant with purple glow"
```

---

### Task 5: Remove Theme Toggle System

**Files:**
- Modify: `src/main.tsx`
- Modify: `src/components/layout/app-shell.tsx`
- Delete: `src/hooks/use-theme.ts`
- Delete: `src/components/theme-toggle.tsx`

**Step 1: Update main.tsx to remove theme detection**

Replace the contents of `src/main.tsx` with:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { HashRouter } from 'react-router-dom'
import { queryClient } from '@/lib/query-client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <App />
      </HashRouter>
    </QueryClientProvider>
  </StrictMode>,
)

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
      scope: import.meta.env.BASE_URL
    }).catch((error) => {
      console.error('SW registration failed:', error)
    })
  })
}
```

**Step 2: Update app-shell.tsx to remove ThemeToggleButton**

Replace the contents of `src/components/layout/app-shell.tsx` with:

```tsx
import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { NavBar } from './nav-bar'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="container max-w-lg mx-auto px-4 h-12 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold text-foreground">
            <img src={`${import.meta.env.BASE_URL}app-icon.png`} alt="" className="h-6 w-6 rounded" />
            Voget Budget
          </Link>
        </div>
      </header>
      <main className="flex-1 container max-w-lg mx-auto px-4 pb-20 pt-4">
        {children}
      </main>
      <NavBar />
    </div>
  )
}
```

**Step 3: Delete theme files**

Run:
```bash
rm src/hooks/use-theme.ts src/components/theme-toggle.tsx
```

**Step 4: Verify the build succeeds**

Run: `npm run build`
Expected: Build completes successfully

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: remove theme toggle, use dark-only mode

- Remove theme detection from main.tsx
- Remove ThemeToggleButton from app-shell
- Delete use-theme.ts hook
- Delete theme-toggle.tsx component"
```

---

### Task 6: Update Transaction Amount Colors

**Files:**
- Modify: `src/components/transactions/transaction-item.tsx`

**Step 1: Update amount styling with neon colors**

Replace the contents of `src/components/transactions/transaction-item.tsx` with:

```tsx
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2 } from 'lucide-react'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import type { Transaction, Category, Account } from '@/types'

interface TransactionItemProps {
  transaction: Transaction
  category?: Category
  account?: Account
  onEdit?: (transaction: Transaction) => void
  onDelete?: (transaction: Transaction) => void
}

export function TransactionItem({
  transaction,
  category,
  account,
  onEdit,
  onDelete,
}: TransactionItemProps) {
  const isExpense = transaction.amount < 0
  const isTransfer = transaction.type === 'transfer'

  return (
    <Card className="glass-card-hover">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          {category ? (
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
              style={{ backgroundColor: category.color + '20' }}
            >
              {category.icon}
            </div>
          ) : (
            <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-lg flex-shrink-0">
              {isTransfer ? '↔️' : '📝'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{transaction.description}</div>
            <div className="text-xs text-muted-foreground">
              {formatDate(transaction.date)}
              {account && <span> · {account.name}</span>}
              {category && <span> · {category.name}</span>}
              {isTransfer && <span> · Transfer</span>}
            </div>
          </div>
          <div
            className={cn(
              'font-semibold whitespace-nowrap',
              isTransfer
                ? 'amount-transfer'
                : isExpense
                  ? 'amount-negative'
                  : 'amount-positive'
            )}
          >
            {isExpense ? '' : '+'}
            {formatCurrency(transaction.amount)}
          </div>
          {onEdit && !isTransfer && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(transaction)}
              className="flex-shrink-0"
            >
              <Pencil className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(transaction)}
              className="flex-shrink-0"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
```

**Step 2: Verify the build succeeds**

Run: `npm run build`
Expected: Build completes successfully

**Step 3: Commit**

```bash
git add src/components/transactions/transaction-item.tsx
git commit -m "feat: update transaction amounts with neon colors

- Cyan glow for positive/income amounts
- Pink glow for negative/expense amounts
- Purple glow for transfer amounts
- Add hover effect to transaction cards"
```

---

### Task 7: Update Chart Colors

**Files:**
- Modify: `src/components/dashboard/income-expense-chart.tsx`

**Step 1: Update chart to use neon colors**

Replace the line colors in `src/components/dashboard/income-expense-chart.tsx`:

Find these lines (around line 100-117):
```tsx
<Line
  type="monotone"
  dataKey="income"
  name="Income"
  stroke="#22c55e"
  strokeWidth={2}
  dot={{ fill: '#22c55e', r: 4 }}
  activeDot={{ r: 6 }}
/>
<Line
  type="monotone"
  dataKey="expenses"
  name="Expenses"
  stroke="#ef4444"
  strokeWidth={2}
  dot={{ fill: '#ef4444', r: 4 }}
  activeDot={{ r: 6 }}
/>
```

Replace with:
```tsx
<Line
  type="monotone"
  dataKey="income"
  name="Income"
  stroke="#00d4ff"
  strokeWidth={2}
  dot={{ fill: '#00d4ff', r: 4 }}
  activeDot={{ r: 6 }}
/>
<Line
  type="monotone"
  dataKey="expenses"
  name="Expenses"
  stroke="#ec4899"
  strokeWidth={2}
  dot={{ fill: '#ec4899', r: 4 }}
  activeDot={{ r: 6 }}
/>
```

**Step 2: Verify the build succeeds**

Run: `npm run build`
Expected: Build completes successfully

**Step 3: Commit**

```bash
git add src/components/dashboard/income-expense-chart.tsx
git commit -m "feat: update chart colors to neon palette

- Cyan for income line
- Pink for expenses line"
```

---

### Task 8: Update Input Styling

**Files:**
- Modify: `src/components/ui/input.tsx`

**Step 1: Update input with better focus styling**

Replace the contents of `src/components/ui/input.tsx` with:

```tsx
import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-secondary/50 px-3 py-1 text-base shadow-sm transition-all file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
```

**Step 2: Verify the build succeeds**

Run: `npm run build`
Expected: Build completes successfully

**Step 3: Commit**

```bash
git add src/components/ui/input.tsx
git commit -m "feat: update Input with dark theme styling

- Add semi-transparent secondary background
- Cyan focus ring and border"
```

---

### Task 9: Update Select Component Styling

**Files:**
- Modify: `src/components/ui/select.tsx`

**Step 1: Update SelectTrigger background**

In `src/components/ui/select.tsx`, find the SelectTrigger className (around line 16-18):

```tsx
"flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
```

Replace with:
```tsx
"flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-secondary/50 px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
```

**Step 2: Verify the build succeeds**

Run: `npm run build`
Expected: Build completes successfully

**Step 3: Commit**

```bash
git add src/components/ui/select.tsx
git commit -m "feat: update Select with dark theme styling"
```

---

### Task 10: Final Verification and Visual Test

**Step 1: Run the full build**

Run: `npm run build`
Expected: Build completes with no errors

**Step 2: Start the dev server and visually verify**

Run: `npm run dev`

Manually check:
- [ ] Dark background is showing (#0a0e14)
- [ ] JetBrains Mono font is loading
- [ ] Cards have glassmorphism effect
- [ ] Buttons glow on hover
- [ ] Transaction amounts show cyan/pink/purple colors
- [ ] Chart shows cyan/pink lines
- [ ] Theme toggle is gone from header

**Step 3: Run lint**

Run: `npm run lint`
Expected: No lint errors

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final cleanup for voget.io theme"
```

---

## Summary

This plan updates the budget app styling in 10 tasks:
1. CSS variables and font
2. Tailwind config
3. Card glassmorphism
4. Button glow effects
5. Remove theme toggle
6. Transaction amount colors
7. Chart colors
8. Input styling
9. Select styling
10. Final verification

Each task is independently committable and verifiable.
