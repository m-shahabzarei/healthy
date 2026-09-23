# Real Supabase Production Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every mock/localStorage data path with real Supabase Auth, Postgres, Row Level Security, and private Storage, then deploy and verify the live Vercel application.

**Architecture:** Keep the existing dependency-free Supabase REST adapter and expose it through one browser-side hosted store with a stable external-store snapshot. Only the short-lived Supabase session is persisted locally; profiles, weights, photos, posts, and reactions are always loaded from Supabase. Generated community events are rebuilt by database triggers so they remain correct and cannot be forged by clients.

**Tech Stack:** Next.js 15 App Router, React 18, TypeScript, Supabase Auth/Postgres/Storage, Vercel.

## Global Constraints

- The complete UI remains English, left-to-right, and black-and-white.
- Login and registration remain username/password; usernames map deterministically to an internal Supabase Auth email and are immutable. A server-only route creates each identity as already confirmed without weakening global email-confirmation settings.
- No demo account, seeded snapshot, plaintext password, or application data may be read from or written to `localStorage`.
- Progress photos are private by default and use signed URLs from a private Supabase Storage bucket.
- The community feed renders only persisted database posts; reactions are persisted through an atomic database RPC.
- Every write must surface a real success or failure and reload canonical server data.

---

### Task 1: Harden the Supabase schema and automatic activity engine

**Files:**
- Modify: `supabase/schema.sql`
- Modify: `lib/supabase/adapter.ts`

**Interfaces:**
- Consumes: authenticated `auth.uid()`, `weights`, `photos`, and profile goal fields.
- Produces: `public.rebuild_generated_posts(uuid)` plus INSERT/UPDATE/DELETE triggers that reconcile generated posts.

- [ ] **Step 1: Add data and bucket constraints**

Add goal/date consistency checks and configure `progress-photos` with a 4 MB limit and `image/jpeg`, `image/png`, and `image/webp` MIME allowlist.

- [ ] **Step 2: Add the activity reconciliation function**

Create a `security definer` function that computes consecutive-day losses, seven-day streaks, whole-kilogram goal milestones, and the first shared photo in each calendar month. Upsert those rows by `(user_id, activity_key)` and delete generated keys no longer supported by source data.

- [ ] **Step 3: Add source triggers and restrict generated writes**

Call reconciliation after weight/photo mutations and relevant profile goal changes. Client RLS policies may write only `generated = false`; database triggers own `generated = true` posts.

- [ ] **Step 4: Whitelist photo types in the adapter**

Reject everything except JPEG, PNG, and WebP and enforce the same 4 MB ceiling before upload.

- [ ] **Step 5: Validate the SQL and TypeScript**

Run:

```powershell
pnpm exec tsc --noEmit
```

Expected: exit code 0.

---

### Task 2: Create seed-free selectors and a hosted runtime store

**Files:**
- Create: `lib/selectors.ts`
- Create: `lib/hosted-store.ts`
- Modify: `lib/types.ts`

**Interfaces:**
- Produces: `subscribeHosted`, `getHostedState`, `getHostedServerState`, `loginHosted`, `registerHosted`, `logoutHosted`, `refreshHostedData`, `addHostedWeight`, `addHostedPhoto`, `toggleHostedReaction`, and `updateHostedProfile`.
- State shape:

```ts
type HostedStatus = "booting" | "anonymous" | "ready" | "error";
interface HostedState {
  status: HostedStatus;
  snapshot: Snapshot;
  error: string | null;
}
```

- [ ] **Step 1: Extract pure selectors**

Move date, weight sorting, latest/previous reading, streak, conversion, delta, and progress helpers into `lib/selectors.ts`. They must accept arguments and import neither seed data nor browser storage.

- [ ] **Step 2: Define an empty production snapshot**

Use exactly:

```ts
const EMPTY_SNAPSHOT: Snapshot = {
  version: STORE_VERSION,
  currentUser: null,
  currentUserId: null,
  users: [],
  weightEntries: [],
  progressPhotos: [],
  posts: [],
  reactions: [],
};
```

- [ ] **Step 3: Implement session restoration**

Persist only `HostedSession` under `healthy-supabase-session-v1`. On boot, refresh it through Supabase, then load profile, weights, signed photos, feed posts, and reactions. Invalid/expired sessions clear the key and become `anonymous`; missing Supabase configuration becomes `error`.

- [ ] **Step 4: Preserve username/password UX**

Normalize `^[a-z0-9_.-]{3,32}$` and map it to `${username}@accounts.healthy.invalid` for both signup and sign-in. Register through `/api/auth/register`, which uses `SUPABASE_SECRET_KEY` only on the server to create an already-confirmed identity with `feedOptIn: true`; then sign in, create the starting weight as a real row, persist the returned session, and reload canonical data.

- [ ] **Step 5: Implement canonical async mutations**

Each mutation calls the adapter, then `refreshHostedData()`. A 401 attempts one token refresh; all failures preserve the previous canonical snapshot and throw a user-safe error.

- [ ] **Step 6: Validate the store**

Run:

```powershell
rg -n "createSeedSnapshot|STORE_KEY|healthy123|passwordHash" lib/hosted-store.ts lib/selectors.ts
pnpm exec tsc --noEmit
```

Expected: the search returns no matches and TypeScript exits 0.

---

