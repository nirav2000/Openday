# Changelog

Openday uses Semantic Versioning (`MAJOR.MINOR.PATCH`).

- **MAJOR**: incompatible change to the app/data model or a fundamental workflow change.
- **MINOR**: backwards-compatible feature release.
- **PATCH**: backwards-compatible bug/data correction.

## 2.13.0 — 2026-09-29

- Reworked note merge differences into a **word/phrase-level diff**: changed, added and removed text is highlighted in the device and cloud versions.
- Added **per-difference merge decisions**, so each changed segment can independently keep the device wording or accept the cloud wording, while retaining whole-note device/cloud/combine options and manual editing.
- Rebuilt **Version Lab** around the richer Beyond100 pattern: human-readable release cards, a large working historical snapshot, phone/tablet/desktop preview widths, direct browsing of a historical version, Git-source audit links, and side-by-side working-version comparison.
- Added optional **synchronized scrolling** between Version Lab comparison frames and pair-specific comparison notes stored locally.
- Kept deployment-time **exact Git-tree snapshots** as the source for historical previews rather than replacing them with reconstructed current files.
- Added **metric drill-downs** to the Performance side-by-side comparison. Clicking a GCSE metric opens subjects as the rows and compares Grade 9 %, Grades 9–7 % and entry counts across selected schools.
- Clicking the A-level, whole-school context or attendance metrics opens corresponding detailed comparison tables.
- Cleaned numeric presentation so values that are effectively whole numbers no longer show insignificant decimal points, while meaningful small decimals such as Progress 8 remain available.

## 2.12.0 — 2026-09-29

- Repaired **Version Lab** so release history remains visible even when the deployment-time snapshot builder has not injected its static cards; the release registry is now committed separately and the Pages build still generates exact Git snapshots.
- Added **2025/26 school-published exam results** where verified and newer than the current DfE school-level release, with source provenance kept alongside the DfE record.
- Corrected **St Paul's School**: the old 0% Grade 9 display came from a materially incomplete DfE independent-school extract (only 10 GCSE entries in the subject file), so verified school-published results now take priority.
- Corrected **Haberdashers' Boys' School** using the school's full published GCSE table, including Mathematics and the complete 2024/25 subject totals, rather than the partial DfE subject extract.
- Added a **Year** selector so the performance table can switch between latest available and individual academic years.
- Made the **whole column heading clickable** for sorting, added hover explanations for every heading, and made headings draggable to change column order.
- Clarified that **Grade 9 # / Grades 9–7 # are grade awards, not pupils**.
- Added count ↔ percentage switching to GCSE and A-level subject-grade detail and improved grade-chip alignment.
- Moved the desktop school hover card beside the row rather than underneath the school name and suppress it while the row is expanded.
- Tightened expanded performance cards so short sections such as attendance no longer stretch to match taller neighbouring cards.
- Suppressed incomplete DfE KS4 headline measures for independent schools when a fuller verified school-published result set is available.

## 2.11.0 — 2026-09-29

- Made every visible Performance table heading directly clickable for sorting, with ascending/descending arrows and sensible defaults (higher-first for attainment; lower-first for absence).
- Added multi-select checkboxes and a **Compare side by side** tray so any group of schools can be compared using the currently visible/customised metrics.
- Added a private, cross-device **Shortlist / Rejected / No status** school workflow, separate from the existing qualitative My view labels.
- Added **Shortlist** and **Rejected** filters on both the main Open days view and the Performance page, plus status badges on school cards and comparison rows.
- Shortlist/reject state is included in the same transactional memorable-token sync and three-way merge as other private state.
- Made the header **Notes** and **Sync** controls structural HTML controls rather than relying only on dynamically created buttons, and hardened event binding so they remain clickable after app updates.
- Unresolved note merge differences now visibly badge the Notes control and highlight the affected note cards.
- Added a note-conflict editor showing device and cloud versions side by side, with **Use device**, **Use cloud**, **Combine both**, and manual-edit options before saving the resolved note back through normal cloud sync.
- Kept unresolved non-note merge differences preserved for audit/review.

## 2.10.0 — 2026-09-29

- Changed the default travel/search origin for **Primary** schools to **UB5 6QX** while keeping the Senior/secondary origin unchanged.
- Expanded the primary catalogue beyond Harrow borough boundaries using the London school-location register, adding open Reception-capable primary/all-through schools within a **5-mile straight-line radius** of UB5 6QX.
- Preserved the existing manually researched primary records, dates, notes and stable IDs when the new radius data matched the same school.
- Added postcode, URN and straight-line distance metadata to matched nearby schools.
- Added persistent Primary distance filters for **≤1, ≤2, ≤3 and ≤5 miles**, plus **Any distance** to reveal legacy/researched schools outside the radius.
- The default Primary radius is **≤5 miles** and is remembered per device.
- Primary cards now show distance from UB5 6QX; the school detail page explains that the filter uses straight-line distance and retains live driving/public-transport links for actual journeys.
- Primary summary counts now respect the selected radius.
- The expanded catalogue currently contains **175 primary records**, of which **159 are within 5 miles**, **70 within 3 miles**, **29 within 2 miles** and **7 within 1 mile** of UB5 6QX.
- Added an idempotent `scripts/expand-primary-radius.py` builder so the radius catalogue can be regenerated without duplicating schools.

