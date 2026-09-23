# Changelog

Openday uses Semantic Versioning (`MAJOR.MINOR.PATCH`).

- **MAJOR**: incompatible change to the app/data model or a fundamental workflow change.
- **MINOR**: backwards-compatible feature release.
- **PATCH**: backwards-compatible bug/data correction.

## 1.5.0 — 2026-09-23

- Added a school-phase toggle: Senior / secondary is the default; Primary is available alongside it.
- Added a primary-school catalogue seeded from the Harrow primary-school guide, plus currently published nearby open-event dates where verified.
- Replaced generic `TBC` wording with explicit states such as checking date, reported, and previous-year date.
- Previous-year dates can now be shown as planning guides without implying they are current.
- Added support for date-only events when a school publishes the day but not the event time.
- Updated St Clement Danes to Saturday 26 September 2026 from the school's calendar, with time left unpublished.
- Added Michaela's reported Monday 28 September 2026 event as reported pending exact official time/date verification.
- Added automation plumbing so refreshed school catalogues can be mirrored to Firestore without Firebase Functions.

## 1.4.1 — 2026-09-17

- Memorable token is visible while entering it.
- Removed Openday's token length and format validation.
- Preserves the exact token entered rather than trimming it.

## 1.4.0 — 2026-09-17

- Replaced the proposed Firebase Functions token gateway with direct Firebase Authentication + Firestore sync.
- Memorable token is entered in the app and used as the password for one dedicated Openday Firebase account; no visible email/login flow and no per-device approval.
- Added semantic version source (`version.json`) and deployment validation.
- Aligned service-worker/cache version with the release version.
- Notes autosave, sync status, calendar icon and reusable app-plugin work are included in this release.

## 1.3.0 — 2026-09-17

- Added reusable app-platform modules for autosave, developer notes and Version Lab.
- Added note autosave and sync-status UI.
- Added calendar action iconography and shared app-platform documentation.

## 1.2.0 — 2026-09-17

- Added month calendar view and subscribable calendar feed.
- Added alternative visit dates and booking-watch information.
- Added journey estimates and live route links.

## 1.1.0 — 2026-09-17

- Added cohort-aware admission deadlines, official admissions links and academic/selection-score guidance.
- Added link verification status.

## 1.0.0 — 2026-09-17

- Initial mobile-first school open-day tracker with JSON data, filters, favourites, booked status, notes and individual calendar export.

> The 1.0.0–1.3.0 entries are a reconstructed feature history from the existing repository commits. From 1.4.0 onward, `version.json`, the visible app version, cache-busting value and this changelog are kept in step.
