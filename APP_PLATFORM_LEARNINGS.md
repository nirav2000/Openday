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

### Memorable-token personal mode

Openday is currently a one-user app, so the UI should not show an email/password login form or require each device to be individually approved.

The no-Functions pattern is:

```text
memorable token entered in Openday
        -> Firebase Email/Password Authentication
           using a fixed internal Openday email
        -> authenticated Firebase session persists on the device
        -> Firestore rules permit only that dedicated account
        -> app_private_state/openday
```

The memorable token is therefore the password for one dedicated Firebase Authentication user. The internal email is fixed in the app and not shown to the user.

Benefits:
- no Firebase Functions;
- no per-device approval;
- no visible email/login flow;
- the same token works on iPhone, iPad and Mac;
- Firebase handles authenticated session persistence;
- Firestore is not anonymously writable.

Trade-off: the memorable token is a real password. It should be a long passphrase (ideally four or more unrelated words plus digits), not a short PIN.

Reusable adapter: `plugins/firebase-token-sync.js`.

## 3. One-time Firebase setup for token sync

In Firebase Console:

1. Enable **Authentication -> Sign-in method -> Email/Password**.
2. Under **Authentication -> Users**, create one user with email:
   `openday-sync@nirav2000.github.io`
3. Set its password to the memorable token you want to type into Openday.
4. Publish Firestore rules containing the dedicated Openday rule from `nirav2000/Kk-syllabus/firestore.rules`.

No Cloud Function, Secret Manager value or server deployment is required for Openday sync.

The relevant Firestore rule permits only the authenticated Openday account to read/create/update `app_private_state/openday`; deletes remain disabled.

## 4. Do not use a token baked into public JavaScript

A literal secret inside GitHub Pages source is not secret. Anybody can inspect it.

A fixed internal email is acceptable because it is an identifier, not a credential. The memorable token/password must be supplied by the user and handled by Firebase Authentication.

Likewise, do not make a public collection writable merely because there is currently one user.

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
  firebase-token-sync.js  no-visible-login personal sync adapter
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

Openday release **1.4.0** removes the proposed Cloud Function sync gateway. The app signs directly into Firebase Authentication with the hidden dedicated email and user-entered memorable token, then uses Firestore under restrictive rules.

Current user-state flow:

```text
edit note / save school / mark booked
        -> localStorage immediately
        -> autosave debounce
        -> Firebase authenticated Firestore sync when connected
```

The app remains usable locally if Firebase is unavailable.