## 2.9.0 — 2026-09-29

- Added **Grade 9 % / # awards** and **Grades 9–7 % / # awards** as default headline columns in the Performance comparison, with sorting by Grade 9 or 9–7 percentage.
- Derived the top-grade measures from the official DfE 2024/25 subject-grade dataset. The denominator uses total exam entries; Combined Science counts as two GCSE awards. Suppressed top-grade cells are not estimated, so the displayed percentage can be a small underestimate.
- Reworked subject-level grade counts into highest-to-lowest, colour-coded grade chips for faster scanning.
- Combined Science double awards now display explicitly as paired outcomes such as **9–8**, **8–8**, **7–6**, with a dashed chip and an explanation rather than looking like an unrelated grading scale.
- Split generic multi-language subject records by their DfE discount code/group so separate languages no longer overwrite one another's entry totals.
- Added a **Columns** customiser: show/hide metrics, drag to reorder on desktop, or use left/right controls on touch devices. The chosen layout is remembered on that device and can be reset to the default.
- Corrected the DfE mapping for **Queen Elizabeth's School, Barnet** to current URN **136290** and made pinned URNs authoritative so similarly named schools cannot contaminate the record.
- Deepened primary-school research by searching official admissions, school-tour, prospective-parent and Reception 2027 pages rather than relying only on homepage/open-day wording.
- Added or expanded verified visit information for West Lodge, Earlsmead, Pinner Park, Vaughan, St John Fisher, Cedars Manor, Roxeth, Stanburn, St John's C of E, Weald Rise, Priestmead, Pinner Wood, Whitchurch, St Teresa's and St Jerome, plus visit-by-arrangement/current visit information for Aylward, Avanti House, Elmgrove, Kenmore Park Junior, St Anselm's, Welldon Park and Whitefriars.
- Where official pages conflict or do not publish an exact session time/date, Openday now records that uncertainty rather than inventing a value.
- Regenerated the subscribed calendar after the newly verified primary dates.

## 2.8.0 — 2026-09-28

- Added whole-school **FSM eligibility** and **EAL** from the January 2026 DfE school census.
- Added whole-school **SEN support**, **EHCP** and combined SEN percentages from the 2025/26 DfE school-level SEN census.
- Added accredited full-year **overall absence**, **unauthorised absence**, **persistent absence** and **severe absence** history through 2024/25 for schools covered by the DfE school-level absence series.
- Added sortable comparison columns for FSM, EAL, SEN support, EHCP, absence and persistent absence.
- Added **Has context data** and **Has attendance data** filters.
- Expanded each school's detail panel with a whole-school context card and up to five years of attendance history.
- Added direct source links to the official DfE pupil-characteristics, SEN and absence datasets.
- Context data is explicitly labelled as descriptive pupil-population information rather than a school-quality score.
- Independent schools retain pupil-characteristics/SEN context where available, but the DfE school-level absence series does not cover independent schools.

## 2.7.1 — 2026-09-28

- Split Ark Academy's official open events into four separate verified entries: Monday 28, Tuesday 29 and Wednesday 30 September open mornings at 09:00, plus Thursday 1 October open evening at 17:00.
- Linked each Ark event directly to the school's open-events form.
- Expanded Performance filters with **Booked**, **Visit again** and **Not for us** alongside Visited, Saved, Liked and Want to try for.
- Added GCSE cohort size and A-level student count to the year-by-year expanded performance tables.
- Refreshed the official DfE performance dataset after the Ark event-ID change so personal visited/saved/booked filtering continues to map correctly.

## 2.7.0 — 2026-09-28

- Added a dedicated **Performance** page for comparing the senior schools tracked by Openday.
- The comparison currently matches all 39 tracked school groups to official DfE performance records, using stable URNs where school names differ.
- Added official DfE GCSE / KS4 history for 2022/23–2024/25, including Attainment 8, English & maths grade 5+, EBacc measures, cohort size and the latest available Progress 8.
- Added official DfE A-level history for 2021/22–2024/25, including average point score, average grade, value added, best-three A-level measures, AAB and retention where published.
- Added KS4 first-language / EAL breakdowns where available. This is labelled **KS4 EAL** rather than whole-school EAL to avoid implying a census-wide percentage.
- Added 2024/25 GCSE and A-level subject-by-subject grade-count detail. Desktop row hover shows a compact subject preview; click/tap expands the full history and subject tables.
- Added performance filters for **Visited**, Saved, Liked, Want to try for, state, grammar, independent, GCSE-data and A-level-data schools, plus metric sorting and search.
- Added an explicit **I visited this school** control to school details and sync it across devices with the memorable-token private state.
- Added a scheduled official-data refresh workflow using DfE Explore Education Statistics CSVs, with manual refresh and automatic refresh when the school catalogue/data builder changes.
- Added caveats for independent schools: DfE KS4 measures can omit qualifications that do not count in performance tables, so zero or unusually low headline measures are not silently presented as equivalent to state-school GCSE measures.
- Added transparent five-school-year GCSE display slots: 2020/21 is marked as pandemic/non-comparable; 2021/22 remains an explicit legacy-data gap rather than being backfilled with a different series; 2022/23–2024/25 use the current official institution series.
- Confirmed **Ark Academy Open Evening — Thursday 1 October 2026 at 17:00** from the school's official admissions page, marked it verified in the catalogue and updated the subscribed calendar.

