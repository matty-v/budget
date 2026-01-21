# voget.io Theme Design

Style update to match the voget.io website aesthetic.

## Design Decisions

- **Dark only** - Remove light mode and theme toggle
- **Refined tech theme** - Colors, typography, glassmorphism cards, but no heavy animations (particles, scanlines, grid)
- **Full neon palette for data** - Cyan for positive/income, pink for negative/expenses, purple for transfers

## Color System

### Base Colors
```css
--background: #0a0e14       /* Deep navy - main background */
--bg-secondary: #121821     /* Slightly lighter navy - cards, inputs */
--foreground: #f1f5f9       /* Off-white text */
--muted-foreground: #94a3b8 /* Muted text */
--border: rgba(100, 150, 255, 0.15) /* Subtle blue-tinted borders */
```

### Accent Colors (Semantic)
```css
--primary: #00d4ff    /* Cyan - primary actions, positive amounts, income */
--destructive: #ec4899 /* Pink - negative amounts, expenses, delete actions */
--accent: #a78bfa     /* Purple - transfers, neutral states, secondary */
```

## Typography

- **Font**: JetBrains Mono (monospace)
- **Weights**: Light (300) body, Medium (500) buttons, Semibold (600) headings
- **Headings**: `tracking-tight` for tighter letter-spacing
- **Numbers**: Tabular figures for alignment in tables

## Card Styling (Glassmorphism)

```css
background: rgba(18, 24, 33, 0.7);
backdrop-filter: blur(10px);
border: 1px solid rgba(100, 150, 255, 0.15);
box-shadow: 0 0 40px rgba(0, 212, 255, 0.05),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
border-radius: 0.75rem;
```

### Hover States
- Cards: `translateY(-2px)` with purple border glow
- Buttons: Brighten with subtle cyan/pink glow

## Implementation Scope

### Files to Modify
1. `src/index.css` - CSS variables, font import, glow utilities
2. `tailwind.config.js` - Border radius, color references
3. `src/components/ui/card.tsx` - Glassmorphism styling
4. `src/components/ui/button.tsx` - Cyan/pink/purple variants with glow
5. `src/main.tsx` - Remove theme detection, always dark

### Files to Remove
- `src/hooks/use-theme.ts`
- `src/components/theme-toggle.tsx`
- Theme toggle usage in components

### Components to Update for Semantic Colors
- Transaction amounts: Cyan (positive), Pink (negative), Purple (transfers)
