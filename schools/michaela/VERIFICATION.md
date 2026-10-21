# Verification notes - 21 October 2026

Openday 2.26.0, research edition 2.0.0.

The first deployment passed static validation, isolated smoke tests, code quality, release-gate regressions and pre-deployment desktop/mobile journeys. The deployment package was checked against the locally tested files: all 85 entries, 56 entries with academic details, 30 with training details and 61 sources. Existing root school datasets were byte-for-byte unchanged.

Live verification confirmed the exact version, all 85 profiles, search/reset/fellow filters, the deep-linked Physics profile, and navigation from Michaela's school card on desktop and mobile. The research navigation assertion initially ran before the asynchronous data load completed: the captured failure screenshot already contained the expected 16 April 2024 text. The test now waits for the destination page's rendered research panel before checking the text. Assertions and the full release gate remain enabled. This is a test-readiness correction, not an application/data change, so the app release version remains 2.26.0.

See the latest GitHub Actions run for final live-verification status; do not treat this note as a substitute for a passed run.
