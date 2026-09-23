# Reusable app platform learnings

This document pulls together patterns from LearnLatin, Beyond 100, Kk-syllabus, Snag and Openday so login, sync, notes, versioning and developer feedback are not rebuilt differently in every app.

## 1. Local first, cloud second

Every user action should save locally immediately. Cloud sync is replication, not a prerequisite for using the app.

```text
user edit
  -> local state immediately
  -> debounce 300-600 ms
  -> cloud sync in background
  -> quiet status: Saving / Synced / Local only
```

Do not require a Save button for ordinary notes unless there is a real draft/publish distinction.

## 2. Authentication and sync modes should be pluggable

### Normal account mode

Use Firebase Authentication for multi-user apps, roles, parent/child accounts or sensitive learner data. Firebase browser configuration is public; protection comes from Authentication and Firestore Security Rules.

Reusable adapter: `plugins/firebase-auth.js`.

### Memorable-token personal mode with owner recovery

Openday uses a memorable token as the normal cross-device access method while keeping the existing Kk-syllabus parent account as an owner/recovery route.

```text
memorable token
        -> PBKDF2-derived 256-bit capability document ID
        -> exact Firestore document read/write
        -> collection listing forbidden
        -> Openday private state
```

The plaintext token is never stored in Firestore. A browser that remembers the token can reveal it locally. If every device has forgotten it, the parent can sign in through Kk-syllabus and rotate to a new memorable token without losing the existing private state.

Reusable adapter: `plugins/firebase-token-sync.js`.

## 3. Automated catalogue publishing

The school catalogue is public app data, but Openday also mirrors it into the `kk-syllabus` Firestore document so connected clients can receive current catalogue data.

The scheduled publisher lives in the **Kk-syllabus repository**, not the Openday repository, because Kk-syllabus already holds the authorised GitHub Actions secret `FIREBASE_SERVICE_ACCOUNT_KK_SYLLABUS`.

The publisher:
- fetches the latest Openday senior, primary and enhancement JSON plus `version.json`;
- hashes the source bundle;
- skips the Firestore write when nothing changed;
- writes only the catalogue fields when the hash changes, preserving private Openday state.

## 4. Do not put credentials in public JavaScript

Firebase web configuration is public project metadata, not a secret. Service-account credentials, parent passwords and private capability URLs must never be committed to a public repository.

## 5. Autosave is a reusable capability

`plugins/autosave.js` provides debounced input saving.

Recommended UX:
- save locally while typing;
- debounce network writes;
- save immediately on blur/navigation;
- display a quiet `Saved automatically`, `Saved & synced`, or `Saved locally` message;
- never make the user wonder whether closing a panel loses a note.

Openday visit notes follow this pattern.

## 6. Developer notes should be contextual

A useful developer note should include:
- stable note ID;
- app ID;
- semantic app version;
- page/route;
- optional anchor/element ID;
- selected text if relevant;
- note text;
- status (`open`, `implemented`, `archived`);
- review flag;
- created/updated timestamps.

Reusable base: `plugins/developer-notes.js`.

Separate storage from UI so the same note contract can be reused by different apps.

Automated processing should never blindly implement every note. A review bridge can sanitize private data, classify bounded changes, create an issue/development brief, run tests, commit a coherent change, and link the implemented app version.

## 7. Semantic versioning and Version Lab are different things

Git commits, semantic releases and Version Lab serve different purposes.

### Semantic app version

Openday now uses `MAJOR.MINOR.PATCH`:

- **MAJOR**: incompatible app/data/workflow change;
- **MINOR**: backwards-compatible feature release;
- **PATCH**: backwards-compatible bug or data correction.

The canonical source is `version.json`.

For every release, keep these aligned:
- `version.json`;
- visible app version;
- cache-busting query values;
- service-worker cache name;
- `CHANGELOG.md`.

The deployment workflow checks that the value is valid SemVer and that `index.html` matches it.

Do **not** treat arbitrary asset counters such as `app.js?v=6` as application versions. That was the earlier mistake.

### Version Lab

Version Lab is for human comparison checkpoints, not every technical commit. A release may contain separable areas such as card density, calendar workflow, note autosave, sync and admissions layout. Each area can be KEEP / REVERT / REWORK / UNSURE.

Reusable base: `plugins/version-lab.js`.

## 8. Stable plug-in contract

`plugins/app-platform.js` is the minimal registry/event bus.

Current modules:

```text
plugins/
  app-platform.js         registry/event bus
  autosave.js             debounced autosave helper
  firebase-auth.js        conventional Firebase account adapter
  firebase-token-sync.js  shared Kk-syllabus parent-session sync adapter
  developer-notes.js      common developer-note contract
  version-lab.js          release/decision/development-brief contract
```

An app should depend on the smallest interface possible. A notes UI should call `sync.schedule()` rather than know how Firestore works.

Once the same module has survived use in at least two apps, extract it to a dedicated `app-kit` repository and version it independently.

## 9. Calendar lessons from Openday

- Visible dates should include weekdays (`Thu 17 Sep`).
- List and month views should operate on the same event data.
- `[hidden]` must override layout CSS or switching views can appear to do nothing.
- A subscribable calendar must be a stable public `.ics` URL.
- Apple Calendar hand-off should use `webcal://...` with the HTTPS feed exposed as a copy/paste fallback.
- Individual event actions should say `📅 Add to calendar`; subscribing to the whole feed is a separate action.

## 10. Privacy rule for public repositories

Do not commit:
- child names;
- child identity plus current school;
- private household notes;
- memorable sync tokens/passwords;
- service-account keys;
- private review capability links.

Public planning context can remain anonymous, e.g. `Year 5 / September 2028 entry`.

## 11. Current Openday setup

Openday release **2.1.0** restores memorable-token sync while continuing to use the existing Kk-syllabus Firebase project. There is no separate Openday Firebase project or Firebase user; the Kk-syllabus parent account is the recovery/reset authority.

Current user-state flow:

```text
edit note / save school / mark booked / add personal date-time correction
        -> localStorage immediately
        -> autosave debounce
        -> owner-authenticated kk-syllabus Firestore sync when connected
```

The app remains usable locally if Firebase is unavailable.


### Exact Git-backed Version Lab

Do not emulate older versions by loading historical metadata into the current app. For trustworthy regression work, build a deploy-time snapshot from the original Git tree:

```text
release label -> pinned commit SHA -> git archive -> deployed read-only historical tree
```

This means the JavaScript, CSS, HTML, data and service-worker files being inspected are the files that existed at that commit. If semantic version metadata did not yet exist, label the milestone as reconstructed rather than fabricating a historical version file.

### Global reports vs private state

Keep public factual corrections separate from private user state:

- **global reported data:** school date/time corrections, pseudonymous contributor, timestamp
- **private data:** visit notes, saved schools, booked flags and personal planning

A memorable token produces a stable pseudonymous contributor identity across devices. Without a token, use a persistent random device seed. Never publish the user's private note text when promoting an old local date/time override into the global report stream.

The calendar builder should consume both the authoritative catalogue and the latest public reports, use stable UIDs, and rebuild on a schedule so existing subscribers receive corrected dates without resubscribing.
