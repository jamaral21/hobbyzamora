---
inclusion: auto
---

# Coding Standards — Frontend

## File Organization
- New pages go in `src/app/pages/{section}/` (store, admin, pos)
- New reusable components go in `src/app/components/design-system/`
- Radix/shadcn primitives stay in `src/app/components/ui/` — don't modify these directly
- Section-specific components go in `src/app/components/{section}/`
- New routes must be added to `src/app/routes.tsx`

## Component Patterns
- Use TypeScript interfaces for all props
- Use `cn()` for conditional Tailwind classes
- Prefer composition over prop drilling
- Use Radix UI primitives for accessibility (dialog, dropdown, select, etc.)
- Use Motion library for animations (already installed as `motion`)
- Use Lucide React for icons
- Use Sonner for toast notifications

## Styling
- Tailwind CSS v4 — use utility classes
- Reference theme CSS variables: `bg-background`, `text-foreground`, `text-muted-foreground`, etc.
- Support dark mode via the existing `.dark` class system
- Don't use inline styles unless absolutely necessary
- Keep responsive design in mind (mobile-first)

## State Management
- Zustand for global state (cart, POS cart)
- React context for auth
- Local state (`useState`) for component-level state
- `useData` hook for data fetching patterns

## API Integration
- Use `fetchAPI<T>()` from `src/app/lib/api.ts`
- Backend runs on port 3001, proxied via Vite in dev
- All API endpoints prefixed with `/api/`
- Handle `ApiError` for error states

## Don'ts
- Don't install new UI libraries without discussion — we have Radix + shadcn + MUI already
- Don't modify `components/ui/` files — they're generated primitives
- Don't use `any` type — define proper interfaces
- Don't skip error handling on API calls
