# Reusable app platform learnings

This document pulls together the patterns that have worked best across the small web apps in this account, especially LearnLatin, Beyond 100, Kk-syllabus and Openday. The aim is to stop rebuilding login, sync, notes and versioning differently in every app.

## 1. Local first, cloud second

Every user action should save locally immediately. Cloud sync is a replication layer, not a prerequisite for using the app.

Why:
- the UI stays fast;
- temporary network failure does not lose notes;
- GitHub Pages apps remain useful offline;
- a cloud outage does not block the app.

Recommended flow:

```text
user edit
  -> local state immediately
  -> autosave debounce (300-600 ms)
  -> cloud sync in background
  -> visible small status: Saving / Synced / Local only
```

Never require a separate Save button for ordinary notes unless the user needs an explicit draft/publish distinction.

## 2. Authentication modes should be pluggable

Different apps need different identity models. Do not hard-wire one login scheme into app logic.

### Account mode

Use Firebase Authentication for apps with multiple users, parents/children, roles, private learner data or anything that needs a durable identity. Firebase browser config is public configuration; security comes from Auth plus Firestore rules, not from hiding the API key.

Reusable adapter: `plugins/firebase-auth.js`.

### Shared-token mode

For a personal single-user app where login friction is undesirable, use a memorable shared token checked by a server-side endpoint.

Rules:
- never put the expected token in GitHub Pages JavaScript;
- store the expected token as a backend secret;
- transmit it only over HTTPS;
- use a long memorable phrase, preferably four or more unrelated words plus digits;
- store the entered token locally on each browser;
- optionally pass it to another device in a URL fragment (`#sync=...`) because the fragment is not sent in the HTTP request;
- remove the fragment immediately after capture;
- provide a manual token-entry screen in case the setup link is unavailable.

Reusable adapter: `plugins/shared-token-sync.js`.

Openday uses this model.

## 3. Openday shared-token backend

The backend implementation lives in the shared Firebase project:

- repository: `nirav2000/Kk-syllabus`
- function: `functions/openday-sync.js`
- exported as: `opendaySync`
- Firestore document: `app_private_state/openday`

The browser sends `X-OpenDay-Token`. The function compares it with the Firebase secret `OPENDAY_SYNC_TOKEN` and uses the Admin SDK to read/write the private state document.

The token itself must never be committed.

One-time setup/deploy:

```bash
npx firebase-tools functions:secrets:set OPENDAY_SYNC_TOKEN --project kk-syllabus
npx firebase-tools deploy --only functions:opendaySync --project kk-syllabus
```

Choose a memorable token when prompted, e.g. a pattern like four unrelated words plus two digits. Do not use the example phrase from the app UI as the real token.

After deployment, Openday can accept the token under **Sync**, store it locally and sync favourites, booked state, watch state and visit notes without a visible account login.

## 4. Firestore rules remain strict

Do not make Firestore anonymously writable simply because an app has only one current user. A public GitHub Pages app can be inspected and its Firebase config copied.

Existing owner-only learner/progress rules should stay owner-only. The shared-token function is the narrow write gateway for Openday; it sanitises the allowed state shape and caps note/state size before using the Admin SDK.

This separation is useful:

```text
public app
   -> narrow authenticated function
      -> private Firestore document
```

rather than:

```text
public app
   -> anonymously writable Firestore
```

## 5. Autosave is a reusable capability

`plugins/autosave.js` provides debounced input saving with status callbacks.

Recommended UX:
- save locally on typing;
- debounce network writes;
- save immediately on blur/navigation;
- show a quiet status such as `Saved automatically`;
- never make users wonder whether closing a panel loses their note.

Openday visit notes use this pattern.

## 6. Developer notes should be contextual

LearnLatin and Beyond 100 showed that a free-floating feedback box is less useful than a note attached to context.

A useful developer note should carry:
- stable note ID;
- app ID;
- app version;
- page/route;
- optional anchor/element ID;
- selected text if relevant;
- note text;
- status (`open`, `implemented`, `archived`);
- whether it should enter a review queue;
- created/updated timestamps.

