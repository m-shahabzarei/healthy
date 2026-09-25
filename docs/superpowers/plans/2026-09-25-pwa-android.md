# Healthy PWA and Android Packaging Implementation Plan

> **For agentic workers:** Implement the checked tasks in this plan in order and verify each deliverable before proceeding.

**Goal:** Make Healthy installable as a polished PWA and ready for an Android package from PWABuilder, with one coherent project icon for the browser and installed app.

**Architecture:** Serve a stable public web manifest and static icon set. Register a small same-origin service worker that caches only versioned app assets and an offline information page; keep Supabase data, authentication, and HTML navigation out of persistent caches. Preserve a stable manifest ID and root scope for Android packaging.

**Tech Stack:** Next.js 15 App Router, React, static Web App Manifest, browser Service Worker API, SVG and PNG icons.

## Global Constraints

- Keep the current monochrome visual identity and English/Persian interface.
- Do not cache account data, Supabase requests, authenticated pages, or mutation responses.
- The production site must be available over HTTPS for installation and PWABuilder analysis.

---

### Task 1: Icon system and manifest

**Files:** Create `public/icons/mark.svg`, regular and maskable PNG icon files, `public/favicon.ico`, `public/manifest.webmanifest`; modify `app/layout.tsx` and site brand references; replace the incomplete `app/api/manifest/route.ts` with a permanent redirect for older clients.

**Interfaces:** Browser discovers `/manifest.webmanifest` through document metadata. Manifest declares `/` as ID, scope, and start URL, plus 192px and 512px regular and maskable PNGs. The same SVG mark appears in app branding.

- [ ] Draw a recognizable monochrome mark with a health trend inside an H, using a centered safe zone for adaptive Android masks.
- [ ] Export exact-size opaque PNGs for regular and maskable icons, plus Apple touch and favicon sizes.
- [ ] Link favicon, Apple icon, and manifest in Next metadata; set Android-friendly theme and display values.
- [ ] Check the manifest response and image dimensions in a production server.

### Task 2: Offline behavior and registration

**Files:** Create `public/sw.js`, `public/offline.html`, `components/pwa/ServiceWorkerRegistration.tsx`; modify `app/layout.tsx`.

**Interfaces:** Registration loads `/sw.js` at scope `/`. Navigation fetches use the network and show `/offline.html` when the network fails. Only `/icons/`, `/_next/static/`, and local font assets can enter the static cache.

- [ ] Precache the offline page and brand icon, with activation cleanup for outdated cache versions.
- [ ] Add network-first navigation fallback and scoped static-asset caching.
- [ ] Register the worker in the client layout after page load without breaking unsupported browsers.
- [ ] Verify offline navigation and confirm API/Supabase responses never appear in Cache Storage.

### Task 3: Delivery checks and documentation

**Files:** Modify `README.md`; add a small PWA validation script only if it catches a real packaging risk.

**Interfaces:** Deployment instructions explain HTTPS, PWABuilder URL analysis, Android package generation, and the post-signing Digital Asset Links step.

- [ ] Run TypeScript, lint, i18n, and production build checks.
- [ ] Exercise the installed manifest and worker on a local production server, including offline fallback.
- [ ] Document the exact Android packaging and signing-domain verification steps, noting that the APK wraps the hosted web app and requires the production URL.
