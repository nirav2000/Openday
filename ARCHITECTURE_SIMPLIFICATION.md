# OpenDay simplification plan

This is a staged cleanup plan, not a request to refactor everything at once. Reliability takes priority over reducing file count.

## Why simplify

OpenDay has grown from a static open-day tracker into a stateful application with:

- multiple events per school
- local and cross-device private state
- state migrations and conflict preservation
- live Firestore sync
- notes/autosave
- performance and assessment datasets
- public/personal overrides
- calendar generation/subscription
- service-worker caching
- shared monitoring and Version Lab integrations

The recent event-ID -> school-ID change showed that identity, storage, sync and UI are too tightly coupled. Small UI requests can currently become data-model changes.

## Safety prerequisite

Do not begin structural cleanup until the shared release gate remains green for the current behaviour.

Every cleanup step must preserve the same fixtures and invariants, especially:

1. no loss/corruption of existing private state;
2. school-level fields remain shared across multiple event cards;
3. visit booking remains event-specific;
4. notes and merge conflicts remain lossless;
5. sync becomes quiescent after convergence;
6. no unexpected increase in Firestore operations or app payload.

## Target architecture

### 1. Explicit domain identities

Use two first-class concepts everywhere:

```text
School
  schoolId
  name
  area
  admissions / assessment / performance
  school-level private state

VisitEvent
  eventId
  schoolId
  date/time
  booking URL
  booked flag
```

Do not infer school identity from event IDs once all existing data has migrated.

### 2. One state schema with a version

Move private state to a schema such as:

```json
{
  "schemaVersion": 3,
  "schools": {
    "school:ark-academy:wembley": {
      "saved": true,
      "visited": true,
      "applicationStatus": "shortlist",
      "views": ["liked", "try-for"],
      "note": "..."
    }
  },
  "events": {
    "ark-evening": {
      "booked": true
    }
  }
}
```

Keep migrations as pure functions:

```text
v1 -> v2 -> v3
```

Each migration receives data and returns data. It must not read/write Firestore or manipulate the DOM.

### 3. Separate local store from sync

UI should call a small state-store interface:

```text
store.getSchool(id)
store.updateSchool(id, patch)
store.getEvent(id)
store.updateEvent(id, patch)
```

The store owns local persistence.

Sync should receive snapshots from the store and replicate them. It should not know about Ark Academy, card markup, filters or modal state.

### 4. Shared sync engine

The generic three-way merge, quiescence protection, retries, instrumentation and connectivity logic should eventually move from the OpenDay-local plugin into the shared Apps data/sync library.

OpenDay should supply:

- schema
- migration functions
- merge policy per field
- backend/document configuration

This reduces the number of apps independently implementing sync.

### 5. Split app.js by responsibility

Suggested modules:

```text
domain/
  schools.js
  visits.js

state/
  schema.js
  migrations.js
  store.js

ui/
  list.js
  calendar.js
  school-detail.js
  filters.js

services/
  calendar.js
  travel.js
  assessments.js

app.js
  composition/bootstrap only
```

Do not split files merely for aesthetics; create boundaries only where tests can exercise them independently.

### 6. Reduce integrations.js patching

`integrations.js` currently augments several behaviours after the main UI is created. Over time, move stable behaviour into explicit interfaces rather than DOM patching/monkey-patching.

The shared modules should provide capabilities; OpenDay should call them directly.

### 7. Remove compatibility paths deliberately

Legacy event-scoped school state should not remain forever.

After:

- all known devices have had a migration window;
- cloud state is canonical;
- backups are retained;
- release fixtures prove migration;

remove old event-ID fallback logic in a dedicated release.

### 8. Operational budgets

Treat resource budgets as architecture constraints.

Track over releases:

- static payload bytes;
- local HTTP request count;
- Firestore reads/writes/listener snapshots;
- sync writes per deliberate user action;
- quiescence transitions;
- App Monitor active/background sessions;
- load-test p50/p95/p99 and error rate on staging.

A refactor that makes code prettier but materially increases database/network usage is not automatically an improvement.

## Proposed cleanup sequence

1. Freeze current behaviour in release-gate fixtures.
2. Introduce explicit stable school IDs in catalogue data.
3. Add `schemaVersion` and pure migrations.
4. Move local state access behind one store.
5. Make UI consume the store instead of raw `state`.
6. Extract generic sync/merge logic to Apps shared library.
7. Split rendering modules.
8. Remove legacy compatibility code.
9. Re-baseline payload/database/load budgets.
10. Only then consider larger UX/data redesigns.

Each step should be a separate small release. Do not combine a migration, sync rewrite and UI redesign in the same release.
