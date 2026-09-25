# Settings Language Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a member switch the Healthy interface between English and Persian from Profile → Settings.

**Architecture:** Keep the selected locale in the existing React language context and persist it in browser storage. Update the document language and direction whenever the locale changes. Add one labeled select to the existing Settings preferences, using the translations already in `lib/i18n.ts`.

**Tech Stack:** Next.js 15 App Router, React 18, TypeScript, CSS.

## Global Constraints

- Preserve the current English default when no valid saved locale exists.
- Support `en` and `fa` only, matching `Locale` in `lib/i18n.ts`.
- Keep the existing Profile → Settings route and settings actions.
- Preserve unrelated edits in the worktree.

---

### Task 1: Activate language state

**Files:** Modify `components/i18n/LanguageProvider.tsx`.

**Interfaces:** `useLanguage()` returns `locale: Locale`, `setLocale: (locale: Locale) => void`, and `t(key, values)`. `setLocale` persists the choice under `healthy.locale` and updates `<html lang>` and `<html dir>`.

- [x] Inspect the existing fixed language provider, dictionary, and route layout.
- [x] Add state for `Locale`, load only valid stored values after hydration, and listen for changes from another tab.
- [x] Make `t` translate using the selected locale and update document language, direction, and title.
- [x] Verify with TypeScript and the i18n coverage check.

### Task 2: Expose the preference in Settings

**Files:** Modify `app/settings/page.tsx`, `app/globals.css`.

**Interfaces:** The labeled Settings select reads `locale` and calls `setLocale` with `en` or `fa`.

- [x] Add a labeled language select with English and فارسی options and explanatory text.
- [x] Style the control for desktop and mobile, and apply the bundled Vazir font to Persian text.
- [x] Run TypeScript, ESLint, and i18n coverage checks; review the locale change and persistence paths in code. Browser interaction requires a signed-in account, which was not available in this workspace.
