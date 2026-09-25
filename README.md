# School Open Days

A mobile-first, installable tracker for secondary-school open days and visits. School/event content lives in `data/schools.json`; personal saves, booking status and notes save locally first.

Current app version: **2.5.1**. Openday follows Semantic Versioning; see [`version.json`](version.json) and [`CHANGELOG.md`](CHANGELOG.md).

## Features

- filters for date status and school type
- list and calendar views
- separate school-information and booking links
- favourites, booked status and visit notes
- notes autosave while typing
- iPhone-friendly individual `.ics` downloads with a one-day reminder
- subscribable `calendar.ics` feed
- cross-device sync using a memorable token; Firebase owner/service credentials are used only for administrative recovery and publishing
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

If a device still remembers an older token, **Show saved token** can reveal it. If the token has been forgotten on every device, it cannot be reconstructed from Firestore. Administrative recovery can rotate the capability without deleting the saved schools, notes or bookings.

The Kk-syllabus parent account remains an owner/recovery route. Automated public school-catalogue publishing also lives in the Kk-syllabus repository because it already holds the authorised `FIREBASE_SERVICE_ACCOUNT_KK_SYLLABUS` GitHub Actions secret.

Dates can change. Each listing exposes its verification status and links back to the school.

Public content uses an anonymous Year-5 (2026/27) planning profile. Do not commit child names, current schools, private visit notes, household details, passwords, service-account credentials or private capability URLs. Harrow is a search origin, not a stored home address.


## Version Lab

The deployed app includes **Version Lab** at `/Openday/version-lab/`. Each historical release opens an exact snapshot created with `git archive <commit>` during deployment. The old app files are therefore taken from the historical commit tree itself, not rebuilt from today's files or today's `version.json`. The historical front end is exact, but external cloud services are not versioned with it; retired sync endpoints/auth users/rules may therefore no longer function.

Versions 1.0.0–1.3.0 pre-date semantic version metadata; the version labels for those milestones are reconstructed, but the files shown are the original files from the selected commits.

## Global date/time reports

School date and time corrections entered through Openday are public reported data. They are stored separately from private notes and are visible to all visitors. Each report has a stable made-up contributor label. The same memorable token produces the same contributor identity across devices; a device without a token receives a persistent local pseudonym.

Personal visit notes, saved schools and booking state remain private.

The public calendar feed is no longer rebuilt on a timer or on unrelated app deployments. A dedicated workflow regenerates `calendar.ics` only when calendar-source files change and commits the feed only when its contents actually differ. Verified catalogue changes therefore update existing subscribers without needless hourly rewrites. Public reported corrections remain visible in the app immediately, but they enter the subscribed feed only after they are verified/promoted into the committed calendar-source data. The feed has no forced hourly refresh hint.


## Firestore usage model

Openday is deliberately local-first and low-read/write:

- school catalogues are deployed JSON and are loaded once when the app opens;
- a remembered-token session reads its single private state document once when connecting;
- global reported date/time corrections are fetched once when the app opens;
- there are no realtime Firestore listeners;
- **Refresh cloud data** performs an explicit read without making a change;
- visit notes save locally while typing and reach the cloud only when **Save note to cloud** is pressed;
- every deliberate private-state cloud save performs one transactional read of the latest private state and one write of the merged result (with automatic transaction retries only if another write races it);
- discrete controls such as Save school / Booked / Booking watch use that same read → three-way merge → write path.

This keeps typing, scrolling, filtering and browsing out of Firestore billing.


## Local notes and lossless merge recovery

The header **Notes** control displays every note currently stored in that browser's `openDayState` without a Firebase read. It also shows the automatic pre-token-connect backup created before a device joins a memorable-token profile.

Cross-device saves use a **three-way merge** against the device's last known cloud baseline. This means a stale iPhone can save a new note without first refreshing and still retain a newer unrelated iPad change. Saved-school and booking-watch membership are merged per school, so both additions and removals propagate correctly. If both devices independently changed the same note, booked flag, school decision or legacy event amendment, the current deliberate save remains active and **both competing values are retained** in `mergeConflicts` for review in the Notes view. The merge runs inside a Firestore transaction, so Firestore retries it if another device changes the same cloud document during the save. Connecting a token still takes a full local-state backup first.
