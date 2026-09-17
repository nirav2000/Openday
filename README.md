# School Open Days

A mobile-first, installable tracker for secondary-school open days and visits. School/event content lives in `data/schools.json`; personal saves, booking status and notes save locally first.

Current app version: **1.4.0**. Openday follows Semantic Versioning; see [`version.json`](version.json) and [`CHANGELOG.md`](CHANGELOG.md).

## Features

- filters for date status and school type
- list and calendar views
- separate school-information and booking links
- favourites, booked status and visit notes
- notes autosave while typing
- iPhone-friendly individual `.ics` downloads with a one-day reminder
- subscribable `calendar.ics` feed
- optional no-visible-login cross-device sync using a memorable token with Firebase Authentication + Firestore directly
- no Firebase Function required for Openday sync
- offline-capable progressive web app

## Reusable app modules

Reusable integration code lives in `plugins/`:

- `app-platform.js` — plugin registry/event bus
- `autosave.js` — debounced autosave helper
- `firebase-auth.js` — conventional account-auth adapter for apps that need users/roles
- `firebase-token-sync.js` — memorable-token Firebase Auth + Firestore sync without a visible login form
- `developer-notes.js` — common developer-note data model
- `version-lab.js` — release decisions and development briefs

See [`APP_PLATFORM_LEARNINGS.md`](APP_PLATFORM_LEARNINGS.md) for the architecture and one-time Firebase setup.

## One-time sync setup

In Firebase Console for `kk-syllabus`:

1. Enable **Authentication → Sign-in method → Email/Password**.
2. Create the user `openday-sync@nirav2000.github.io`.
3. Use your memorable token as that user's password.
4. Publish the Firestore rules from `nirav2000/Kk-syllabus/firestore.rules`.
5. In Openday, tap **Sync** and enter the same memorable token.

The app hides the internal email and only asks for the token. Firebase persists the authenticated session on each device, so the token is not required every time.

Dates can change. Each listing exposes its verification status and links back to the school.

Public content uses an anonymous Year-5 (2026/27) planning profile. Do not commit child names, current schools, private visit notes, household details, memorable sync tokens, passwords or private capability URLs. Harrow is a search origin, not a stored home address.
