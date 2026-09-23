# School Open Days

A mobile-first, installable tracker for secondary-school open days and visits. School/event content lives in `data/schools.json`; personal saves, booking status and notes save locally first.

Current app version: **2.0.1**. Openday follows Semantic Versioning; see [`version.json`](version.json) and [`CHANGELOG.md`](CHANGELOG.md).

## Features

- filters for date status and school type
- list and calendar views
- separate school-information and booking links
- favourites, booked status and visit notes
- notes autosave while typing
- iPhone-friendly individual `.ics` downloads with a one-day reminder
- subscribable `calendar.ics` feed
- optional cross-device sync using the existing Kk-syllabus parent Firebase Authentication session + Firestore
- no separate Openday Firebase project, Firebase user, token or Firebase Function required
- offline-capable progressive web app

## Reusable app modules

Reusable integration code lives in `plugins/`:

- `app-platform.js` — plugin registry/event bus
- `autosave.js` — debounced autosave helper
- `firebase-auth.js` — conventional account-auth adapter for apps that need users/roles
- `firebase-token-sync.js` — shared Kk-syllabus parent-session + Firestore sync
- `developer-notes.js` — common developer-note data model
- `version-lab.js` — release decisions and development briefs

See [`APP_PLATFORM_LEARNINGS.md`](APP_PLATFORM_LEARNINGS.md) for the architecture and one-time Firebase setup.

## Cloud sync

Openday uses the existing `kk-syllabus` Firebase project and its `(default)` Firestore database.

For browser/private-state sync:

1. Sign in to Kk-syllabus with the configured parent account in the same browser.
2. Open Openday and tap **Sync** if it has not connected automatically.
3. Openday reuses the persisted Kk-syllabus Firebase Authentication session and stores private Openday state at `app_private_state/openday`.

For automated school-catalogue publishing, the Kk-syllabus repository owns the scheduled workflow because it already has the authorised `FIREBASE_SERVICE_ACCOUNT_KK_SYLLABUS` GitHub Actions secret. Openday does not need or store a separate Firebase password.

Dates can change. Each listing exposes its verification status and links back to the school.

Public content uses an anonymous Year-5 (2026/27) planning profile. Do not commit child names, current schools, private visit notes, household details, passwords, service-account credentials or private capability URLs. Harrow is a search origin, not a stored home address.
