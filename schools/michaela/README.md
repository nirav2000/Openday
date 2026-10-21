# Michaela evidence hub - research edition 2.0.0

Published in Openday 2.26.0. Independent research, not the official school site.

## Entry points

`index.html` is linked from Michaela's school detail card. `staff.html` shows all 85 recovered entries. Separate pages cover results, curriculum, concerns, books, website history, admissions/alternatives and home learning.

## Data contract and corrections

- `staff.json` preserves the original 85-row restored checkpoint and 55-source index. Rows map to the named `columns` array. It is a public-source reconstruction, not 85 distinct qualified teachers or a current payroll census. The original working claim of 117 sources is not an assertion that 117 full source records were preserved in this file.
- `staff-corrections.json` overlays fields by stable person ID and adds sources. Every profile, count, search and CSV export uses the merged record. Keep corrections explicit; do not silently delete historical names.
- `research.json` holds dated, attributed research sections. Text is escaped when rendered; external pages are linked, not embedded.
- The results page reads the existing `../../data/performance.json` without modifying it. It distinguishes exam years, double-award science and suppressed grade cells. It does not use the misleading legacy `grade9to7AllGCSE` field.

## Evidence rules

A first/last mention is not an employment start/end date. Unknown is not unqualified or unemployed. Academic degrees, teaching training and awards are different. Same-name candidates are not silently merged. Twelve surname-only entries plus fellow Mr Rees give thirteen without a recovered first name. Two possible duplicate pairs remain flagged. Pages covering senior leaders or sixth-form staff are not whole-school headcounts.

Archived biographies were recovered from the original research extracts; intermittent archive re-fetch failures are not disguised as fresh verification. Subsequent employer checks have their own dates. The full 2026/27 timetable, complete subject schemes and the 2028 admission policy remain explicitly unverified. Books link only to authorised editions, catalogue records or labelled previews.

## Validation and release

Main only. Root version and cache markers move together. Existing school datasets and private user state are untouched. `validation.config.json` adds all hub pages to the shared gate and desktop/mobile journeys for 85 entries, search, reset, fellows, profile deep links, school-card integration and navigation. Local isolated fixture rendering passed at 1365 and 390 pixels; actual network navigation is checked by CI and the live verification job.

Future source updates must preserve a dated URL/capture, source type, changed fields and uncertainty. Website history is curated; no automatic third-party monitoring is claimed. No commercial books or full third-party websites are redistributed.
