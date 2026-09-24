# Healthy

Healthy is a focused, mobile-first weight journey app built with Next.js and Supabase. It keeps the interface deliberately minimal and monochrome while making every user-facing record durable and available across devices.

## Features

- real username/password accounts backed by Supabase Auth;
- daily weight check-ins stored in Postgres, with a trend chart, goal progress, streak, and history;
- a private profile with an overview of personal progress and editable name, goal, and journey dates;
- private progress-photo uploads stored in a protected Supabase Storage bucket;
- an opt-in community feed generated from real progress events;
- persistent, atomic reactions protected by Row Level Security (RLS).

Healthy does not ship demo users or seeded application data. It does not store profiles, weights, photos, posts, reactions, or passwords in browser storage. The browser persists only the current Supabase session so a signed-in user can restore their account after a reload.

## Local development

Requirements:

- Node.js 20+
- pnpm
- a Supabase project with email/password authentication enabled

Install dependencies:

```bash
pnpm install
```

Copy `.env.example` to `.env.local` and set these Supabase values (the secret is server-only):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY=YOUR_SERVER_ONLY_SECRET_KEY
```

Apply [`supabase/schema.sql`](./supabase/schema.sql) in the Supabase SQL Editor before starting the app. The migration creates the application tables, policies, functions, triggers, and the private `progress-photos` bucket.

Because the UI intentionally uses username/password instead of collecting email addresses, Healthy maps each normalized username to an internal Supabase Auth identity under `accounts.healthy.invalid`. A server-only registration route uses `SUPABASE_SECRET_KEY` to create that identity as already confirmed; the secret never enters the client bundle. Usernames are therefore treated as immutable account identifiers, and these internal addresses cannot receive password-recovery messages.

Start the app:

```bash
pnpm dev
```

Open `http://localhost:3000`.

## Production checks

```bash
pnpm exec tsc --noEmit
pnpm exec next lint
pnpm exec next build
```

## Data model and security

- Supabase Auth hashes and verifies passwords. The app never stores a password itself.
- `profiles`, `weights`, `photos`, `posts`, and `reactions` all use RLS.
- Weight rows and private photo metadata can be read only by their owner.
- Photo files live in the private `progress-photos` bucket and are displayed through short-lived signed URLs.
- The database generates and reconciles social activity after relevant weight/photo/profile changes.
- Feed visibility requires the profile's `feed_opt_in` setting; private photos never create public photo events.
- Reactions are toggled atomically by the `toggle_reaction` RPC.

Never expose a Supabase secret/service-role key through a `NEXT_PUBLIC_*` variable. The browser runtime needs only the project URL and anon/publishable key; authorization comes from the signed-in user's access token plus RLS.

## Vercel deployment

The recommended setup is the Supabase integration from the Vercel Marketplace. Connect it to Production, Preview, and Development so Vercel supplies the public project URL and publishable key at build time. After changing environment variables, redeploy the current commit.

Then configure Supabase Authentication:

1. Keep Email/password enabled. Healthy's server-only registration route confirms each internal username identity as it is created, so global email-confirmation settings do not need to be weakened.
2. Set the Site URL to the production Vercel domain.
3. Apply the complete SQL migration.
4. Register a fresh account on production and verify login restoration, weight persistence, photo upload, feed generation, and reaction persistence after reload.

The Supabase Free plan is sufficient for a personal deployment, but free projects can pause after inactivity. Review Supabase's current plan limits before relying on the app for long-term availability.
