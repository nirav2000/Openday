# Changelog

Openday uses Semantic Versioning (`MAJOR.MINOR.PATCH`).

- **MAJOR**: incompatible change to the app/data model or a fundamental workflow change.
- **MINOR**: backwards-compatible feature release.
- **PATCH**: backwards-compatible bug/data correction.

## 2.2.4 — 2026-09-23

- Removed the hourly refresh hint from the subscribed calendar.
- The calendar is now generated only from committed calendar-source data.
- Unverified user-reported date/time corrections remain global in the app but do not enter subscribed calendars until verified/promoted into the source catalogue.
- This keeps subscribed calendars stable and change-driven.

## 2.2.3 — 2026-09-23

- Fixed the change-driven calendar publisher so it rebases cleanly before regenerating and committing `calendar.ics`.
- Confirmed the publisher now succeeds and commits only when the feed content differs.

## 2.2.2 — 2026-09-23

- Removed the hourly Pages schedule and stopped rebuilding the subscribed calendar on unrelated app deployments.
- Added a dedicated calendar publisher that runs only when calendar-source files change (or when explicitly dispatched) and commits `calendar.ics` only if its contents actually differ.
- Clarified Version Lab compatibility: historical front-end files are exact, but retired cloud endpoints, Firebase Auth users and Firestore rules are not time-travelled and may no longer work.
- Historical snapshots remain useful for inspecting original UI, static data, local-storage behaviour and the exact sync code that existed at each commit.

## 2.2.1 — 2026-09-23

- Calendar events with a known start but unknown finish now omit `DTEND` instead of assuming a two-hour duration.
- Applies to both the shared subscribed calendar and individual Add-to-calendar exports.
- Keeps date-only events as proper all-day events.

## 2.2.0 — 2026-09-23

- Added a **Version Lab** that deploys exact historical app trees from their original Git commits rather than reconstructing old versions from current files.
- Versions 1.0.0–1.3.0 are explicitly labelled reconstructed release milestones because semantic version files did not exist yet; their snapshots are still byte-for-byte files from the selected historical commits.
- Added a Versions link in the live app.
- Date/time corrections entered in a school are now **global reported data**, visible to every Openday visitor rather than private per-device overrides.
- Global reports use a stable pseudonymous contributor name derived from the memorable token, or from a persistent random device identity when no token is present.
- Personal visit notes remain private and continue to sync only with the private Openday state.
- Existing legacy private date/time overrides are migrated to global reported corrections without publishing their personal note text.
- The subscribable calendar now combines Senior and Primary catalogues, applies the latest global date/time reports, preserves stable event UIDs, and refreshes from Firestore on an hourly Pages build.
- Fixed date-only school events in the shared calendar so they publish as all-day events rather than artificial midnight/two-hour visits.
- The Openday Pages workflow now checks out full Git history so historical snapshots are generated from the actual commit trees.

## 2.1.0 — 2026-09-23

- Restored the memorable-token cross-device sync experience.
- A remembered token can be revealed on a device that still has it stored locally.
- New devices can enter the same token and sync without signing into Kk-syllabus.
- If the token is forgotten everywhere, the Kk-syllabus parent account can set a replacement token without deleting saved schools, notes, bookings or personal event corrections.
- The token itself is never stored in Firestore; a deliberately slowed derived capability ID is used instead.
- Token-based private state is merged with the existing `app_private_state/openday` owner state so either access route preserves the same data.
- Replacing a token first merges the prior token-backed state before rotating the capability.

## 2.0.3 — 2026-09-23

- Changed first sync after the authentication migration from winner-takes-all to a safe merge of device and cloud Openday state.
- Saved schools and booking-watch lists are unioned.
- Notes, booked flags and personal event overrides are merged without dropping keys that exist only on one side.
- The merged result is written back to the existing `kk-syllabus / app_private_state/openday` document only when it differs from the cloud copy.

## 2.0.2 — 2026-09-23

- Added recovery for the obsolete Openday Firebase sign-in used by earlier builds.
- If that legacy session is still cached in the browser, Openday now clears it and prompts for the existing Kk-syllabus parent sign-in.
- Existing Firestore private state is preserved; this fixes the appearance of saved schools/notes being missing after the shared-auth migration.

## 2.0.1 — 2026-09-23

- Completed the shared Kk-syllabus authentication migration.
- Removed the obsolete Openday-side Firestore publishing workflow and password-based publishing script.
- Moved scheduled catalogue publishing into the Kk-syllabus repository, using its existing authorised service-account secret.
- Catalogue publishing now hashes the Openday source bundle and skips Firestore writes when nothing changed.
- Updated documentation to remove the obsolete dedicated Openday Firebase user/token setup.

## 2.0.0 — 2026-09-23

- Removed the separate Openday token/password authentication design.
- Openday now reuses the existing parent Firebase Authentication session from the `kk-syllabus` project.
- The sync panel now explains the shared Kk-syllabus sign-in and links to Kk-syllabus when sign-in is needed.
- Personal Openday notes, bookings, saved schools and date/time overrides continue to sync to `app_private_state/openday` for the configured parent UID.
- Removed the Openday-repository Firestore publishing workflow that required the nonexistent `OPENDAY_FIREBASE_PASSWORD`.
- Automated public catalogue publishing is now owned by the Kk-syllabus repository, which already holds the authorised Firebase service-account secret.
- This is a major version because the authentication and cloud-publishing workflow changed fundamentally.

## 1.6.0 — 2026-09-23

- Added a private **My update** panel near the top of each school visit for personal date, start-time, end-time and note corrections.
- Personal corrections autosave locally and are included in Openday private cross-device state sync.
- Personal corrections affect list ordering, Upcoming counts, calendar placement and individual calendar export while leaving the school's source-verification status intact.
- Added Michaela Community School's reported Monday 28 September 2026 Open Evening start time of 17:00.
- Tagged Firebase usage explicitly as `kk-syllabus → (default) → openday` for the shared Apps Firebase usage monitor.
- Added listener-snapshot read accounting so Openday's observed Firestore reads/writes are broken down by operation in the monitor.

## 1.5.1 — 2026-09-23

- Fixed a JavaScript syntax error in the Firebase catalogue reader discovered by deployment validation.
- Primary-school alternative visit dates are now shown in the same Other visits panel.
- Kept the 1.5 feature set unchanged; this is a patch release.

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
