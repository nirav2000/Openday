# School Open Days

A mobile-first, installable tracker for secondary-school open days and visits. School/event content lives in `data/schools.json`; personal saves, booking status and notes save locally first.

Current app version: **2.23.0**. Openday follows Semantic Versioning; see [`version.json`](version.json) and [`CHANGELOG.md`](CHANGELOG.md).

## Features

- **Upcoming** is the default filter and keeps today's events visible until the day ends
- **TBC / no date** has its own compact summary view with expandable school cards

- filters for date status and school type
- list and calendar views
- wider admissions-event coverage: open evenings, school-in-action visits, tours and scholarship information events
- scholarship / means-tested bursary database covering all tracked independent senior schools, with award value, published and planning music standards, award availability, bursary compatibility, deadlines and side-by-side comparison
- reusable school-visit question bank with private custom questions and school-specific answer notes
- shared Notifications v1.1 in-app inbox and preferences; browser push remains setup-required until a trusted Openday server transport is added
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
- one realtime listener is used only for the single active private-state capability document while cross-device sync is connected; listener creation and each server-delivered snapshot are attributed to the shared Firebase Usage Monitor;
- **Refresh cloud data** performs an explicit read without making a change;
- visit notes save locally while typing; changed notes are tracked persistently as pending, shown on the main page, and **any deliberate private-state cloud save sends all pending notes together**;
- every deliberate private-state cloud save performs one transactional read of the latest private state and one write of the merged result (with automatic transaction retries only if another write races it);
- discrete controls such as Save school / Booked / Booking watch use that same read → three-way merge → write path.

This keeps typing, scrolling, filtering and browsing out of Firestore billing.


For the staged cleanup/refactor plan, see [`ARCHITECTURE_SIMPLIFICATION.md`](ARCHITECTURE_SIMPLIFICATION.md).

## Release safety gate

OpenDay is the reference consumer of the shared `nirav2000/Apps/validation/` release gate. The reusable engine lives in the Apps repository; OpenDay keeps only its own scenario/config in `validation.config.json` and `validation/openday-release-gate.mjs`.

A candidate release must pass:

- recursive JavaScript/JSON/Python validation;
- browser smoke tests for the main, Performance and Assessments pages;
- legacy-state migration/data-preservation checks;
- the four-event Ark Academy school-identity regression fixture;
- multi-select My View persistence;
- sync convergence and **quiescence**: repeated equivalent snapshots must produce no further state changes or scheduled writes;
- a one-change convergence test: one real remote change applies once, then repeated identical snapshots are no-ops;
- request/payload budgets and zero live Firebase activity in the isolated test;
- release-gate report generation.

Future application changes should use the automated `validation/preflight` route. The exact candidate SHA is promoted to `main` only after the shared gate passes; `main` then runs the gate again before GitHub Pages deployment.

Release tests use isolated browser storage and blocked external networking. They must never use or mutate production Firestore/user data.

## Runtime monitoring and load

OpenDay already uses the shared Apps monitoring layers:

- **App Monitor** records app/session/device activity and distinguishes foreground from background tabs.
- **Firebase Usage Monitor** attributes Firestore reads, writes, deletes and listener activity by app/project/device. OpenDay's transaction reads/writes, live-listener creation and server-delivered listener snapshots are instrumented.
- **Release Gate metrics** record local request count, local payload bytes, attempted external requests, state transitions and test-time Firebase operations per CI run.
- **Shared bounded load-test harness** lives in `Apps/validation/load-test.mjs` / `safe-load-test.yml`. It is staging/local-first and refuses an unapproved production target.

The load-test harness should be used against a preview/staging backend before deliberate concurrency testing. Production private data is not a load-test fixture.

## Local notes and lossless merge recovery

The header **Notes** control displays every note currently stored in that browser's `openDayState` without a Firebase read. It also shows the automatic pre-token-connect backup created before a device joins a memorable-token profile.

Cross-device saves use a **three-way merge** against the device's last known cloud baseline. This means a stale iPhone can save a new note without first refreshing and still retain a newer unrelated iPad change. Saved-school and booking-watch membership are merged per school, so both additions and removals propagate correctly. If both devices independently changed the same note, booked flag, school decision or legacy event amendment, the current deliberate save remains active and **both competing values are retained** in `mergeConflicts` for review in the Notes view. The merge runs inside a Firestore transaction, so Firestore retries it if another device changes the same cloud document during the save. Connecting a token still takes a full local-state backup first.


## Pending note sync

When a visit note changes, its school ID is added to a small device-local pending list. This list survives reloads but causes no Firestore traffic. While any notes are pending, the main page shows a green pending cloud save bar and the sync indicator gently pulses. **Save all to cloud** performs the same transactional private-state save as the school-level save action. Because the private state contains all notes, one successful write saves every pending note on that device, not just the currently open school. The pending list is cleared only after Openday receives a confirmed cloud-write success event.


## Shared release validation

Openday is the reference consumer of the shared Apps validator at `nirav2000/Apps/validation/`. `validation.config.json` defines its dataset and browser-smoke expectations. The validator recursively parses JavaScript/JSON, compiles Python, checks local HTML asset references and release-version consistency, then opens the main, Performance and Assessments pages in Playwright and requires real rendered data.

For candidate releases, use `validation/preflight` first. Promote the exact commit that passed validation to `main`; the Pages workflow repeats the shared validation and will not deploy unless it passes. This keeps testing separate from production while avoiding a second, untested rebuild.

