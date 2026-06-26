---
name: Masar auth & data isolation
description: How per-user accounts and the local-first + Supabase data layer fit together in the مسار app
---

# Masar auth & per-user data isolation

Masar is local-first (localStorage primary) with Supabase as cloud sync. Auth is **Supabase Auth with Google** (app already runs on Supabase — no separate provider).

## The owner model
- Every row has an `owner` text column. Logged-out default = `"solo"`. Logged-in = the Supabase `auth.uid()` (uuid string).
- `store.js` holds a module-level `CURRENT_OWNER`; `setOwner(id)` is called on auth bootstrap and on every auth change before `loadAll()` re-reads data.

## The rule (do not break)
Any new `store.js` method that touches Supabase MUST:
1. Filter reads with `.eq("owner", CURRENT_OWNER)`.
2. Constrain deletes/updates with `.eq("owner", CURRENT_OWNER)` (not just by id/date).
3. Use the owner-namespaced localStorage helpers `lsGet`/`lsSet` (they suffix the key per owner, except `solo` which keeps base keys for backward-compat).
4. Have matching RLS policies appended in `supabase-schema.sql`.

**Why:** the original app was single-user (`owner` hardcoded `"solo"`, reads/deletes had no owner filter). Adding Google login without these four steps leaks data across accounts (cross-user read/write/delete) and bleeds cached data between accounts on the same device. A code review caught exactly this.

## RLS
`supabase-schema.sql` enables RLS per table with two policies each: `anon` may only touch `owner = 'solo'`; `authenticated` may only touch `owner = auth.uid()::text`. The user must run the schema SQL in the Supabase SQL Editor for server-side enforcement (app-level scoping works regardless).

## Google OAuth setup (user dashboard steps — required for login to work)
In Supabase dashboard: Authentication > Providers > enable Google (needs a Google Cloud OAuth client id/secret), and add the app origins to Authentication > URL Configuration > Redirect URLs (the dev domain and the deployed `masarr.replit.app`). Without this, the "دخول" button fails.

## AI endpoints
`api-server` coach + analyze routes use a raw `new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })` with the user's OWN key (the Replit AI integration path was declined — it needed phone verification). The key must be a real `sk-ant-` key with a non-zero credit balance, or requests 401/400.