Reusable base: `plugins/developer-notes.js`.

The plugin deliberately separates note storage from the UI so each app can present notes differently while preserving a common data contract.

### Automated developer-note processing

A safe automated workflow should never blindly execute every note. A review bridge can:
1. fetch notes explicitly marked for review;
2. sanitise private/user data;
3. classify a note as bounded/safe or requiring human review;
4. create a GitHub issue or development brief;
5. run tests;
6. commit a small coherent change;
7. update the note with the implementation version.

The LearnLatin GitHub feedback workflow is a useful pattern, but it needs an API key/billing if AI is invoked automatically. The Beyond 100 review-feed pattern is useful for exposing only deliberately selected review notes.

## 7. Version Lab: human checkpoints, not every commit

Git history should contain every technical change. A Version Lab should contain only meaningful human-comparison checkpoints.

From Beyond 100, the important rule is **selective rollback**.

Each named release should contain separable change areas, for example:
- card density;
- calendar workflow;
- note autosave;
- cloud sync;
- admissions data layout.

For each area the reviewer can mark:
- KEEP
- REVERT
- REWORK
- UNSURE

Do not roll back a whole app because one feature became worse.

Reusable base: `plugins/version-lab.js`.

## 8. Stable plug-in contract

`plugins/app-platform.js` is the minimal registry/event bus. Reusable capabilities register by name rather than assuming a particular app.

Current modules:

```text
plugins/
  app-platform.js        registry/event bus
  autosave.js            debounced local/UI autosave helper
  firebase-auth.js       optional Firebase account-auth adapter
  shared-token-sync.js   no-login personal sync adapter
  developer-notes.js     common note data contract
  version-lab.js         release/decision/development-brief data contract
```

An app should depend on the smallest possible interface. For example, a notes UI should call a generic `sync.schedule()` rather than import Firestore directly.

## 9. Suggested future extraction

Once two or more apps use the same module successfully, move the modules into a dedicated repository, for example:

```text
nirav2000/app-kit
  /core
  /autosave
  /auth-firebase
  /sync-shared-token
  /developer-notes
  /version-lab
  /calendar
```

Each module can then be versioned independently and pulled into an app by a pinned release, submodule, package/CDN build or a small copy/update script.

Do not prematurely publish an npm package while the interfaces are still changing quickly. Stabilise the contracts in two real apps first.

## 10. Calendar lessons from Openday

- A visible date should include the weekday (`Thu 17 Sep`) because availability is often weekday-driven.
- A list view and month view solve different problems; both should operate on the same event data.
- `hidden` must win over layout CSS (`[hidden]{display:none!important}`), otherwise a view can appear selected but not actually replace the list.
- A subscribable feed must be a real public `.ics` file, not only a build artifact that can disappear depending on the Pages deployment path.
- For Apple Calendar, use `webcal://host/path/calendar.ics` for the hand-off and always expose the HTTPS feed URL as a copy/paste fallback.
- Individual-event buttons should say `📅 Add to calendar`; subscription is a different action and should stay labelled separately.

## 11. Privacy rule for public repositories

Public app source/data should contain only what is necessary to run the app.

Do not commit:
- child names;
- current school plus child identity;
- household/private notes;
- memorable sync tokens;
- passwords/service-account keys;
- private review capability URLs.

Public planning context can be anonymous, e.g. `Year 5 / September 2028 entry`.

## 12. Openday next steps

1. Deploy `opendaySync` after setting `OPENDAY_SYNC_TOKEN` privately.
2. Enter the same memorable token on each device, or use the private setup link.
3. Verify cross-device note/favourite/booked sync.
4. If the plug-in contracts survive use in Openday plus another app, extract them to a dedicated app-kit repository.
5. Add a real Version Lab UI only after the next meaningful Openday layout iteration, rather than versioning every small fix.
