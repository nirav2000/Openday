# School-wide results audit and comparability policy

Scope: every school in `data/schools.json`, not only Hampton. Audit senior schools for GCSE/IGCSE, A-level, English, mathematics and subject-level grade distributions where relevant. Primary-only schools should be marked not applicable rather than missing.

## Non-destructive records
- Preserve all existing examination results and historical DfE extracts. Append each school/year/qualification/source/publication revision as a separate dated record.
- Never substitute a school-published GCSE grade 9–7 percentage for Attainment 8 or infer an Attainment 8 score from grade distributions.
- Distinguish DfE accountability measures from school-published exam outcomes, especially independent schools using IGCSEs.
- Store subject name, awarding qualification (GCSE or IGCSE), year, grade counts/percentages, cohort/entry denominator, original URL, publication date and verification status.
- For English distinguish Language and Literature; for Maths distinguish Mathematics and Further Mathematics. Do not conflate entries with pupils.
- Treat unavailable, not applicable, suppressed and unverified as separate states. Never display missing as zero.
- Record 2024, 2025 and 2026 outcomes independently, where available, with source links.

## Display and comparison
- Label DfE Attainment 8 for independent schools as not comparable when school-published results or IGCSE entries make coverage incomplete. Retain the DfE figure in historical/source detail.
- Make source and exam year visible on each displayed result; avoid ranking schools on metrics with materially different coverage.
- Show English Language, English Literature, Mathematics, grade 9%, grade 9–8%, grade 9–7%, subject-level distributions and A-level outcomes only where sourced.
- Record selection/admissions context separately from attainment; avoid implying that headline results measure value added.

## Completion criteria
1. Enumerate every school ID in the catalogue and record per-school audit status.
2. Retrieve official DfE releases and school-published results; check all source URLs and denominators.
3. Preserve existing snapshots and add missing dated records without overwriting.
4. Verify filtering, sorting, expanded details and side-by-side comparisons on mobile and desktop.
5. Increment app version, run tests and verify deployed GitHub Pages output before marking complete.

This document defines the audit requirements; it does not claim that the school-by-school research or data import has been completed.