## 2.6.1 — 2026-09-27

- Locally edited notes are now tracked as **pending cloud save** across page reloads on that device.
- The main page shows a compact green **notes waiting for cloud save** bar with a **Save all to cloud** button whenever one or more notes are pending.
- The header cloud/sync dot gently pulses green while note changes are waiting to be uploaded.
- Pressing **Save note to cloud** from any school now saves the entire private state, so every pending note on that device is included in the same transactional read → merge → write.
- Any other successful deliberate private-state write (for example Save school / Booked / Booking watch) also carries all pending notes and clears their pending state after the cloud confirms the write.
- The pending-note indicator is cleared only after a confirmed cloud write, including token recovery/creation writes.

## 2.6.0 — 2026-09-26

- **Upcoming** is now the default filter when Openday opens.
- Upcoming is day-based rather than time-based: a school remains in Upcoming for the whole of its event date, even after the stated start/end time has passed.
- Added a dedicated **TBC / no date** filter for schools without a current visit date.
- The TBC view opens with a summary card showing how many schools need dates, how many have a previous-year date for planning, and how many have no recent date stored.
- TBC school cards stay collapsed until **Show school cards** is pressed, keeping the list compact.
- Personal/global date overrides use the same whole-day Upcoming logic, so corrected dates behave consistently.

## 2.5.1 — 2026-09-25

- Every deliberate private-state cloud save now runs as a Firestore transaction: read latest cloud state → three-way merge against the device's last known cloud baseline → write the merged state.
- Changes made on different schools/devices merge automatically even when the second device has not manually refreshed first.
- Saved-school and booking-watch membership are merged per school, so additions and removals can both survive stale-device saves instead of using a simple union.
- If both devices changed the same note/booked flag/school decision/legacy amendment since their common baseline, the current save remains active while both versions are retained in `mergeConflicts` for review.
- Firestore can retry the transaction automatically if another device writes during the save, avoiding the normal read-then-write race.
- The Sync panel now explains this multi-device behaviour.

## 2.5.0 — 2026-09-24

- Added a **Notes** view that shows every note stored locally on the current device in one place, without reading Firebase.
- The Notes view also shows the pre-token-connect device backup and any preserved local/cloud merge differences.
- Device/cloud merging now records both sides whenever the same note, booked flag, school decision or legacy event amendment differs; the non-selected value is retained in `mergeConflicts` rather than discarded.
- Connecting a memorable token continues to create a complete local pre-merge backup before modifying local state.
- Rebuilt Version Lab as a static deployment-time index. It no longer depends on Safari fetching/parsing `manifest.json` in the browser, while each snapshot still comes from the exact original Git commit tree.
- Added the missing 2.2.1–2.4.1 releases to Version Lab.

## 2.4.1 — 2026-09-24

- Sync status now distinguishes **Token synced** from **Recovery** access.
- The Sync panel shows how many notes, saved schools and booked flags are held locally on the current device.
- A recovery-capable device can expose **Set new memorable token** even if it does not know the old token.
- Connecting a token backs up the device's current local state first, then merges unique local data with the cloud state and performs one recovery merge write when needed.
- This is intended to protect older iPhone/iPad-local notes while re-establishing one memorable token across devices.

## 2.4.0 — 2026-09-24

- Added a private **My view** selector to each school: Want to visit again, Liked, Want to try for, Not for us, or Undecided.
- The selection is stored with the same private Openday state as notes/bookings and follows the memorable-token sync model.
- Choosing a view is a deliberate action, so it performs at most one cloud write rather than background/autosave writes.

## 2.3.0 — 2026-09-24

- Removed realtime Firestore listeners from Openday private state and global date/time reports.
- School catalogue data continues to load from the deployed JSON files once at app launch; it is not read school-by-school from Firestore.
- Memorable-token private state now performs one cloud document read when the app connects, then no further reads until manual refresh/reconnect.
- Global date/time reports now perform one collection load at launch and no background refresh. A **Refresh cloud data** control is available in Sync.
- Global reports use one document per school instead of accumulating a new document for every correction.
- Visit-note typing now saves to local storage only. Cloud sync happens only when **Save note to cloud** is pressed.
- Closing the school panel with a locally changed but unsynced note now warns before closing. Browser reload/close also requests a standard unsaved-changes warning where the browser supports it.
- Saved-school, booked and booking-watch toggles remain deliberate one-action/one-cloud-write operations.
- Added spacing below the note sync/status message.

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
