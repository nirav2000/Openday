# Decision-usefulness audit implementation

22 October 2026. Starting release 2.26.1.

## Increment 1 - reusable, tested data foundation

Added pure grade calculations, expandable staff schema, canonical subjects and CSV helpers in core.js, UI helpers in ui.js, and five passing Node regression tests. Original staff and all root data remain unchanged. This checkpoint does not yet change the live page; the integrated view is the next atomic release.

## Acceptance checklist for the integrated release

A01-A02: qualify missing-grade rates beside headlines; surface dated pupil/SEND/absence and sixth-form context.
A03-A04: target-year admission steps and a selected-school comparison with route, eligibility, cost/funding, journey and same-year results.
A05-A07: dated current/later/unknown employment evidence, compact first-screen search and canonical subject filters.
A08-A09: topic-appropriate facts; preserve baseline IDs while allowing additional sourced records.
A10-A11: printable selected/filtered profiles, persistent expansion and shareable filter URLs.
A12-A13: field-level evidence where available, explicit record-level gaps, private follow-up notes and school/question deep links.
A14-A15: ordinary-week/subject evidence grid, source-specific unknowns and substantive before/after research changes.
A16-A17: concise decision-first answers, methodology underneath, actionable source-mapped home lessons.

All changes must pass desktop/mobile tests, existing release safeguards and live verification. Research gaps are not filled with guesses; implementation completion must be reported separately from unavailable facts. No private child/household details are added to public files.
