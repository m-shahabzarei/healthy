# Healthy

Healthy is a small, mobile-first Next.js app for tracking a personal weight journey. It includes:

- local username/password login and registration;
- daily weight check-ins with a trend chart, goal progress, streak, and recent history;
- a private monthly progress-photo journal with a before/after comparison;
- a quiet community feed with automatically generated milestones and opt-in reactions.

## Run locally

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000` (or the port printed by Next.js). A production check is:

```bash
pnpm exec next build
pnpm start
```

The system `npm` command in some Codex runtimes can have a broken cache; `pnpm` is the tested package manager for this workspace.

## Demo account

- Username: `demo`
- Password: `healthy123`

The demo is intentionally local-only. Credentials are not secure authentication and should not be used for real users.

## Storage model

The prototype stores a versioned snapshot under `healthy-store-v1` in the browser's `localStorage`. The store is deliberately isolated in [`lib/store.ts`](./lib/store.ts), so the UI can later move to a hosted adapter without changing page components.

Progress photos are resized in the browser before they are stored. Local browser storage is not a multi-user backend: users on another browser or device cannot see this demo's feed. To reset the demo, use Settings → Reset demo data, or remove the `healthy-store-v1` key in browser storage.

## Vercel-ready migration seam

For a real deployment, replace the local adapter with managed authentication plus a hosted database/object store (for example Supabase Auth/Postgres/Storage or Vercel Postgres + Blob). Keep the domain contracts in [`lib/types.ts`](./lib/types.ts), then implement the same operations currently exported by `lib/store.ts` (`login`, `register`, `addWeightEntry`, `addProgressPhoto`, `toggleReaction`, and snapshot subscriptions). Do not persist plain-text passwords or photo blobs in `localStorage` in production.

Future environment variables are documented in [`.env.example`](./.env.example); the current client-only demo does not read them.

## Optional Supabase hosting

The repository includes a dependency-free, fetch-based hosted seam in
[`lib/supabase`](./lib/supabase) and a complete database/storage migration in
[`supabase/schema.sql`](./supabase/schema.sql). It is deliberately not wired
into the current pages, so an empty `.env` keeps the local demo unchanged.

1. Create a Supabase project and run `supabase/schema.sql` in the SQL editor.
2. Enable Email/password in Authentication. Hosted Supabase Auth verifies a
   real email (or phone); it cannot safely authenticate a username by querying
   profiles from the browser. The adapter therefore exposes `signUp({ email,
   username, password, ... })` and `signIn({ email, password })`. Username is
   the private/display handle. A username-login UX needs a trusted Edge
   Function or Next.js server route that resolves the handle without exposing
   account existence.
3. Copy the project URL and anon/publishable key to
   `NEXT_PUBLIC_SUPABASE_URL` and either `NEXT_PUBLIC_SUPABASE_ANON_KEY` or
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Never put a
   `service_role` key in browser or Vercel client environment variables.
4. Create an adapter with `createSupabaseAdapter()` (or pass an explicit
   `{ url, anonKey }` config), restore its `HostedSession` from your secure
   server session, and replace the local repository at the seam documented in
   `lib/store.ts`. The adapter intentionally does not persist access tokens.

The schema enables RLS on every application table, restricts weight/photo
writes to the owner, exposes only opted-in feed profiles/posts/photos, and
stores progress images in a private `progress-photos` bucket. Signed URLs are
short-lived. Apply schema changes through migrations rather than editing a
production database by hand.

Official references: [Supabase password auth](https://supabase.com/docs/guides/auth/passwords),
[Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security),
and [Storage access control](https://supabase.com/docs/guides/storage/security/access-control).

### Current integration gap

This is a ready backend adapter, not a runtime switch yet. The present UI still
calls synchronous `lib/store.ts` functions and its auth form has no email
field; the hosted methods are asynchronous, hosted signup needs email, and
sessions should be refreshed/stored by a trusted Next.js server route or
httpOnly-cookie integration. A repository/provider must map those async
methods into page state, pass compressed image `Blob`s to
`uploadProgressPhoto`, and call `syncGeneratedPosts` for activities produced by
`lib/activity.ts`. Until that wiring is deliberately implemented, setting the
Supabase variables alone does not move or sync local demo data.
