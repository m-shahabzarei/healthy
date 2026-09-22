# Healthy Weight Journey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ساخت یک اپلیکیشن موبایل‌محور Next.js به نام Healthy برای ثبت روزانه وزن، مشاهده روند و عکس‌های پیشرفت، و تعامل اجتماعی مینیمال با رابط سیاه‌وسفید.

**Architecture:** پروژه با Next.js App Router و TypeScript ساخته می‌شود. لایه‌ی داده‌ی سمت مرورگر در `lib/store.ts` یک abstraction کوچک روی `localStorage` است تا بدون سرور قابل اجرا و روی Vercel قابل deploy باشد؛ همه‌ی صفحه‌ها از داده‌ی نمونه‌ی deterministic شروع می‌کنند و بعداً می‌توان repository را به Vercel Postgres/Supabase وصل کرد. `AppShell` ناوبری موبایل، هدر، پیام‌های بازخورد و container مشترک را ارائه می‌دهد و صفحه‌ها فقط مسئول محتوای دامنه‌ی خود هستند.

**Tech Stack:** Next.js (App Router), React, TypeScript, CSS با design tokens، Lucide React برای آیکن‌های SVG، SVG سفارشی برای نمودار روند، localStorage به‌عنوان دیتابیس محلی قابل‌تعویض.

## Global Constraints

- رابط mobile-first و responsive برای 375px، 768px و desktop باشد.
- پالت اصلی فقط سیاه/سفید/خاکستری با رنگ معنایی محدود برای موفقیت/خطا باشد؛ از emoji به‌عنوان آیکن استفاده نشود.
- اندازه‌ی touch target برای کنترل‌های اصلی حداقل 44px باشد و focus state قابل مشاهده بماند.
- تمام فرم‌ها label قابل مشاهده، validation نزدیک فیلد و feedback موفقیت/خطا داشته باشند.
- اطلاعات این نسخه در مرورگر ذخیره شود؛ هیچ secret یا credential واقعی در کد قرار نگیرد.
- داده‌های seeded باید قابل‌حذف/بازنشانی باشند تا دمو همیشه قابل تکرار باشد.
- متن‌های رابط کاربری فارسی و جهت صفحه RTL باشد، در حالی که نام برند Healthy به لاتین نمایش داده شود.

---

### Task 1: Scaffold Next.js project and design foundation

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.mjs`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/globals.css`
- Create: `.gitignore`
- Create: `public/manifest.webmanifest`

**Interfaces:**
- Produces root metadata, RTL document shell, CSS tokens, responsive container utilities, and a runnable Next.js app.

- [ ] **Step 1: Define dependencies and scripts**

  Add `next`, `react`, `react-dom`, `lucide-react`, TypeScript and scripts for `dev`, `build`, `start`, and `lint`.

- [ ] **Step 2: Add the root document and manifest**

  Set `lang="fa"`, `dir="rtl"`, viewport metadata, app name `Healthy`, theme color `#f7f7f5`, and mobile standalone hints.

- [ ] **Step 3: Add design tokens and responsive CSS**

  Define semantic variables for ink, canvas, muted surface, border, success, danger, spacing, type scale, radius and motion; add `prefers-reduced-motion`, focus-visible, safe-area padding, button/input primitives, and no-horizontal-scroll rules.

- [ ] **Step 4: Add an accessible root welcome page**

  Build a concise hero with the value proposition, progress preview, and links to `/login` and `/register`. Use semantic headings and a single primary CTA.

- [ ] **Step 5: Verify the scaffold**

  Run `npm install` then `npm run build`; expected result is a successful production build with no TypeScript errors.

---

### Task 2: Build local data/auth store and shared UI primitives

