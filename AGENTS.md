# Openday implementation instructions

Read `docs/GITHUB_ACCESS_RUNBOOK.md` before concluding GitHub access is unavailable. The connected GitHub tools have worked when ordinary git/raw HTTP access did not. Do not use disabled tool names copied from old chats.

- Main branch only. Preserve concurrent work with an expected head SHA and non-forced ref update.
- Publish related changes atomically, in useful increments. A prepared Git tree is not a published commit. Verify the branch after updating it.
- Increment app SemVer for user-visible changes; align version.json, root index/cache markers and the service-worker cache version. Documentation-only commits do not require an app-version bump.
- Retain the shared release gate. Tests must be isolated from production Firebase. Follow Pages through verify-live, not merely a successful build.
- Preserve historical school data and private user state. Never replace earlier exam years with new results.
- Public research must not include child names, private visit notes, household details, credentials or capability tokens.
- Michaela research lives under schools/michaela/. Every restored staff record and correction must appear in the rendered view and CSV export. Missing dates/qualifications remain explicitly unknown.
- Store resumable research and implementation checkpoints in the repository, not only in conversation notes. Distinguish publication completion from unresolved research.
