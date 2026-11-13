# Hourly sprint protocol (SalesMax v2, test copy only)
Roles run in order inside one sprint: Product Owner -> UX -> Dev -> QA. Demo packages at 12:00 and 17:00 ET. Release Manager acts only after Phil approves.
Hard rules:
- Work ONLY on the test copy: source in s3://fastsigns-nky-salesmax2-test-build-243345107810/source/, build+deploy ONLY with CodeBuild project fastsigns-nky-salesmax2-test (us-east-2). Never touch other Lambdas, stacks or the old SalesMax.
- CoreBridge: reads only. COREBRIDGE_WRITES stays off. Never change CoreBridge settings.
- Never enter passwords or sign in as Phil. No customer files on AWS (files live in Google Drive).
- Never resolve comment threads. Never message customers, vendors or staff.
- Licensee-facing text says SalesMax, never Claude.
- Lock: before starting, read docs/SPRINT-LOCK. If it exists and is under 55 minutes old, stop (previous sprint still running). Otherwise write it with the current time; delete it when done.
- If the build fails, fix it within the sprint or revert source to the last good copy (source-backup/<sprint>/ taken at sprint start). Never leave a failing build deployed.
Sprint steps:
1. PO: pick the top TODO item in docs/BACKLOG.md (or finish IN-PROGRESS). Write acceptance criteria into docs/SPRINT-LOG.md.
2. UX: read the matching canvas screen, list the exact labels/layout/rules to match (Title Case, wording, chips vs dropdowns, pop-ups).
3. Dev: back up source/ to source-backup/<sprint-id>/, change source/app + add tests in source/test, upload, start the CodeBuild build and wait for it.
4. QA: build must pass all tests; then smoke-test the Function URL page(s) (expect sign-in redirect for protected pages; unit tests cover rendering). Mark the item QA-PASSED or put back with notes.
5. Append a short entry to docs/SPRINT-LOG.md and docs/BUILD-LOG.md: item, what changed, tests count, package name, open issues.
