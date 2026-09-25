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
pnpm check:pwa
```

## PWA and Android APK with PWABuilder

Healthy ships a web app manifest at `/manifest.webmanifest`, a root service worker at `/sw.js`, a branded favicon and Apple touch icon, and 192/512 pixel regular and maskable Android icons. The installed app opens `/dashboard`; signed-out users are taken to login. The service worker keeps only public versioned assets and the offline information page. Account pages, authentication, Supabase requests, and user data are never stored in Cache Storage. Viewing and changing account data requires a connection.

To package the app for Android:

1. Deploy the current production build to a stable **HTTPS** domain and verify that `/manifest.webmanifest`, `/sw.js`, `/offline.html`, and each manifest icon return successfully. `localhost` is suitable for local PWA testing but is not a URL PWABuilder can package for other users.
2. Open [PWABuilder](https://www.pwabuilder.com/), enter the production URL, and review its manifest, service worker, and security checks. Select **Package for stores → Android** and set the permanent Android package ID and app name. Download the generated Android package, including its APK for device testing.
3. Use the package name and signing certificate fingerprint from the **final APK signing key** to publish the generated Digital Asset Links file at `https://YOUR_DOMAIN/.well-known/assetlinks.json`. In this Next.js project, put that file at `public/.well-known/assetlinks.json` and redeploy. If Google Play re-signs the app, include its app-signing certificate fingerprint as well. Check that the deployed JSON is reachable without a redirect.
4. Install the APK on a device. Verify launch, sign-in, navigation, account syncing, offline message, and reconnect. A correctly verified Trusted Web Activity opens without browser chrome; if a browser bar appears, recheck the package ID, signing fingerprint, domain, and asset links file.

The APK is a Trusted Web Activity backed by the hosted site, so the deployed web app must remain available. App code updates are delivered through the site; the offline page explains the connection requirement. The signing certificate information is produced during Android packaging and cannot be filled in reliably before choosing the final package/key.

The icon source is `public/icons/mark.svg`. Its matching raster assets are checked in; regenerate them with `python scripts/generate-pwa-icons.py` (requires Pillow). Run `pnpm check:pwa` after changing the manifest or icons.

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

The recommended setup is the Supabase integration from the Vercel Marketplace. For this deployment, the integration uses the `HEALTHY` prefix and supplies `NEXT_PUBLIC_HEALTHY_SUPABASE_URL`, `NEXT_PUBLIC_HEALTHY_SUPABASE_PUBLISHABLE_KEY`, `HEALTHY_SUPABASE_URL`, and the server-only `HEALTHY_SUPABASE_SECRET_KEY` to Production and Preview. Healthy also supports the integration's legacy anon and service-role keys. It prefers the matched `HEALTHY` set over any older unprefixed values. After changing environment variables, redeploy the current commit.

Then configure Supabase Authentication:

1. Keep Email/password enabled. Healthy's server-only registration route confirms each internal username identity as it is created, so global email-confirmation settings do not need to be weakened.
2. Set the Site URL to the production Vercel domain.
3. Apply the complete SQL migration.
4. Register a fresh account on production and verify login restoration, weight persistence, photo upload, feed generation, and reaction persistence after reload.

The Supabase Free plan is sufficient for a personal deployment, but free projects can pause after inactivity. Review Supabase's current plan limits before relying on the app for long-term availability.
