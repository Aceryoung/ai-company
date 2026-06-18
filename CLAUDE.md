# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # dev server (Turbopack, http://localhost:3000)
npm run build    # production build
npm run lint     # eslint
```

No test suite. Verify changes manually via the dev server.

## Architecture

**Stack:** Next.js 16 (App Router) + Supabase + Tailwind CSS v4 + TypeScript

**Auth:** Supabase Auth with SSR cookies. `lib/supabase/middleware.ts` refreshes the session on every request and redirects unauthenticated users to `/login`. Server components use `lib/supabase/server.ts`; client components use `lib/supabase/client.ts`.

**Layout shell:** `app/layout.tsx` wraps everything in `<AppShell>`. AppShell reads the pathname — if `/login`, renders children only; otherwise renders `<Sidebar>` (desktop, fixed 220px left) + `<DesktopTopBar>` + `<BottomNav>` (mobile). All pages use `lg:ml-[220px]` via AppShell's offset.

**Data model:** Single `transactions` table in Supabase with RLS (users see only their own rows). Key fields: `type` (`income`|`expense`), `counterparty`, `amount` (integer, KRW), `supply_value`, `vat_amount`, `proof_type`, `transaction_date`, `memo`, `is_completed`. Types and helpers live in `lib/transactions.ts`.

**Page pattern:** Server components fetch data via `createClient()` and pass it as `initialTransactions` to client components. Client components handle interactions (modals, inline edits) using `createClient()` from the browser client.

**Server actions:** Use `"use server"` files (e.g., `app/import/actions.ts`). Do NOT export plain data constants from `"use server"` files — Turbopack treats all exports as server actions. Move shared data to a separate non-server file (e.g., `data.ts`).

## UI / Design System

All UI work must follow `DESIGN.md` (project-level, takes precedence over `~/.claude/DESIGN.md`).

- Page background: `bg-[#E0F2F1]`
- Primary color: `#26A69A` (teal) — never substitute with Tailwind's built-in teal/cyan
- Cards: `bg-white rounded-2xl border border-gray-100 shadow-sm`
- No inline `style={}`, no arbitrary colors outside the token set

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
- Author a backlog-ready spec/issue → invoke /spec
