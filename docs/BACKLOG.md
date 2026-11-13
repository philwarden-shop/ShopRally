# SalesMax v2 backlog (Product Owner owns this file)
Status values: TODO, IN-PROGRESS, QA-PASSED (waiting for demo), DEMOED (waiting for Phil), APPROVED, RELEASED, BLOCKED.
Design source of truth: canvas https://claude.ai/code/artifact/caa6b7d9-ad0d-47a9-b43e-dfc7e8e72760 (read a screen with the Artifact tool, action read, path <Screen>.dc.html).
Plan doc (rules + decisions): Claude Doc 8042eb73-b968-4027-9b03-4aa4350c5cc4. UX review doc: 9219873d-3f0b-4baa-a017-bde411d3b466.
Each item = one small vertical slice that fits one hourly sprint. Split anything bigger.

| # | Item | Screen(s) | Status |
|---|------|-----------|--------|
| 1 | Activities: To Do groups (Missing Next Step, Past Due, Due Today, Due Soon, Due Later) + colored inbox chips right-aligned on the To Do title | Main | QA-PASSED |
| 2 | Today's Scorecard tiles for sales (Tasks Done, Emails Answered, Customers Engaged, Quotes Sent, Orders Moved Forward from SalesMax stage history only) + celebration preview | Main | QA-PASSED |
| 3 | Project record: compact header, Where This Stands + Customer Flags full-width under the timeline | ProjectRecord | QA-PASSED |
| 4 | Customer record: tab count badges, Account tab last, Shipping Accounts (Express/Ground/Freight), Classification (Home location, Account status, Marketing emails) | CustomerRecord | QA-PASSED |
| 5 | Customer order page on phones (Status/Proofs/Items tabs, 'best on computer or tablet' note, Email Me the Link) | CustomerPortalPhone | QA-PASSED |
| 6 | Customer page: + Add Comment; Approve New Price above the Admin threshold (default $25), blocked for staff | CustomerPortal | QA-PASSED |
| 7 | Admin: 6 tabs (Company, Sales, Pricing, Work, Customer Page & Payments, Connections) with saved settings + status strip | StageTargets | QA-PASSED |
| 8 | Permits board: board + list, drag between columns, editable Application #, Permit #, Issued, Expires | Permits board | QA-PASSED |
| 9 | Purchasing board: board + list (no TV mode) | Purchasing board | QA-PASSED |
| 10 | Account menu: location switch, 5 themes saved per user, Preview As (admins/managers) | AccountMenu | QA-PASSED |
| 11 | Remembered view choices per user (board/list, columns, filters) stored server-side | all boards | QA-PASSED |
| 12 | PO check: amount must match total; tax-exempt customers skip the tax difference | Main / ProjectRecord | QA-PASSED |
| 13 | Coordinator panel: Coming Up Today (prep packs) + Handled For You Today | Main | QA-PASSED |
| 14 | Nightly reconciliation report: store credit + offline payments CoreBridge can't take | report | QA-PASSED |
| 15 | MyProjects tiles in order: On schedule, Stuck, Missing a next step, Lost pipeline, Open pipeline | MyProjects | QA-PASSED |
| 16 | Setup Wizard: Process Expert 8-question interview builds a draft workflow | WorkflowSetup | QA-PASSED |
| 17 | Consistency lint test: Title Case buttons/headings, chips only for 3 or fewer choices, pop-ups close on outside click, plain wording list | all | QA-PASSED |
| 18 | Accessibility pass (labels, focus, 44px targets, contrast #5a6478 minimum) | all | QA-PASSED |
| 19 | Performance page: goals vs actual, team wins, Preview fireworks (5s) | MyPerformance | QA-PASSED |
| 20 | Team page (was Risks): Stuck list with escalations from the workflow | TeamActivities | QA-PASSED |
| 21 | New task / Add Next Step form (kind, due date, project) resolves Missing Next Step | Main / ProjectRecord | QA-PASSED |
| 22 | Customer Activity tab: log a call, email or visit; feeds Customers Engaged | CustomerRecord | QA-PASSED |
| 23 | Keep-warm list ('Customers to keep warm') from Admin day counts | Main / Customers | QA-PASSED |
| 24 | Scorecard goals + celebrations toggle read from Admin settings | Main | QA-PASSED |
| 25 | Shipping-account request: Ship items with no account get a task + email draft | ProjectRecord | QA-PASSED |
| 26 | Past due invoices: reminder drafts with pay link (no email leaves the test copy) | Reports | QA-PASSED |
| 27 | Order Completed email preview: invoice + review request | Admin / ProjectRecord | QA-PASSED |
| 28 | Insight 👍/👎 feedback recorded | CustomerRecord | QA-PASSED |
| 29 | Field app page for salespeople and installers (tech visit checklist, completion photo links to Google Drive) | Field | QA-PASSED |
| 30 | Workflow Builder: steps, hand-offs and autos as drafts until Publish | WorkflowBuilder | QA-PASSED |
| 31 | One way to create things: + New menu (Prospect/Project, Task, Customer) | all | QA-PASSED |
| 32 | Proofing: proof versions, round limit, reminder after N days (Admin) | Design | QA-PASSED |
| 33 | Estimate notes customized in Admin | StageTargets | QA-PASSED |
| 34 | Search (customers, projects, open tasks) from the header | all | QA-PASSED |
| 35 | Send Feedback page (kinds, recent list) | AccountMenu | QA-PASSED |
| 36 | My Profile & Settings (display name, notification choices) | AccountMenu | QA-PASSED |
| 37 | Change Log of every stage move | Admin | QA-PASSED |
| 38 | Order page Pay panel: eCheck vs card + Admin card fee (processing not connected yet) | CustomerPortal | QA-PASSED |
| 39 | Location switch keeps each location's data separate (CoreBridge live = NKY only) | AccountMenu | QA-PASSED |
| 40 | Portal QA from a signed link: pay panel, comment, price approval, bad link refused | CustomerPortal | QA-PASSED |
| 41 | Preview As shows each role's My Work (Design, Production, Permits, Purchasing) | TeamActivities | QA-PASSED |
| 42 | Customer contacts: add with email/phone, merged with project contacts | CustomerRecord | QA-PASSED |
| 43 | + New Project for This Customer | CustomerRecord | QA-PASSED |
| 44 | Morning Summary email preview | My Profile | QA-PASSED |
| 45 | CSV download: customers, past due | Customers / Reports | QA-PASSED |
| 46 | Phone: top nav scrolls instead of wrapping | all | QA-PASSED |
| 47 | Project page: this project's tasks + add one; move history timeline | ProjectRecord | QA-PASSED |
| 48 | Estimate approved: mark Approved & Paid (deposit/PO) moves the project to In production in SalesMax | ProjectRecord | QA-PASSED |
| 49 | Header alerts count (escalations, proof nudges, past due) + Alerts page | all | WON'T DO for now (covered by Coordinator panel + Morning Summary) |
| 50 | Admin: Reset Sample Data (keeps Admin settings) | StageTargets | QA-PASSED |
| 51 | Sample data matches across pages (tasks, boards, invoices, field, reconciliation use the demo projects' customers) | all | QA-PASSED |
| 52 | Moving Off CoreBridge checklist page | Admin | QA-PASSED |
| 53 | Proof versions as Google Drive links (v4, v5…); customer page gets 'Open the Full Proof' | Design / CustomerPortal | QA-PASSED |
| 54 | Title Case + a11y lint now covers 23 pages | all | QA-PASSED |
| 55 | Sign-in lands on Activities; / goes to Activities | all | QA-PASSED |
| 56 | Title Case on the older pages (estimate builder, estimate, modifier prices, customer order page) | Estimator / CustomerPortal | QA-PASSED |
| 57 | Billing & Add-ons page (display only) + Help page; both in the account menu | Billing | QA-PASSED |
| 58 | Hand-off tasks appear by themselves when every item is built (install/ship/pickup/deliver) | Main | QA-PASSED |
| 59 | Keyboard focus ring + Skip to Content link on every page | all | QA-PASSED |
| 60 | Customer Upcoming Needs → follow-up task on Activities for that date | CustomerRecord | QA-PASSED |
| 61 | Purchasing: Check Vendor Quote (Buying agent rules); blocked quotes cannot be ordered | Purchasing | QA-PASSED |
| 62 | Workflow Builder chat: plain sentences change owners and target days in the draft | WorkflowBuilder | QA-PASSED |
| 63 | Setup interview builds the workflow draft from the answers | WorkflowSetup | QA-PASSED |
| 64 | Monthly sales and close-rate goals in Admin feed Performance | StageTargets | QA-PASSED |
| 65 | Customer enters their PO on the order page; staff see it with the PO check | CustomerPortal | QA-PASSED |
| 66 | Customer order page: 'Most likely' ready date and 'No later than' due date | CustomerPortalPhone | QA-PASSED |
| 67 | Team Members admin (role, home location); assign a new task to a teammate | Admin / Main | QA-PASSED |
| 68 | Snooze a task 1 day / 3 days / 1 week | Main | QA-PASSED |
| 69 | Mark a prospect or estimate Lost with a reason (feeds Lost pipeline) | ProjectRecord | QA-PASSED |
| 70 | Project cards show Stuck / No next step badges | MyProjects | QA-PASSED |
| 71 | Top nav marks the current page for screen readers | all | QA-PASSED |
| 72 | Release runbook + DRAFT production stack template (not deployed) | Release | QA-PASSED |
| 73 | DATA_MODE (sample vs live) so production never shows sample records | all | QA-PASSED (live data itself waits on #74) |
| 74 | CoreBridge history import: estimates and orders (throttled, resumable) | data | BUILT, OFF: Phil turns on 'Allow history import' in Admin > Connections |
| 75 | Online payments via Fiserv CardPointe | CustomerPortal | BLOCKED: waiting on Fiserv test credentials |
| 76 | Proof files: connect Google Drive so SalesMax can show the file itself | Design | BLOCKED: needs a Google Drive connection decision |
| 77 | Public Request a Quote form (/request): prospect + QR-#### quote task; spam honeypot | Lead intake | QA-PASSED |
| 78 | Customer approves the estimate online (name + agree); moves to In production; deposit task | CustomerPortal | QA-PASSED |
| 79 | Email wording in Admin (Order Completed, Past Due, Shipping Account) with {placeholders} | StageTargets | QA-PASSED |
| 80 | Owners only: Admin, Billing and money reports (OWNER_EMAIL or Owner on the team) | security | QA-PASSED |
| 81 | No changes on page load: removed GET ?reset=1 (use Admin > Reset Sample Data) | security | QA-PASSED |
| 82 | Finished tasks are logged on the customer's history (once) | CustomerRecord | QA-PASSED |
| 83 | Project page: Customer Order Page panel (open as the customer, copy link) | ProjectRecord | QA-PASSED |
| 84 | Email: Inbox/Archive/Spam; Mark as Spam blocks the sender; NEVER delete (archive only); Out of Office auto-reply (once per sender, never to spam/no-reply) | Email | QA-PASSED (sample mail; real mailbox connection needed) |
| 85 | Hand-off address per project (Pickup/Install/Deliver/Ship) shown on the project, estimate and invoice | ProjectRecord | QA-PASSED |
| 86 | XPS shipping: label cost + Admin markup (+handling) added to the invoice; Complete is blocked until shipping is on the CoreBridge order | ProjectRecord | QA-PASSED (labels entered by hand until XPS is connected) |
| 87 | XPS connection: pull label cost + tracking automatically (XPS API or the XPS label email) | data | TODO: needs XPS access |
| 88 | CoreBridge write: add the Shipping line to the order automatically | data | BLOCKED: CoreBridge writes need Phil's approval |
| 89 | Phil 9:07: no Email tab. Email lives in the To Do list (Reply / Archive / Mark as Spam) and on the customer Email tab + project Email panel | Main / CustomerRecord / ProjectRecord | QA-PASSED |
| 90 | Rich text editor bar (Bold, Italic, Underline, bullets, numbers, link, clear) with no-script fallback; HTML is cleaned | email | QA-PASSED |
| 91 | Email signature in My Profile; added automatically to every outgoing email | My Profile | QA-PASSED |
| 92 | Out of Office moved to the profile menu (My Profile & Settings) | AccountMenu | QA-PASSED |
| 93 | Invoice: Subtotal, Discount, Shipping (retail price only), Total. Label cost never shows on the invoice | Invoice | QA-PASSED |
| 94 | XPS API client (searchShipments, RSIS key): Get Labels from XPS on the project | ProjectRecord | BUILT, waiting on XPS API key + customer ID |

- #95 Connected Apps & Keys (Admin): XPS + Fiserv CardPointe keys saved to AWS Secrets Manager, masked to last 4, owner-only. QA-PASSED (app-51b7ecfdadf01653).
- #96 XPS: XPS route now reads keys from the vault (no env ARN). QA-PASSED.
- #97 Boxes for XPS: production records weight/size per box on the project; "Send Order to XPS" builds the XPS Put Order (order # as reference, hand-off address, boxes). Test copy prepares but never sends (XPS_WRITES off). QA-PASSED.
- #98 Duplicate rule (Phil 09:50): Ship orders are held out of CoreBridge BUILT until the XPS label is bought; stay BUILT until daily reconciliation. Helper + panel note done; enforce on CoreBridge write path at go-live. IN PROGRESS.
- #99 CoreBridge history import (customers, contacts, estimates, orders) via search* endpoints, paced. TODO next.
- #100 Parallel mode switch (real data, nothing sent, rules bypassed, scheduled resync). TODO.
- #101 Mockup fidelity pass, screen by screen. TODO.

- #102 Ship gate: product line can't move to Built on a Ship order until boxes are entered; only Ship orders go to XPS. QA-PASSED (app-dd240410b7ac82d5).
- #103 Out of Office delegate: required when on; delegate's To Do shows "Covering for <name>"; auto-reply names the delegate. QA-PASSED.
- #104 Gmail two-way sync (Google Workspace): every inbox email in SalesMax, auto-matched to customer/contact/project; Create Contact when no match. TODO (needs Google Admin setup by Phil).
- #105 One shared email component on To Do, Customer › Email, Project › Email: Reply/Reply All/Forward, Cc/Bcc, rich text, attachments (computer + Drive job folder), inline images, inline drafts (no Drafts folder), Undo Send, Schedule Send, Snooze, Archive (never delete), Spam (Gmail spam + skip sender), search, labels, open tracking. Mockup done (EmailInbox v333). TODO build.
- #106 Templates: shop-wide + personal. TODO.
- #107 Email visibility: admins/managers see all; coworkers see shared customers/projects and delegate access. TODO.
- #108 Shared inbox (info@): import history, auto-attach to contacts/projects; Unassigned Leads queue for managers; Assign forwards to salesperson. TODO.
- #109 Flag customer emails deleted in Gmail. TODO.
- #110 Field app stays limited to site surveys, install photos and prospecting (no email). Decision.
- #111 Hand-off address picker: company profile addresses (default ship-to preselected) + 'Enter a different address' with optional save to profile. Mockup done (v334). TODO build.
- #112 CANCELLED: keep the name 'Hand-off' (Phil, 11:14). Project tab is named 'Hand-off'.
- #113 'Shipping Details' (box weight/size) entered on the Production board card itself; required before Built on Ship orders; also shown/editable on the project. Never name XPS in user-facing text (only Admin › Connected Apps). Mockup done (v338). TODO build.
- #114 Parallel Mode banner on every page when on (global, admin-only switch). TODO build.
- #115 Ship via: Parcel (automatic) vs Freight/LTL (booked in ATS, entered by hand: carrier, PRO #, pickup date, cost, retail = cost + markup). Freight never auto-sent. Mockup done (v340). TODO build.
- #116 Workflow Builder › Delivery & Shipping rule switches (details required before Built; auto-send parcel; freight by hand; which methods use shipping). Mockup done (v341). TODO build.
- #117 Licensing: CoreBridge as a per-shop Connected App (Business ID, API Client ID, Secret in vault per tenant); keys/data isolated per shop; move NKY off the shared connector before licensing. OPEN: confirm with CoreBridge how API credentials are issued per business. Mockup done (v353). TODO build.
- 2026-11-12 12:05 build app-839891f7bfec2ea0 (166 tests pass) — QA-PASSED:
  - #113 Shipping Details on the Production board card (Ship hand-offs only), Save returns to the board; needed before Built.
  - #114 Parallel Mode banner on every page.
  - #115 Shipping Labels & Tracking: Automatic vs Added by hand tags; "+ Add Tracking" (carrier, tracking/PRO #, cost) for ATS freight.
  - #116 Shipping Rules switches in Admin › Workflow Builder (details required; auto-send; Ship or Ship+Deliver). Wired into the Built gate and auto-send.
  - No XPS wording in user screens (only Admin › Connected Apps).
  - #105 (part) Email in To Do: one item per conversation ("N new"), filters Need Reply · Waiting for Reply · Snoozed · Draft, Snooze 1/3/7 days, Bring Back Now, Save Draft, Send archives the whole conversation, + Create Contact for unknown senders.
  - #99 Full history import (customers, contacts, estimates, orders) as CB#<entity>#<id>, scheduled every minute (~120 calls/hr), progress on Admin › Import; honours CoreBridge page caps. RUNNING.
  - #111 Hand-off address from the company profile (default ship-to preselected) or typed, with "Also save to the company profile".
  - #117 (part) CoreBridge as a per-shop Connected App (keys in the vault). NKY still on the shared connector.
- #118 Price protection: lines store the shared price; when the price list changes (part, modifier, formula) open estimates/orders that would change get a 'Prices changed' box + To Do: Keep Shared Price (override, logged) or Update to Latest (new version for approval). In-production orders default to keep. Mockup done (v363). TODO build.
- #119 Expected ready date = latest of velocity forecast + vended line expected dates; hard due date never shifts; if expected > hard due → alert sales, production lead, manager (To Do + notification) and flag on project/boards; customer page shows hard due if set else expected; slips told to customer only via 'Tell the Customer'. Mockup done (v364). DECIDED (Phil 14:19): without a hard due date the customer page updates automatically. TODO build.
- #120 Complete = Locked (money/lines/dates/status). 'Reopen Order' (permission in Admin › Team) voids original as <job>-V and clones exactly to <job>; linked both ways + history. Proposed: 'what needs to change?' lands the clone there, untouched lines stay Built/Complete, payments transfer, revised invoice drafted only if total changes, 'Request Reopen' approval for non-permitted users, notes/files/tracking/contact stay editable when locked, mirror void+clone in CoreBridge (parallel mode: reminder only). AWAITING Phil OK on suggestions.
- #121 Clarity Voice call webhook: POST /hooks/calls checks X-Genie-Signing-Key (vault app 'clarity'), stores calls (latest 50) and shows the verification value + latest calls in Admin › Connected Apps. QA-PASSED (app-8811a273b32d1214). NEXT after first real payload: map fields, match phone → contact/customer, log on customer record, To Do for missed calls.
- #122 Admin › Company: 'Estimate & invoice number prefix' per location (NKY default 226) → invoice/estimate show 226-75148, never doubled. QA-PASSED (app-39482fa44f670d55). TODO: add to the Admin mockup; apply to emails/PDFs/customer page when those print numbers.
- #123 Sequences (Admin › Sequences): prebuilt New Customer Welcome, New Order Next Steps, New Order Missing Payment Reminder; OFF by default; admins toggle, edit/add/remove steps, reset to prebuilt; merge fields. QA-PASSED (app-47346e75c243c4bd). NEXT: when on, due steps appear in the salesperson's To Do as ready-to-send drafts/tasks (wire triggers: first order, order created, approved-without-deposit; stop rules).
- #124 Admin › Stage Checklists for every step on every board (Design, Production, Permits, Purchasing, Install), editable, with Required items that gate the move; shown on the card. Mockup done (v368). TODO build.
- 2026-11-12 15:45 build app-fb792fc7f9e2f397 (173 tests) — QA-PASSED:
  - #123 Sequences engine: when on, due steps appear in To Do (green "Sequence" tag) with email preview, Open Email, Mark Sent / Done; stop rules applied.
  - #124 Stage Checklists live: checklist on each Design/Production card (Checklist · 1/3), tap to check; Required items block moving on; Admin › Stage Checklists editor (* = required).
  - #119 Expected ready date live: project panel shows hard due 🔒, velocity, vended dates, Expected = latest; red alert + To Do "Late risk" when after hard due; customer page shows hard due or auto-updating expected.
  - CoreBridge Customers (imported): /customers/imported, search + paging over the history import; link banner on Customers.

## #125 Licensing roles and support access with local-admin approval (FUTURE, Phil Nov 12)
Status: IDEA, captured for the licensing phase. Not built.
- Roles: Local Admin (per licensee location), SalesMax Super Admin, SalesMax Support Member. Each gets its own set of permissions and features.
- Default: SalesMax staff see NOTHING in a licensee's environment (no settings, no data).
- Support request: a Super Admin or Support Member sends an access request (reason, how long) -> push notification to that account's Local Admin(s) (in-app + email).
- Local Admin must explicitly Accept for access to open. Decline or no answer = no access.
- Access is temporary and for support only: time-limited, ends automatically, Local Admin can revoke any time. Shown with a banner on both sides while active.
- Audit log of every event: request, approve, decline, expire, revoke, plus what the support person viewed or changed during the session. Who, when, reason, account. Local Admin can view/export it, so we can show we had permission.

- 2026-11-12 evening builds (app-d112ad4e4d620e43, app-6351828a2a1c71b4, app-a301020635a3b801; 179 tests) — QA-PASSED:
  - #126 Checklists on the Sales board (Projects) cards; Admin › Stage Checklists grouped by board (Sales, Design, Production, Permits, Purchasing) as "definition of done"; custom stages (config custom-stages) appear automatically with a Custom tag; estimate approval gated by required Estimate items. Permits and Purchasing cards now have checklists too, and required items block the move. Mockup: MyProjects cards + StageTargets Sales tab with a sample custom stage.
  - #127 Calls tab (admins only, nav): tiles (calls, missed/voicemail, avg talk, avg call score, avg CSAT, resolved %, open action items, matched %), filters (range, direction incl. Internal, team member, missed/voicemail/action items/not resolved/score<60/unhappy/not a customer, search), By Team Member table, busiest hours, top callers, outcomes & mood, common issues, What Clarity Sends, call list with details (summary, why they called, how it ended, action items, topics, insights, scorecard, transcript). Team-to-team calls hidden by default. Mockup: Calls board + nav tab.
  - #128 Clarity vCon mapping from real payloads (tags attachment + analysis types franchise_diarized, resolution, csat, scorecard, insights, topics, genie_tags, transcript_pii_removed). Each call stored as CALL#<start>#<uuid>. Phone index PHONE#<10 digits> built from imported CoreBridge contacts/customers (33,422 numbers) and kept current by the history import; calls matched to company/contact.
- #129 NEXT (needs Phil): where the sales team sees calls (customer record timeline? To Do for missed calls/voicemail with action items?). Held per Phil 16:31: Calls tab only for now.
- 2026-11-12 packages/app-9b013568c02a848e.zip (180 tests) — QA-PASSED:
  - #118 Price protection live: each open job keeps the prices it was shared with (shared-prices; demo-3, demo-4, demo-6 seeded). Saving Admin › Modifier Price List compares old vs new; every open job whose lines would change gets the "Prices changed since this estimate was sent" box on the project (line, what changed, shared vs latest) and a "Price change" To Do. Keep Shared Price = override logged with name/date; Update to Latest = new version (v2) to send for approval. Orders in production keep automatically (box says so). Changes logged in price-changes. NEXT: snapshot shared prices automatically when an estimate is sent (needs the send-estimate step), and CoreBridge part price changes (read-only today).
  - #122 (part) Prefix shown in the Admin mockup (Company › Branding row "Estimate & invoice number prefix · 226").
- 2026-11-12 app-fc3dc999d1f721d1 (180 tests) — #101 fidelity pass, step 1 (header on every page) QA-PASSED: FASTSIGNS® | SALESMAX logo, 60px sticky navy header, five main tabs (Activities, Customers, Projects, Performance, Team; + Calls for admins) with the mockup's red underline, boards moved into the module switcher (Sales, Design, Production, Permits, Purchasing, Field) like the mockup. Current board shows as an extra tab while you're in it.
- 2026-11-12 app-6492b335d2e0f02c (181 tests) — #101 fidelity step 2 (Activities) QA-PASSED: date line instead of a visible title, Today's Scorecard heading row + large tiles (label, big number, goal meter), new navy "Focus Now" strip (top 3 past-due/today items), To Do as one white card with pill chips (with dots, All · count, selected = navy), grey collapsible-style group rows, task rows with a checkbox on the left (marks done), customer line in blue, kind tag + due date on the right, compact Snooze; right column panels with header rules; Activities nav badge = All To Do count. Build now also writes page snapshots (snaps/*.html in the build bucket) for fidelity checks.
- 2026-11-12 packages/app-d66c724bd9e513ae.zip — #101 fidelity step 3 (Projects board) QA-PASSED: page padding and "updated/stages move on their own" line, lanes in grey columns with a colored underline, count, total and the "To <next stage>: needs…" rule; cards like the mockup: title link + task-status circle (green on schedule / red late / empty no next step), customer, priority pill, due date with calendar icon (red past, amber today), value + status badge, Stuck/No next step chips, ✦ insight, checklist.
- 2026-11-12 app-aba7aea9a4f2daa6 (181 tests) — #101 fidelity step 4 (Customers list) QA-PASSED: "N contacts at M companies" line, five summary tiles with action links (keep warm, going dormant, prospects, quoting, open pipeline), "Where Your Customers Are" chevron journey (click a step to filter), filter box, contact table grouped by company (grey company row with contacts · open · lifetime · salesperson), contact rows with temperature pill + stage, activity link, next step (first open project or "Set a next step"), open projects, lifetime sales. Not yet: last-conversation dates (needs Gmail sync), cleanup suggestions, sequences panel.
- 2026-11-13 app-e10bd5dbb11bc1d6 (181 tests) — #101 fidelity step 5 (Customer record) QA-PASSED: breadcrumb, header card with initials tile, 24px name + temperature pill (Hot/Cold/Warm by stage), location · owner line with the Strategic Priority toggle, stats (open orders, lifetime, projects, contacts); left column People and Relationship cards; right "workspace" card with the mockup tab bar (48px, red underline) and the tab content inside. Not yet: balance owed / in-store credit (needs payments data), customer flag + "why this customer matters" strips.
- 2026-11-13 app-69001f298bff4d09 (181 tests) — #101 fidelity step 6 (Project record) QA-PASSED: breadcrumb (Projects › Order #), header card with long title, customer link, order total (+ CoreBridge status), chevron stage bar (done green, current navy, upcoming grey), number row under it (due date colored by urgency, salesperson, contact, status, customer priority); price/standing panels and Items card below. Not yet: "Stage time left" pill, "Next step · Do It" bar, tabs (Scope & Site Survey, Hand-off, Email…) and right column from the mockup.
- 2026-11-13 app-4de04e02cc2dd57a (181 tests) — #101 step 7 QA-PASSED: project page "Next step" bar (the job's earliest open task, when it's due, "Do It →" marks it done on Activities and returns to the project) or an amber "No next step · Add Next Step →" when the job has none. Task Done now honours a back link.
- 2026-11-13 app-7d4f57b7b31523cd (181 tests) — #101 step 8 (Design & Production boards) QA-PASSED: mockup column header (14px name, "n of N max" WIP limit in red when full, colored underline, owner · CoreBridge hint line), cards with 4px left edge, 14px titles, person as an initials badge, dashed "Nothing here" empty state. Not yet: production summary line (assembly notes), customer flag strip, Installs This Week panel.
- 2026-11-13 packages/app-de26fda072426da8.zip (181 tests) — #101 step 9 (Performance + Team) QA-PASSED: mockup page frame (header line instead of big title), large tiles with goal meters (green when hit), card panels with header rules; Team gets summary tiles (stuck, escalate, open items, people with work) and workload bars per person.
- 2026-11-13 app-2bec01e7da7ddfc9 (182 tests) — #130 Customer flag + "Why this customer matters" QA-PASSED: edited on Customer › Account ("Notes for the Team"); flag shows as the amber ⚑ strip on the customer page, at the top of every project for that customer, and on that customer's Design/Production cards; "why" shows as a blue strip under the customer header. Demo: Riverbend Dental has a sample flag and why.
- 2026-11-13 packages/app-ae5abb059584f1e8.zip (184 tests) — QA-PASSED:
  - #123 Sequences start on the order's approval date (not the day someone opens Activities); Customer › Activity shows a "Sequences" panel per project (started, steps done, next step and when, or Finished).
  - #131 Production board "Installs This Week": install items due in the next 7 days grouped by day (overdue in red), with note, crew and Built-ready / Not built yet; follows the board filters.
- 2026-11-13 app-cf584af60ba6da7e (185 tests) — QA-PASSED: Production cards get the one-line production summary (qty × size material · station → hand-off); Customers list "Cleanup Suggestions" card (same person under two companies, company with no contact, no salesperson) with Review links — read-only, nothing changes without a person.
- 2026-11-13 app-79e0b316304d84f0 (185 tests) — #101 customer order page QA-PASSED: white header with FASTSIGNS® | location name, "Questions? <salesperson> · phone", "Secure link for <contact>"; title "Company · Order #" with project and due date; 5-step progress bar (Approved, Proofs, Production, Ready, Complete) from the items; proofs, then payments/comments/forecast, then everything on the order. Still single column (phone-friendly).
- 2026-11-13 app-eb112bbc13fe20de (185 tests) — #101 Admin settings QA-PASSED: the row of 12 buttons became a left sidebar grouped Settings / Workflow / People & Apps / Data (current page highlighted); settings tabs in a card with the red underline, status strip, form and Save below. All existing forms unchanged.
- 2026-11-13 app-d638d69dc1ff0ec0 (185 tests) — Admin left menu on every admin page (/admin/*, Set Up Workflow, reports, Change Log), current page highlighted; sticky on wide screens, on top on phones.
- 2026-11-13 app-588931afa417ad5c (185 tests) — Project page tab bar (mockup style, sticky under the header): Overview · Hand-off · Email · Items · Activity · Customer PO · Order Page. Tabs jump to that part of the page instead of hiding the rest, so every form keeps working. Only tabs that have content show.
- 2026-11-13 app-83177563d838fdd5 (185 tests) — Phone layout for tonight's restyled pages (≤700px): 16px side padding, tiles 2 across, Focus Now / To Do / right column stacked, journey and stage bars as 2-across blocks, customer and project stats 2 across, admin menu on top, task rows wrap. Boards and wide tables still scroll sideways inside their box.
- 2026-11-13 app-77268691352f821a (185 tests) — Permits and Purchasing boards match the Design/Production style: header line instead of big title, grey columns with colored underline and count, cards with colored left edge (red when there's a note or the permit expired), project ref + ETA/expiry row, title links to the project.
- 2026-11-13 packages/app-64e71c0865cc6146.zip (185 tests) — Field app (phone) matches the mockup feel: date + stops + done count, Today / Survey / Install switch, cards with time, kind tag, checklist progress, big address button (opens Maps), 48px checklist rows, full-width Save and Add Photos in Google Drive buttons.
- 2026-11-13 app-5b9644163cdb178d (186 tests) — QA-PASSED: email writer restyled like the mockup (navy "New Message / Reply" bar, To and Subject as clean rows, Cc Bcc pop-out, message box, signature, footer with Send, Save Draft and Schedule Send); Cc/Bcc addresses checked; Schedule Send keeps the email as Scheduled for the chosen future time (#105 part). Clarity: calls that ring through to "Shared Voicemail" now count as missed + voicemail.
- 2026-11-13 packages/app-937c8dfbad6fcba2.zip (187 tests) — #105 QA-PASSED: Undo Send (30 seconds; the sent email becomes a draft again and the email it answered goes back to Need Reply), shown next to the "Sent" message on Activities and the customer Email tab. Scheduled emails get their own "Scheduled · n" filter with Cancel and Edit (back to a draft).
- 2026-11-13 app-a716b6203817ead7 (QA-PASSED) — #106 Email templates: shop-wide (Admin › Email Templates, 5 prebuilt: Proof ready, Deposit reminder, Ready for pickup, Install confirmation, Thanks + review request) and personal (/me/templates). "Insert Template" picker above the email writer fills subject + message with first name, company, order number (with prefix) and salesperson.
- 2026-11-13 app-302c88d392934cb4 (188 tests) — QA-PASSED: CoreBridge customer detail page (/customers/imported/<account #>, read-only): header card (balance due, contacts, orders), People with primary/billing tags, Account facts (type, industry, salesperson, terms, credit limit, tax group/exempt, PO required, phone, website, address), newest orders table. Rows on CoreBridge Customers link to it. New small index items CC#/CO# (written by the import, plus a one-time backfill: contacts done, orders in progress). History import: customers 9.8k, contacts 25.3k, estimates 5.9k, orders 15.8k of 71.3k (CoreBridge timeouts retry each minute).
- 2026-11-13 app-c8de0b354a8441fb (189 tests) — QA-PASSED: Calls tab links a matched caller to their CoreBridge customer page; Customers search shows "Also in CoreBridge: N matches →" when the imported CoreBridge customers match too. Order links for CoreBridge customer pages finished (39.8k index items).
- 2026-11-13 app-00e5487fa461ec7f (190 tests) — QA-PASSED: Customers list "Last Conversation" column from logged activity (call/visit/email notes) and email, e.g. "Yesterday · email"; "None logged" in red; older than 60 days in amber. Clarity calls deliberately NOT shown here (Phil: Calls tab only for now, #129).
- 2026-11-13 mockup v375: Email writer gets the "Insert Template…" picker (Shop / Mine) to match live. Checked mockup already has Focus Now, Cleanup Suggestions, Last Conversation, Installs This Week, customer flag.
- 2026-11-13 app-7430ff5df3966fe2 — Fidelity #1 QA-PASSED: project page left column (Details, Hand-Offs, Contact) + workspace with the mockup tabs Activity · Scope & Site Survey · Products · Tasks · Email · Notes · Files (?tab=). Activity shows everything; other tabs show just their part; forms unchanged.
- 2026-11-13 packages/app-fe2ef0958cfab11b.zip — Fidelity #2 QA-PASSED: Stage time left pill above the stage bar (green / amber when 1 day or less / red when over); SalesMax now records the day each project enters a stage (lane-since); targets per stage in Admin › Work (Prospect 14, Estimate 7, In production 10, Built 3 days).
- 2026-11-13 app-f8c00d8d2324c1e7 (192 tests) — Fidelity #3 QA-PASSED: project Notes tab (team notes with name + time) and Tasks tab (this job's open tasks, add with due date and kind, tick to finish, Done Recently); adding a task from a project returns to the project.
- 2026-11-13 app-b7567da6c845d796 (193 tests) — Fidelity #4 QA-PASSED: Strategic Priority — 6 questions scored 1–5 on the customer page (Scale, Repeatability, Expandability, Multi-location, Change activity, Access) → score out of 100 and High/Med/Low; can be pinned with a reason; shown on every project card as e.g. “High · 90”. Demo customers pre-scored like the mockup (Florence Realty pinned High).
- 2026-11-13 app-2d931eef5672c21a (194 tests) — Fidelity #5 QA-PASSED: Projects toolbar like the mockup: Board | List switch, Show (all open / stuck / missing a next step / estimates / orders), Due (past / today / next 7 days / later) and Priority filters; List view table (project, customer, stage, priority, due, value, status, flags).

- 2026-11-13 04:21 UTC (Phil, urgent): Connected Apps page no longer shows any saved key in full. Every saved value (Fiserv Merchant ID, Site, API Username, plus CoreBridge/XPS IDs) shows only ••••last-4, and values of 8 characters or fewer show dots only. All key boxes are hidden while typing. The Fiserv API Password was always masked. Build app-c2f290db9d8e01fa, 194 tests pass. Test copy only.

- 2026-11-13 04:30 UTC: Fidelity #6 email writer extras. Booking Link (saved in My Profile, https only; button drops 'Book a time with me' into the email, or points to My Profile if not set). Help Me Write = starter draft from the customer's open project stage (prospect / estimate / proof / production / general), rule-based, no outside AI. 'Add a follow-up task if no reply in 3 days' checkbox (on by default) adds one Email task due 3 days after sending. Build app-6c24c875ff9af593, 198 tests. Not done: Track opens/clicks (needs live Gmail) and From Job Folder (needs Google Drive), both on the needs-Phil list.

- 2026-11-13 04:38 UTC: Fidelity #7 Customers Accounts | Prospects toggle. Prospects = CoreBridge PROSPECT accounts with no orders (about 1,600), grouped by city, search + city filter, Add to Route (up to 9 stops, per salesperson) with Send All to Google Maps (directions link, no key needed), Not a Fit (shop-wide, reversible, nothing changes in CoreBridge). Market Penetration by City from our own accounts + order history (Active 12 mo / Past win-back / Never ordered / Prospects). Summary rebuilt by the minute job every 6 h. Map pins and 'every business in the area' need the Google Maps key (needs Phil). Build app-3286a3e3a69035f4, 203 tests.

- 2026-11-13 04:51 UTC: Fidelity #8 Send Feedback restyled as the mockup's slide-in panel (Idea / Something Is Broken / Question, prompt changes with the kind, 'Include the page you were on' instead of a screenshot, What happens next box, Your Earlier Suggestions with status). New Admin > People & Apps > Feedback Inbox: owner sets Under review / Planned / Shipped / Not planned + a note the person sees. Market summary verified built at 04:45 (2,335 prospects; 1,200 newest kept for the list). Build app-466fd326179cdfa4, 205 tests.

- 2026-11-13 05:01 UTC: Fidelity #9 Billing & Add-Ons matches the mockup (tiles, dark plan card $199 + $29/extra person, 9 add-on cards with Active / Trial (days left) / Not added and Start Free Trial / Keep It / Turn Off, Payment + Invoices, Add Another Location). Test copy: nothing charged, no card, no Stripe; switches only change the page. BUG FIX: the admin Calls page and Email Templates pages were erroring (a missing page helper); fixed, and a new test now checks 12 admin/main pages all load. Build app-c775128053e0ce72, 206 tests.

- 2026-11-13 05:08 UTC: Fidelity #10 Admin > Workflow > Pricing Engine (/admin/pricing): tiles, tabs Price Check / Parts / Pricing Templates / Modifiers. Price Check shows each step (size, cost ÷ (1 − margin) at the quantity break, setup, 2nd side, $12 tech fee); 1/4" acrylic 12x12 matches CoreBridge ($61.40 / $68.68 + $12), covered by a test. Parts lists all 194 catalog parts; the 6 with copied pricing are editable (used by Price Check only; CoreBridge still prices real estimates). Templates (8 of 84 sample) and Modifiers (2 formulas copied, all 47 listed). FOLLOW-UP (no Phil input needed, read-only): pull full part pricing (cost/margins/breaks) + all 84 templates + modifier formulas from CoreBridge so the other 188 parts can be checked. Build app-c4b66ed30f1c9481, 208 tests.

- 2026-11-13 05:16 UTC: Fidelity #11 Admin > Workflow > Sales Rules (/admin/rules): Stage Time Targets table for 7 stages (days + business/calendar, clock-start text; same target_ settings Projects already uses), Reply Time Targets (6 message kinds + Due Soon rule; applies once Gmail/chat connect), Business Hours (standard hours until Google Business Profile connects), Keep-Warm Rules (check-in, dormant, prospect nudge + 4 reason sources). Admin > Data > Customer Lists & Import (/admin/lists): Source, Industry, Customer type, Tax-exempt lists + mark-inactive months; Import Customers CSV checker for Customers / Locations / Contacts (check only, nothing saved). Build app-f54cf4938686f9fa, 210 tests.

- 2026-11-13 05:28 UTC: Fidelity #12 customer order page is now two columns on computers like the mockup: proofs, estimate approval and order items on the left; a sticky right rail with Order Summary (order #, status, due, ordered by, total, salesperson) then ready-date forecast, PO, payments and comments. Phones (under 880px) stay one column. Test note: test files that load app code must use import() in test/index.js (a static import loaded sign-in settings too early and broke the sign-in test). Build app-670d0d86dda81f5c, 211 tests.

- 2026-11-13 05:35 UTC: Fidelity #13 Search restyled like the GlobalSearch mockup: one big 'Search everything' box, results grouped by Projects / Customers / Contacts / Emails / Tasks / Calls (admins) / CoreBridge History (9,600 imported customers), matching words highlighted, status pills, 'This tab' marker, See all N, and a no-matches hint. Build app-f6a287b1b92de72f, 212 tests.

- 2026-11-13 05:45 UTC: Fidelity #14 done: walkthrough checklist doc for Phil (Claude Doc 'SalesMax Test Copy Walkthrough', https://claude.ai/artifact/6qWkKpYzKGZ2qETTJiDrvQ): every mockup board ↔ test-copy page, what to check, Waiting on Phil list, differences on purpose. Added plan items 15 (read-only CoreBridge pricing pull) and 16 (final visual sweep, one board per round).

- 2026-11-13 05:47 UTC: #15 Pricing Engine › Price Check now has Compare With CoreBridge: asks CoreBridge (PriceConfiguredOrder, an allowed read that saves nothing) for its live price for ANY of the 194 parts and shows Exact match / Off by $X next to SalesMax's steps. Copying CoreBridge's cost/margin setup itself is NOT in the allowed read list, so it's on the Needs Phil list (approve a new read-only call). Build app-8a8f658cfe5218f5, 213 tests.

- 2026-11-13 05:54 UTC: Sweep #16 board 1/21 Activities: Plan Visits button, Forward on emails (Fwd: draft with original quoted), See All Activity link. Build app-6303925555cfbd9b, 214 tests.

- 2026-11-13 06:00 UTC: Sweep 2/21 Customers: Show / Group / Sort controls like the mockup, heading and tile wording. Build app-0a9e2f87d2f3d41b, 215 tests.

- 2026-11-13 06:07 UTC: Sweep 3/21 Projects: tiles restyled with mockup hint lines + click-to-filter. Build app-52720825471848a9, 216 tests.

- 2026-11-13 06:15 UTC: Sweep 4/21 Project record: Build Estimate / Documents ▾ / Copy Order Page Link header actions, new printable Packing Slip (no prices). Backlog: Generate Quote PDF settings panel; Resend Order Page Link (email/text) once sending is on; Re-Price + discount override (needs CoreBridge write approval). Build app-86a69feb23eaa511, 217 tests.

- 2026-11-13 06:28 UTC: Sweep 5/21 Customer record: Past Orders + Reorder, Start a Project, Terms/Credit/Tax and Locations on Account. History import: orders 44,850/71k, no errors; Clarity calls 1,613 total. Build app-2e6f45d4736e9aa6, 218 tests.

- 2026-11-13 06:34 UTC: Sweep 6/21 Design board: + Add a Note on cards, @mentions in notes create a task for that teammate, 'Put on Hold…'. Build app-dbbb7b53bfe70ed8, 220 tests.

- 2026-11-13 06:40 UTC: Sweep 7/21 Production board: Ready / Mine / Rush / Late / On Hold / All quick filters (also on Design). Build app-b1ee95e3c56196ef, 221 tests.

- 2026-11-13 06:46 UTC: Sweep 8-9/21 Permits + Purchasing: + Add Permit / + New Quote Request or PO, City / County Fees per permit, + Add a Note on cards. Build app-a91859e22e5277bb, 222 tests.

- 2026-11-13 06:53 UTC: Sweep 10/21 Performance: salesperson picker, goal gap, Sales by Month past + forecast chart, pipeline funnel, Edit My Goal. Build app-f9be935b3fc66d0d, 223 tests.

- 2026-11-13 06:59 UTC: Sweep 11/21 Team: Slipping Through the Cracks (with Nudge), By Salesperson table, mockup tiles. History import: orders 49,400/71k, no errors; Clarity 1,703 calls. Build app-a06ec4d273aa0f88, 225 tests. Needs Phil (small): should Team be owners/managers only, as the mockup says?

- 2026-11-13 07:06 UTC: Sweep 12/21 Field: mockup header, Look Up tab (customers + CoreBridge history, Call / Directions / Open), customer flags on job cards. Build app-797ba50ee5ceaf7a, 226 tests.

- 2026-11-13 07:17 UTC: Sweep 13/21 Send Proof (approvers, approval mode, templates, follow-up options). FIX: moved all small page behaviors to /static/ui.js (inline handlers were blocked by the security policy; menus didn't auto-apply); new QA guard test. Build app-771520c20295bd8a, 229 tests.

- 2026-11-13 07:23 UTC: Sweep 14-15/21 Task form (Notes + Repeat with next task on done) and Add Prospect (email, phone, chance, temperature, Add and Start an Estimate). Build app-d1a0fdf398b05c71, 232 tests.

- 2026-11-13 07:29 UTC: Sweep 16-17/21 Out of Office + signature (mockup wording, Insert Booking Link) and Connected Apps (Still on / Turned off, Owners only). History import: orders 53,400/71k, no errors; Clarity 1,782 calls. Build app-3391a0d1b763116b, 233 tests.
- [x] Sweep: Workflow Builder board matched to mockup labels (Nov 13 07:45 UTC).
- [ ] Later: drag-and-drop workflow map editing and per-step automations (+ Add Automation).
- [x] Sweep: Workflow Setup interview matched to mockup labels (Nov 13 07:51 UTC).
- [x] Sweep: Shipping / Hand-Off matched to mockup labels, plus hand-off Phone saved (Nov 13).
- [x] Site Visit screens built to the mockup (start page, survey by item, split/drop, needs) (Nov 13 09:27 UTC).
- [ ] Waiting on Google Drive: site visit photos, voice notes and the Site Survey PDF.
- [x] FIDELITY-PLAN #16 final visual sweep complete.

## Phil, Nov 13 4:35 AM ET: after the rebuild
- [ ] When every page is completely built (no missing pages, no dead links), run a UX Expert agent and a Process Design Expert agent through the entire site to make sure it is optimized. Each agent works independently; fix what they find.
- [ ] Phil will link his computer (desktop app) in a few hours so live pages can be screenshotted and compared to the mockups.
