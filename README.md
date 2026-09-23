# School Open Days

A mobile-first, installable tracker for secondary-school open days and visits. School/event content lives in `data/schools.json`; personal saves, booking status and notes save locally first.

Current app version: **2.1.0**. Openday follows Semantic Versioning; see [`version.json`](version.json) and [`CHANGELOG.md`](CHANGELOG.md).

## Features

- filters for date status and school type
- list and calendar views
- separate school-information and booking links
- favourites, booked status and visit notes
- notes autosave while typing
- iPhone-friendly individual `.ics` downloads with a one-day reminder
- subscribable `calendar.ics` feed
- cross-device sync using a memorable token, with the Kk-syllabus parent account retained as the recovery/reset route
- no separate Openday Firebase project or Firebase user required
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

The normal cross-device experience is the **memorable token**:

1. Enter the same memorable token on another device.
2. Openday derives a private capability document ID locally and syncs the private Openday state.
3. The plaintext token is stored only on devices where you choose to remember it; Firestore stores only the derived capability ID.

If a device still remembers an older token, **Show saved token** can reveal it. If the token has been forgotten on every device, it cannot be reconstructed from Firestore. Sign in to Kk-syllabus with the configured parent account and use **Set / replace token**. Openday merges the existing owner state and any reachable token-backed state before rotating the token, so resetting the token does not delete the saved schools, notes, bookings or personal corrections.

The Kk-syllabus parent account remains an owner/recovery route. Automated public school-catalogue publishing also lives in the Kk-syllabus repository because it already holds the authorised `FIREBASE_SERVICE_ACCOUNT_KK_SYLLABUS` GitHub Actions secret.

Dates can change. Each listing exposes its verification status and links back to the school.

Public content uses an anonymous Year-5 (2026/27) planning profile. Do not commit child names, current schools, private visit notes, household details, passwords, service-account credentials or private capability URLs. Harrow is a search origin, not a stored home address.
