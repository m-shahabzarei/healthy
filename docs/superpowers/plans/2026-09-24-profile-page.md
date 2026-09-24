# Profile Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each signed-in member a useful, editable personal profile at `/profile`.

**Architecture:** Use the existing hosted snapshot for account, goal, weight, and photo data. Keep all mutations in `updateHostedProfile`, which already validates authentication and reloads canonical Supabase data. Reuse `AppShell` and add Profile as a fourth primary destination; the mobile avatar opens the page.

**Tech Stack:** Next.js 15 App Router, React 18, TypeScript, Supabase hosted adapter, project CSS and Lucide icons.

## Global Constraints

- Username is the immutable login identity and must remain read-only.
- Weight storage is canonical kilograms, regardless of display preferences.
- Private photos and weights must stay in the authenticated owner's page only.
- Preserve the established monochrome visual language and responsive app shell.

---

### Task 1: Profile navigation

**Files:** Modify `components/layout/BottomNav.tsx`, `components/layout/AppShell.tsx`.

**Interfaces:** `BottomNav({ active })` and `AppShell({ active })` accept `'profile'` alongside existing destinations.

- [x] Add `/profile` as the fourth labeled navigation item with a Lucide user icon and active state.
- [x] Make the desktop identity card and mobile avatar link to `/profile`, and keep logout in Settings.
- [x] Verify route links and active state in the source and responsive styles.

### Task 2: Profile overview and edit form

**Files:** Create `app/profile/page.tsx`, `components/profile/ProfileEditor.tsx`, `app/profile/profile.css`.

**Interfaces:** `ProfileEditor({ user }: { user: User })` calls `updateHostedProfile({ displayName, startWeightKg, targetWeightKg, startDate, targetDate })`. The page consumes `HostedState.snapshot`, `getUserWeights`, `getLatestWeight`, `getLoggingStreak`, and `calculateProgress`.

- [x] Build the signed-in profile overview with identity, join date, current weight, goal progress, check-in count, photo count, and links to Progress and Settings. Handle empty weight history with the recorded start weight.
- [x] Build labeled profile fields with stable draft state, a read-only username, inline validation (name 1–50 chars; weights 20–400 kg; goal below start; valid dates and target after start), save feedback, cancel/reset, and disabled state while saving.
- [x] Use existing CSS tokens, responsive grids, visible focus states, and adequate touch targets. Avoid exposing private data through a public profile route.
- [x] Run the local TypeScript, ESLint, and production build binaries; fix any errors. (`npx` is broken in this environment, so the equivalent local binaries were used.)

### Task 3: Integration review

**Files:** Modify the files above only if verification reveals an issue.

- [x] Inspect changes for existing worktree edits and privacy boundary mistakes.
- [x] Confirm the profile navigation has responsive styles and that `updateHostedProfile` reloads the canonical snapshot after a save. Live browser confirmation requires configured Supabase credentials.