## 11+ / 13+ assessment formats and paper library

Openday keeps admissions-test information in `data/assessments.json`, separate from examination-performance data. Cards and Performance use the same record. `assessments.html` explains formats, timings, subjects and curriculum coverage; `data/assessment-resources.json` indexes official familiarisation, school sample papers and labelled third-party resources. The library is link-and-metadata first rather than copying copyrighted/commercial papers without clear redistribution rights.

## School-level versus visit-level personal state

Multiple open-day records can represent different dates for the same school. Openday therefore stores opinion/relationship fields against a canonical school key rather than an event ID. Notes, Saved, Visited, Shortlist/Rejected, Booking Watch and My View are school-level; Booked remains visit-level because a family may book one date but not another. Legacy event-scoped state is migrated automatically and conflicting legacy notes are preserved by combining them with event/date labels.

## Academic performance comparison

Openday now includes `performance.html`, linked from the main header and from each senior-school detail panel. The dashboard groups multiple open-day events for the same school into one academic record and supports filters for visited, saved, liked, want-to-try-for, school type and data availability.

The generated `data/performance.json` is built from official DfE Explore Education Statistics institution-level datasets. It currently includes GCSE / KS4 performance for 2022/23–2024/25, A-level performance for 2021/22–2024/25, KS4 first-language / EAL breakdowns where published, and 2024/25 subject grade counts. The data builder matches schools by official name and, where necessary, stable URN overrides.

The GCSE five-year view deliberately shows transparent gaps rather than mixing non-comparable series: 2020/21 is marked as pandemic/non-comparable, 2021/22 is left as a legacy-data gap, and 2022/23–2024/25 use the current DfE institution series. Progress 8 is not available for 2024/25 because the cohort lacks the required KS2 baseline.

For independent schools, DfE performance-table measures can exclude qualifications that do not count in the accountability tables. The app therefore flags this limitation and avoids presenting a zero English/maths headline measure as a normal like-for-like result.

`.github/workflows/refresh-performance.yml` refreshes the generated performance dataset weekly, can be dispatched manually, and also runs when the tracked-school catalogue or data-builder changes.


## Whole-school context in Performance

The Performance page combines attainment with descriptive context from official DfE sources. The January 2026 school census supplies whole-school FSM eligibility and EAL; the 2025/26 SEN school-level dataset supplies SEN support and EHCP counts; and the accredited full-year absence series supplies overall, unauthorised, persistent and severe absence through 2024/25. These context measures are not treated as school-quality scores. Independent schools can have census/SEN context but are outside the DfE school-level absence series.


## Grade 9 and configurable performance columns

The Performance page puts **Grade 9** and **Grades 9–7** at the front of the default comparison layout. Both percentage and number of grade awards are available. These are derived from the DfE 2024/25 subject-level grade counts; total exam entries form the denominator, Combined Science paired grades count as two awards, and suppressed top-grade cells are not estimated.

Subject grade counts are rendered highest-first as coloured grade chips. Combined Science pairs such as `9–8` are labelled as double-award outcomes. Generic language records are kept separate by DfE discount code/group rather than being collapsed into a misleading total.

The **Columns** control lets each device show, hide and reorder comparison metrics. Desktop users can drag; touch users can use move controls. The preference is kept in local storage under `openday.performance.columns.v1` and **Reset default** restores the standard Grade 9 / 9–7-first layout.

## Primary open-event discovery

Primary-school research now searches each tracked school's official admissions/tours pages using terms including school tours, open days, open mornings, prospective parents and Reception 2027. Fixed dates and recurring tour patterns are added only when supported by the school's own site. If the official pages conflict or publish a visit option without a date, Openday keeps the conflict/unknown visible rather than guessing.


## Primary catalogue centred on UB5 6QX

Primary-school discovery now uses **UB5 6QX** as its default origin. The catalogue combines the previously researched primary records with open, Reception-capable London primary/all-through schools within a five-mile straight-line radius, even when those schools sit in neighbouring boroughs.

Distance is calculated from the postcode centroid using OS National Grid coordinates and is intended for fast filtering, not route planning. The Primary view exposes ≤1, ≤2, ≤3 and ≤5 mile filters plus Any distance; the default is ≤5 miles and the preference is stored on the device. Live Google Maps driving and public-transport links remain the appropriate source for real journey distances/times.

The generated radius fields include school URN, postcode, `distanceMiles` and `distanceFromPostcode`. The builder at `scripts/expand-primary-radius.py` preserves manually researched records and their stable IDs, and de-duplicates by school URN/website when merging location data.


## Decision workflow and side-by-side comparison

The Performance table supports direct click-to-sort headings, including toggleable ascending/descending order. Rows can be selected with checkboxes and opened in a side-by-side comparison matrix that follows the user's current visible-column layout.

A separate operational school status now sits alongside the existing qualitative **My view** labels: **Shortlist**, **Rejected**, or no status. These states appear as filters and badges in both the main app and Performance page and are part of private memorable-token sync.

## Note merge-difference resolution

When two devices independently change the same school note, the conflict is still preserved rather than overwritten. The Notes control now shows a visible conflict count. Affected notes are highlighted, and **Review & merge notes** opens both device/cloud versions with one-click device/cloud selection, Combine both, or manual editing. Saving marks that specific merge conflict resolved and syncs the chosen merged text through the normal transactional save path.