**Files:**
- Create: `lib/types.ts`
- Create: `lib/seed.ts`
- Create: `lib/store.ts`
- Create: `components/ui/IconButton.tsx`
- Create: `components/ui/ProgressBar.tsx`
- Create: `components/ui/WeightChart.tsx`
- Create: `components/layout/AppShell.tsx`
- Create: `components/layout/BottomNav.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- `lib/store.ts` exports `getSnapshot()`, `saveSnapshot(snapshot)`, `login(username, password)`, `register(input)`, `logout()`, `addWeightEntry(entry)`, `addProgressPhoto(photo)`, and `toggleReaction(postId, reaction)`.
- `Snapshot` contains `currentUser`, `users`, `weightEntries`, `progressPhotos`, and `posts` as defined in `lib/types.ts`.
- `AppShell` accepts `{ children: React.ReactNode; active: "home" | "progress" | "community" }` and renders the fixed-safe-area bottom navigation.

- [ ] **Step 1: Define domain types and deterministic seed data**

  Include user, weight entry, goal, progress photo, post, and reaction types. Seed one demo user, eight weight points, two progress photos using stable remote image URLs, and three community posts with useful Persian copy.

- [ ] **Step 2: Implement browser-safe persistence**

  Guard all `window` access, initialize a versioned `healthy-store-v1` record, merge missing seed fields, and expose pure helpers for weight delta and progress percentage. Provide `resetStore()` for development/demo recovery.

- [ ] **Step 3: Implement auth helpers**

  Store only demo credentials in localStorage for this prototype, return typed success/error objects, persist the current user id, and make login/register validation explicit.

- [ ] **Step 4: Implement shared shell and navigation**

  Add a desktop sidebar that collapses to a bottom nav on small screens, with labels plus Lucide icons, active state, logout action, and safe-area-aware content padding.

- [ ] **Step 5: Implement chart primitive**

  Render an accessible responsive SVG line chart for the weight trend with labelled points, summary text, and a table fallback hidden visually but available to screen readers.

- [ ] **Step 6: Verify primitives**

  Run `npm run build`; manually inspect keyboard focus and narrow viewport behavior in the browser.

---

### Task 3: Add login and registration flows

**Files:**
- Create: `app/login/page.tsx`
- Create: `app/register/page.tsx`
- Create: `components/auth/AuthForm.tsx`
- Create: `components/auth/AuthCard.tsx`

**Interfaces:**
- `AuthForm` accepts `mode: "login" | "register"` and calls the store auth helpers, then redirects to `/dashboard` on success.

- [ ] **Step 1: Build labelled form states**

  Add username, password, and registration confirmation fields with `autocomplete`, inline errors, password visibility toggle, disabled submit/loading state, and an `aria-live` feedback region.

- [ ] **Step 2: Add auth page layouts**

  Use the monochrome editorial card treatment, a short trust note explaining local storage, and clear links between login and registration.

- [ ] **Step 3: Add route protection behavior**

  On dashboard routes, redirect unauthenticated visitors to `/login`; provide a visible demo hint (`demo / healthy123`) without presenting it as real security.

- [ ] **Step 4: Verify auth flows**

  Run the dev server and test failed login, successful demo login, registration, logout, refresh persistence, and keyboard-only navigation.

---

### Task 4: Implement dashboard and daily weight logging

**Files:**
- Create: `app/dashboard/page.tsx`
- Create: `components/dashboard/WeightHero.tsx`
- Create: `components/dashboard/WeightEntryForm.tsx`
- Create: `components/dashboard/GoalCard.tsx`
- Create: `components/dashboard/RecentEntries.tsx`

**Interfaces:**
- `WeightEntryForm` accepts `onSaved?: (entry: WeightEntry) => void` and writes through `addWeightEntry`.

- [ ] **Step 1: Build current-weight hero**

  Show the latest weight, day-over-day delta with text and icon (not color alone), goal distance, and a compact streak indicator.

- [ ] **Step 2: Add daily entry form**

  Use a numeric kilogram field, date field defaulted to today, optional note, min/max validation, and a success toast/card after save. Prevent duplicate same-day entries with an edit-friendly message.

- [ ] **Step 3: Add trend and recent history**

  Compose `WeightChart`, a recent entries list, and an empty state if the data store is reset.

- [ ] **Step 4: Add goal card**

  Show start/goal/current values, percentage progress, and a neutral encouragement line with a clear next action.

- [ ] **Step 5: Verify dashboard behavior**

  Test adding lower, equal, and higher weights, ensure chart and hero update without reload, and verify layout at 375px width.

---

### Task 5: Implement progress photo timeline

**Files:**
- Create: `app/progress/page.tsx`
- Create: `components/progress/PhotoUploadForm.tsx`
- Create: `components/progress/PhotoTimeline.tsx`
- Create: `components/progress/PhotoCompare.tsx`

**Interfaces:**
- `PhotoUploadForm` accepts `onSaved?: (photo: ProgressPhoto) => void` and stores a data URL plus date and caption.

- [ ] **Step 1: Build photo upload form**

  Accept image files through a labelled file input, show local preview, validate image type/size, and store a compressed data URL in localStorage with an accessible remove/reset action.

- [ ] **Step 2: Build timeline cards**

  Display photos chronologically with date, caption, and monthly marker; include a strong empty state that explains the recommended once-a-month habit.

- [ ] **Step 3: Build before/after comparison**

  Let the user choose oldest/latest photos and present them side-by-side on desktop and stacked on mobile, with alt text and dates.

- [ ] **Step 4: Verify persistence and resilience**

  Test invalid files, refresh persistence, missing image fallback, reduced motion, and mobile stacking.

---

### Task 6: Implement the social progress feed and reactions

**Files:**
- Create: `app/community/page.tsx`
- Create: `components/community/CommunityFeed.tsx`
- Create: `components/community/ProgressPost.tsx`
- Create: `components/community/ReactionBar.tsx`
- Create: `lib/activity.ts`

**Interfaces:**
- `lib/activity.ts` exports `buildDailyActivity(snapshot, userId)` and `formatActivityCopy(activity)`; activities are generated from meaningful state changes only.
- `ReactionBar` accepts `post: CommunityPost` and `onReact(reaction)` and exposes `aria-pressed` for each reaction.

- [ ] **Step 1: Define automatic activity rules**

  Generate a post when a user loses weight versus the previous day, reaches a 7-day logging streak, reaches a 1kg milestone, or adds a monthly photo. Never generate posts for unchanged/noisy values and deduplicate by activity key/date.

- [ ] **Step 2: Build feed cards**

  Show avatar initials, Persian activity copy, timestamp, a compact metric block, and a subtle “سیستم Healthy” marker for generated events.

- [ ] **Step 3: Add reactions**

  Support encouragement, celebrate, and fire reactions with counts; persist the current user’s toggle state and announce updates via `aria-live`.

- [ ] **Step 4: Add filter/empty states**

  Provide “همه / کاهش وزن / رکوردها / عکس‌ها” filters with a single active state and a helpful empty message.

- [ ] **Step 5: Verify feed logic**

  Add a weight entry and confirm the correct automatic event appears once, toggle reactions, reload, and confirm counts persist.

---

### Task 7: Quality pass, documentation, and Vercel readiness

**Files:**
- Create: `README.md`
- Create: `.env.example`
- Modify: `app/globals.css`
- Modify: `lib/store.ts`
- Modify: `app/layout.tsx`

**Interfaces:**
- README documents local development, demo credentials, localStorage limitations, and the exact seam to replace with Vercel Postgres/Supabase.

- [ ] **Step 1: Add deployment documentation**

  Document `npm run dev`, `npm run build`, Vercel deployment, and how to clear `healthy-store-v1` from browser storage.

- [ ] **Step 2: Add environment contract**

  Add `.env.example` with future `DATABASE_URL` and `AUTH_SECRET` placeholders, explicitly unused by the current client-only demo.

- [ ] **Step 3: Run final checks**

  Run `npm run build`, scan for TypeScript/ESLint errors, verify no horizontal overflow, verify all interactive controls have labels/focus, and test reduced-motion CSS.

- [ ] **Step 4: Perform a visual smoke test**

  Use the browser at 375px and desktop widths to exercise login → dashboard → weight save → progress photo → community reaction, then report any known prototype limitations.

---

## Self-review checklist

- The login/register requirement is covered by Task 3.
- Daily weight entry, trend chart, and motivation summary are covered by Task 4.
- Monthly photo upload, timeline, and comparison are covered by Task 5.
- Automatic social activity, reactions, and meaningful-event rules are covered by Task 6.
- Vercel-friendly no-server persistence and a future database seam are covered by Tasks 2 and 7.
- The monochrome mobile-first visual language and accessibility requirements are enforced globally and verified in Tasks 1, 2, and 7.
