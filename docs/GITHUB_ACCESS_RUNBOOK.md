# GitHub access and safe publishing runbook

Last checked: 21 October 2026. Repository: nirav2000/Openday.

## Working route

The connected GitHub tools work even when container git/raw HTTP cannot resolve or authenticate. This is normal authorised repository access, not a permission bypass. Discover current schemas with api_tool.list_resources(paths=["GitHub"], query=...). Call the returned GitHub tools directly. Old functions.exec, tools.mcp__GitHub__... and ALL_TOOLS examples are not portable; do not call disabled interfaces.

## Read exact state

Use GitHub.fetch with https://api.github.com/repos/nirav2000/Openday/branches/main or /git/ref/heads/main. Record head and tree SHAs. Read files with fetch_file, preferably pinned to that commit. Read version.json, validation.config.json and .github/workflows/pages.yml. Do not reconstruct large existing files from memory. A 404 for a new path is not evidence that repository access is unavailable.

## Atomic main-only write

1. Prepare and test related files; preserve unrelated content.
2. create_tree: use current base_tree_sha and changed entries only (path, mode 100644, type blob, UTF-8 content).
3. create_commit: new tree_sha, parent_sha equal to the observed main head.
4. update_ref: branch_name main, new commit SHA, expected_sha equal to observed head, force false.
5. Re-fetch main and confirm the intended commit. A tree object alone is NOT published. An unattached commit is NOT deployed.

On lease rejection read the new head, inspect concurrent changes and rebuild on it; never force over another chat. Isolated one-file updates can use create_file/update_file, with the current blob SHA. Never perform competing writes to one path in parallel.

## Local testing when downloads fail

Try the supported connector route first. For local bytes, fetch_workflow_run_artifacts and download_workflow_artifact can supply a mounted ZIP for a known commit. Inspect the actual /mnt/data path. Pages ZIPs commonly contain artifact.tar; reject traversal/symlink entries during extraction. Record the run's head SHA and reconcile later commits before editing. Artifacts may omit .github files: fetch those separately. Generated Version Lab snapshots are not source files.

Do not treat old artifact contents as today's main. Do not request, print or store access tokens merely because unauthenticated HTTP failed.

## Push workflow verification

The allowed collection URL is https://api.github.com/repos/nirav2000/Openday/actions/runs?head_sha=<COMMIT>&per_page=10 . fetch_commit_workflow_runs currently filters to pull-request events; an empty result does not mean a main-push run is missing. Some workflow-specific URLs are rejected by the generic fetch allow-list; use the repository run collection and dedicated job tools.

Inspect exact runs with fetch_workflow_run_jobs, fetch_workflow_job_steps and fetch_workflow_job_logs. Do not repeatedly dump full logs when job steps suffice. Use response-resource search for long output.

## Completion criteria

Keep syntax/data checks, code quality, browser smoke tests and shared release safeguards enabled. Test desktop and mobile with synthetic storage, blocking live Firebase writes. Version/cache markers must agree. Follow validation, release-safeguards, deploy AND verify-live. Confirm exact deployed version and actual card -> hub -> profile/navigation journeys. Artifact upload or a committed file is not proof of live success.

Michaela 2.26.0 exposed a test-readiness race: #content existed while its fetch was still loading. Waiting for the destination's rendered panel fixed it without removing assertions. Use meaningful readiness selectors, not arbitrary sleeps.

## Durable handoff

Keep research facts, URLs, observation dates and uncertainty in committed data. Record changed files, release, commit and verification results separately from unanswered research questions. Commit small coherent increments so prepared work does not remain stranded in conversation notes. No credentials or private family details in this runbook.
