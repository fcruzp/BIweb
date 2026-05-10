# Task 1 — Build Full SaaS Landing Page

## Agent: full-stack-developer

## Summary
Completely rewrote the WelcomeScreen from a basic auth screen into a comprehensive SaaS marketing landing page with 8 sections, full bilingual support (EN/ES), and emerald-600 color scheme.

## Files Modified
1. **`src/lib/i18n.ts`** — Added ~90 new translation keys for both EN and ES (landing page sections: navbar, hero, features, how-it-works, pricing, FAQ, final CTA, footer)
2. **`src/components/auth/WelcomeScreen.tsx`** — Complete rewrite with 8 sections as standalone components
3. **`src/components/app/settings/usage-plan-dialog.tsx`** — Fixed `TableExport` → `FileDown` (non-existent lucide-react icon causing 500 error)

## Key Decisions
- All sub-components (Navbar, HeroSection, etc.) defined outside WelcomeScreen to satisfy React Compiler's static-components lint rule
- Props pattern used to pass `t`, `locale`, `setLocale`, `openAuthModal` to sub-components
- PLANS and PLAN_ORDER imported from `@/lib/plans` for dynamic pricing cards
- shadcn/ui Accordion used for FAQ section
- Dark sections (hero, navbar, footer, FAQ, how-it-works) use `bg-gray-950`
- Light sections (features, pricing, final CTA) use `bg-background`

## Verification
- ESLint: 0 errors (1 pre-existing TanStack Table warning)
- Dev server: GET / returned 200 successfully
