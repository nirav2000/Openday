# Michaela decision hub - edition 3.0.0

Openday 2.27.0. Independent research, not the official school website.

Thirteen question-led pages cover overview, admission, results/context, daily life, staff, comparison, curriculum, home learning, concerns, books, changes/sources, private follow-up and audit coverage.

The original staff.json, correction history and root data are retained. core.js merges claims and statuses into the same records used by search, department view, printing and CSV. Baseline IDs are preserved while permitting sourced additions. Current listings, recent dated observations, documented departures and unknown status are separate.

Results derive known-award rates and conservative bounds from the retained grade cells. Combined Science is double-weighted. Fully unpublished subject grades are not displayed as observed zero. Comparisons use a chosen exam year and distinguish school-published and DfE coverage; independent-school Attainment 8 is not ranked against state schools.

The planner uses only openday.michaela.private-planner.v1 in browser storage. It does not send notes to GitHub or Firebase. Existing Openday question answers retain their keys and sync settings; links focus a specific question without changing its answer.

Run node --test tests/michaela-core.test.cjs and node tests/michaela-browser.mjs . (Playwright module path configurable). All shared validation and release gates remain. GitHub Pages repeats the dedicated browser checks against live after verifying the release version.

Some exact job dates, current subject schemes, weekly timetable, subgroup outcomes and future admissions policy remain unverified. These are research gaps with explicit next questions, not invented facts. Read ../../docs/GITHUB_ACCESS_RUNBOOK.md for the proven authenticated publishing route. A tree is not a commit or deployment.
