# مسار (Masar)

Arabic, RTL personal time + religious habit tracker (prayers, azkar, Quran, focus, tasks, health) with an AI coach, gamified points, and optional Google login. Deployed at masarr.replit.app.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/masar/` — the web app (React + Vite, mostly JS/JSX). Main UI: `src/pages/MasarApp.jsx`.
- `artifacts/masar/src/lib/store.js` — local-first data layer + Supabase cloud sync (source of truth for the owner model).
- `artifacts/masar/src/lib/auth.js` — Supabase Google auth wrapper.
- `artifacts/masar/supabase-schema.sql` — DB schema + RLS policies. Run in Supabase SQL Editor to apply.
- `artifacts/api-server/src/routes/coach.ts` — AI coach endpoint; `analyze.ts` — report analysis. Both use the Anthropic SDK.
- `artifacts/masar-promo/` — promo video artifact (done).

## Architecture decisions

- Local-first: localStorage is primary; Supabase is sync. The app works fully offline / logged out.
- Per-user data via an `owner` column: `"solo"` when logged out, the Supabase `auth.uid()` when logged in. `store.js` switches `CURRENT_OWNER` on auth change. Every read/delete is owner-scoped and localStorage is namespaced per owner.
- Auth is Supabase Auth (Google) — chosen because the app already runs on Supabase.
- AI uses the user's own Anthropic key via the raw SDK (the Replit AI integration path was declined).
- See `.agents/memory/masar-auth-data.md` for the full owner/RLS rules.
- **Deep-link contract**: `/?view=<id>` is the one entry point for opening the app directly on a given section — read once on initial mount (`MasarApp.jsx`, `VALID_SHORTCUT_VIEWS`), then scrubbed from the address bar; there's no real client-side router (no react-router, no URL changes during in-app navigation). Already used by `public/manifest.json` shortcuts and by `public/sw.js`'s push-notification click handler (`resolveTargetUrl`). Any future external entry point (a home-screen widget, a different deep link source, etc.) should reuse this same `?view=<id>` convention rather than inventing a new one — valid ids are the `VALID_SHORTCUT_VIEWS` array in `MasarApp.jsx` (today/prayer/nutrition/fitness/... 19 total).
- **Unified daily nutrition summary**: `getDailyNutritionSummary({ totals, healthProfile, nutritionPlan })` in `src/lib/nutrition-plan.js` is the one place that turns raw `nutrition_log` totals into consumed/goal/remaining for calories+macros, picking the goal source (an active `user_nutrition_plan` if passed, otherwise a 30/40/30 split of `health_profile.tee`). `NutritionView.jsx`, `NutritionPlanView.jsx`, and `MasarApp.jsx`'s AI-coach context builder all call it instead of recomputing goals/remaining inline — any new consumer (a widget, another screen) should do the same instead of re-deriving targets from `health_profile`/`user_nutrition_plan` directly.

## Product

Daily tracker for prayers, azkar, Quran progress, istighfar, focus sessions, tasks, and manual health logging (steps/sleep/water/energy). An AI coach chats in Arabic and gives personalized advice from the user's data. Points/badges gamify consistency. Optional Google login syncs a user's data across devices.

## User preferences

- Arabic UI, RTL throughout. Casual register. Never use an em-dash in Arabic text.
- User is non-technical — explain in plain language, avoid jargon.

## Gotchas

- Health data is manual entry only (a website cannot read iPhone Health).
- For Google login to work, the user must enable the Google provider in the Supabase dashboard and add redirect URLs (dev domain + masarr.replit.app), then run `supabase-schema.sql` for RLS.
- The AI coach needs a valid `sk-ant-` key with a non-zero Anthropic credit balance.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
