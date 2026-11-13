# SalesMax v2 release runbook (Release Manager)
Releases happen ONLY after Phil approves a demo in chat. Nothing in this file runs by itself.

## First release (no production copy exists yet)
1. Freeze: copy source/ to releases/<YYYY-MM-DD-HHMM>/source/ and the deployed package to releases/<...>/app.zip. Record the package name in docs/RELEASES.md.
2. Production stack: deploy docs/infra/prod-stack.DRAFT.yaml as stack fastsigns-nky-salesmax2-prod (new Cognito pool, table, secret, Lambda, Function URL). Owner email = Phil. Allowed emails = the team list Phil gives.
3. Data: production starts empty (no sample data). CoreBridge reads on; COREBRIDGE_WRITES stays off until Phil approves writes separately.
4. Deploy the frozen app.zip to fastsigns-nky-salesmax2-prod-web. Smoke test signed-out pages; Phil signs in (MFA) and checks Activities.
5. Tell Phil the production link and what changed.

## Later releases
1. Freeze as above. 2. Deploy the frozen package to the prod Lambda. 3. Smoke test. 4. Log in docs/RELEASES.md.

## Roll back
Redeploy the previous package listed in docs/RELEASES.md to the prod Lambda.

## Known gap before a real production release
Most screens run on sample data today (demo projects, tasks, boards). A production copy needs real data first:
- Projects/customers/orders from CoreBridge (import + nightly refresh; needs Phil's OK to use the shared ~500 calls/hour slot).
- A DATA_MODE setting (sample vs live) so production never shows sample records.
Until then, "release" means freezing the approved version as the baseline, not putting the team on it.
