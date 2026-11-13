# SalesMax v2 build log

## 2026-11-10 (day 1) - slice 0: test copy + Projects board
- Test copy stack: fastsigns-nky-salesmax2-test (Phil confirmed it is his; created 3:40 AM from another of his Claude chats).
- Stack update: added read access to CoreBridge connector responses (foundation bucket, corebridge/api/v1/responses/*) + COREBRIDGE_EVIDENCE_BUCKET env.
- Source lives in s3://fastsigns-nky-salesmax2-test-build-243345107810/source/ (app/, test/). Build = CodeBuild project fastsigns-nky-salesmax2-test (runs node --test, zips app/, deploys).
- Deployed packages/app-c860df79c85225fe.zip. 9/9 unit tests pass.
- Live checks: sign-in redirect OK; demo board 9 cards; project page OK; cross-site POST blocked (403); live refresh pulled 23 estimates from CoreBridge.
- CoreBridge reads tested: 12/13 pass. getOrderStatement (PDF) returns 403 - ask CoreBridge to enable ExDocument access for the API user.
- Shared CoreBridge slot: ~500 connector calls/hour from existing automations; SalesMax must cache + use webhooks.
- Phil must finish first sign-in: temp password email from Cognito (sent 3:40 AM) + authenticator app (MFA required).

## Next
- Slice 1 (core loop): item detail + statuses from CoreBridge on project page; site visit -> project; board moves (test copy only, no CoreBridge writes yet); send proof; customer approval page (demo).

## 2026-11-10 — Slice 1a: Design and Production boards
- New pages: /boards/design and /boards/production, each with Board or List view and a Columns menu (choices saved per board in a cookie).
- Steps follow the reconciled workflow (13 steps + On hold). Moves only allow the allowed next steps; holds need a reason and return to where they came from.
- Every move shows the CoreBridge product status SalesMax would push (writes stay off in the test copy) and is logged; "Reset demo" puts the sample data back.
- Project pages list their items with a Move menu and the order status CoreBridge would show (WIP until every item is Built).
- Added 5 in-progress demo projects (demo-10 to demo-14) and 16 demo items.
- Tests: 17 pass. Build app-51cfe97e5db5c0f9 deployed. Live smoke test: boards (both views), move, reset, project page all OK.

## 2026-11-12 - continuous build, items #1-#18 (see SPRINT-LOG.md)
- New modules: activities, standing, custrecord, portalx, settings, simpleboards, account, ops, setup. New pages: /activities, /customers, /customers/:id, /admin, /boards/permits, /boards/purchasing, /reports/reconciliation, /setup/workflow, /me/prefs.
- Test hooks: globalThis.__SMX_FAKE_DB and __SMX_TEST_KEY (unset in Lambda) let the build test every signed-in page.
- 93 tests pass. Latest package app-4554e837d443fa7b.zip. CoreBridge writes still off.

## 2026-11-12 - continuous build, items #19-#60 (see SPRINT-LOG.md)
- New modules: perf, custlog (in custrecord), drafts, create, wfbuilder, field, misc, extras2, projectx, roleview, migration, proofx, billing. 
- New pages: /performance, /team, /reports/past-due(.csv), /projects/new, /admin/workflow, /field, /search, /feedback, /me, /me/digest, /log, /customers.csv, /admin/migration, /admin/reset-demo, /billing, /help.
- Location switch: data.mjs LOCATION is now set per request (index.mjs resets it to nky first, then the user's choice). CoreBridge live refresh is NKY only.
- Lint + a11y tests run over 29 signed-in pages on every build. Customer order page tested end to end from a signed link.
- Sign-in now lands on Activities. 128 tests. Latest package app-cb7c7821746248fe.zip. CoreBridge writes still off.
- Visual-QA helper: test/snapshot.mjs (run with a CodeBuild buildspec override; writes HTML to scratch/snaps/, does not deploy).