### Task 3: Rewire authentication and protected navigation

**Files:**
- Modify: `components/auth/AuthForm.tsx`
- Modify: `components/layout/AppShell.tsx`

**Interfaces:**
- Consumes: hosted state and async auth functions from `lib/hosted-store.ts`.
- Produces: real signup/sign-in/sign-out with boot, anonymous, ready, and error rendering.

- [ ] **Step 1: Remove demo authentication**

Start username/password fields empty, remove the demo credentials hint and artificial timers, require at least eight password characters, await real auth, and preserve submitted values on failure.

- [ ] **Step 2: Handle hosted boot state**

`AppShell` shows a loader during `booting`, redirects only when `anonymous`, shows a retry action for `error`, and awaits logout before routing to `/login`.

- [ ] **Step 3: Validate auth surfaces**

Run:

```powershell
rg -n "demo|healthy123|localStorage|setTimeout" components/auth components/layout
pnpm exec tsc --noEmit
```

Expected: no demo/storage matches and TypeScript exits 0.

---

### Task 4: Rewire weight, photo, community, and settings features

**Files:**
- Modify: `app/dashboard/page.tsx`
- Modify: `app/progress/page.tsx`
- Modify: `components/dashboard/WeightEntryForm.tsx`
- Modify: `components/progress/PhotoUploadForm.tsx`
- Modify: `components/community/CommunityFeed.tsx`
- Modify: `app/settings/page.tsx`

**Interfaces:**
- Consumes: hosted snapshot and mutation methods.
- Produces: database-backed weights, Storage-backed photos, persisted feed reactions, and a real feed visibility preference.

- [ ] **Step 1: Rewire dashboard and progress selectors**

Subscribe to `getHostedState().snapshot` and import pure selector helpers from `lib/selectors.ts`.

- [ ] **Step 2: Await weight writes**

Replace the timer/local call with `await addHostedWeight({ date, weightKg, note })`. Clear inputs only after the server confirms and the canonical reload succeeds.

- [ ] **Step 3: Upload a real compressed Blob**

Make image compression return `{ preview: string; blob: Blob }`, retain the original name, and call `addHostedPhoto(blob, { date, caption, visibility }, name)`. Reject SVG and files above 4 MB.

- [ ] **Step 4: Render only persisted posts**

Remove `buildDailyActivity`, merge logic, `saveSnapshot`, and local reaction logic from `CommunityFeed`. Await `toggleHostedReaction` and disable the selected post while it is pending.

- [ ] **Step 5: Replace demo settings**

Remove “Reset demo data,” expose the current feed sharing preference, update it through `updateHostedProfile({ feedOptIn })`, and await logout.

- [ ] **Step 6: Validate all runtime imports**

Run:

```powershell
rg -n "@/lib/store|createSeedSnapshot|healthy123|Reset demo|browser storage" app components lib --glob "!lib/store.ts" --glob "!lib/seed.ts"
pnpm exec tsc --noEmit
pnpm exec next lint
```

Expected: no production matches and both checks exit 0.

---

### Task 5: Update production documentation and verify the build

**Files:**
- Modify: `.env.example`
- Modify: `README.md`

**Interfaces:**
- Documents: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` only; secret/service-role keys never enter browser code.

- [ ] **Step 1: Replace prototype documentation**

Document real Supabase Auth/Postgres/Storage, schema installation, email-confirmation requirement for internal usernames, RLS, and Vercel environment setup. Remove all local-demo claims and credentials.

- [ ] **Step 2: Run the production gate**

Run:

```powershell
pnpm exec tsc --noEmit
pnpm exec next lint
pnpm exec next build
```

Expected: all three commands exit 0.

- [ ] **Step 3: Commit and push**

Run:

```powershell
git add app components lib supabase/schema.sql README.md .env.example docs/superpowers/plans/2026-09-22-real-supabase-production.md
git commit -m "Connect Healthy to Supabase production data"
git push origin main
```

Expected: `main` contains the new commit and the worktree is clean.

---

### Task 6: Provision, migrate, deploy, and test production

**External systems:**
- Vercel project: `healthy`
- Supabase Marketplace integration and Studio
- Live Healthy deployment

- [ ] **Step 1: Create the free Supabase resource**

After action-time confirmation, accept the integration, choose the free plan, name the resource `healthy`, choose Frankfurt when available, and connect Production, Preview, and Development environments. Stop if billing authorization is requested.

- [ ] **Step 2: Apply the schema and Auth configuration**

Run the complete `supabase/schema.sql` in Supabase SQL Editor and confirm Email/password remains enabled. The server-only registration route confirms internal username identities individually, so global email confirmation remains unchanged.

- [ ] **Step 3: Redeploy with injected environment variables**

Confirm `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` exist for the project, then redeploy the pushed `main` commit.

- [ ] **Step 4: Execute live acceptance tests**

Register a new user; reload; log out/in; write and overwrite a dated weight; upload a private photo; share a feed photo; verify generated events; react; reload; and confirm every item persists. Confirm corresponding rows in Supabase Table Editor and the object in Storage.

- [ ] **Step 5: Verify production contains no seeded content**

A brand-new account must begin with only its submitted profile and starting-weight row, an empty private photo journal, and database-generated activity only. No `demo`, synthetic historic weights, seeded photos, or seeded posts may appear.
