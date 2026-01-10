# Playwright E2E Smoke Tests Design

## Overview

Add end-to-end smoke tests using Playwright to verify core navigation and page rendering, integrated into the PR workflow.

## Scope

**In scope:**
- Verify each page loads without crashing
- Test navigation between all pages
- Check unconfigured state is handled gracefully

**Out of scope:**
- API mocking
- Form submissions
- Data-driven tests

## File Structure

```
e2e/
  smoke.spec.ts       # All smoke tests
playwright.config.ts  # Playwright configuration
```

## Test Cases

1. Homepage (/) loads and shows dashboard
2. Navigation to /accounts works
3. Navigation to /transactions works
4. Navigation to /categories works
5. Navigation to /settings works
6. Nav bar links work correctly

## Playwright Configuration

- Browser: Chromium only (for CI speed)
- Base URL: http://localhost:5173
- Web server: `npm run dev` started automatically
- Retries: 1 (in CI)
- Screenshots: On failure only

## CI Integration

Updates to `.github/workflows/test.yml`:
1. Cache Playwright browsers
2. Install Playwright with Chromium
3. Run e2e tests after lint
4. Upload artifacts on failure

## npm Scripts

- `test:e2e` - Run Playwright tests headless
- `test:e2e:ui` - Run with Playwright UI for local development
