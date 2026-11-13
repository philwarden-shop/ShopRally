// SalesMax v2 TEST copy — web entry point (Lambda Function URL).
import { sessionKey, verify, loginRedirect, finishLogin, logoutUrl, cookie } from './auth.mjs';
import { listProjects, getProject, groupByLane, syncFromCoreBridge, setLocation } from './data.mjs';
import { boardPage, projectPage, simplePage, bare, setParallel } from './views.mjs';
import { boardPage as workBoard, itemsPanel } from './boards.mjs';
import { surveyFor, surveyLines, buildPlaceholderEstimate, estimatePage, estimateCta, customerFor } from './estimates.mjs';
import { planCustomerSync, taxGroupFor } from './customers.mjs';
import { suggestOrigination, originationById } from './origination.mjs';
import { readLines, checkLine, buildConfiguredRequest, readPrice, builderPage, catalog } from './builder.mjs';
import { draftFromSurvey } from './estimator.mjs';
import { modifierCharges } from './modprices.mjs';
import { resetDemoConfig } from './admin.mjs';
import { getConfig, putConfig, priceListPage, mergePriceForm, prospectsPage, applyClaimAction, DEMO_CLAIMS, personOf } from './admin.mjs';
import { cbRead } from './cb.mjs';
import { activitiesPage, demoTasks, completeTask, addTask, autoHandoffTasks, mergeAuto, snoozeTask } from './activities.mjs';
import { standingHtml } from './standing.mjs';
import { listCustomers, customersPage, customerPage, mergeProfile, logActivity, voteInsight, warmth, addNeed, activityFromTask, slug as cSlug , flagStrip, slug as cSlug2 , lastConversations } from './custrecord.mjs';
import { extrasHtml, addComment, decidePrice, demoPriceChange, DEFAULT_PRICE_THRESHOLD, customerPo, poFormHtml, readyForecast, forecastHtml, approveEstimateOnline, estimateApprovalHtml } from './portalx.mjs';
import { settingsPage, mergeSettings , withAdminNav } from './settings.mjs';
import { mergeExtra, assignLead } from './adminx.mjs';
import { parseChecklistRows } from './adminwf.mjs';
import { simpleBoardPage, demoRecords, moveRecord, updateFields, BOARD_JS, BOARDS as SIMPLE_BOARDS, addFee, newRecord } from './simpleboards.mjs';
import { roleGroups, roleActivitiesPage } from './roleview.mjs';
import { applyQuoteCheck } from './quotecheck.mjs';
import { readPrefs, prefChange } from './account.mjs';
import { performancePage, teamPage, slipping, repRows } from './perf.mjs';
import { esc, UI_JS } from './views.mjs';
import { newProject, newProjectPage } from './create.mjs';
import { addContact, digest, digestPage, csv } from './extras2.mjs';
import { migrationPage } from './migration.mjs';
import { billingPage, helpPage, setAddon } from './billing.mjs';
import { pricingPage, mergePartPrice, cbLineFor } from './pricing.mjs';
import { searchAll, searchPage2 } from './search2.mjs';
import { packingSlipPage } from './docs2.mjs';
import { rulesPage, mergeRules, listsPage, mergeLists, checkImport } from './salesrules.mjs';
import { parseRequest, requestToRecords, requestPage } from './request.mjs';
import { demoMail, move, markSpam, notSpam, setOutOfOffice, emailPage, coveringTasks } from './email.mjs';
import { sendEmail, mailRows, composer, mailForCustomer, mailTasks, oooForm, signatureForm, sanitizeHtml, EDITOR_JS } from './mailui.mjs';
import { emailTodos, emailCounts, emailFilterBar, wakeSnoozed, snooze, archiveThread, saveDraft, dropDraftFor , unsend, unschedule, undoBar } from './mailtodo.mjs';
import { xpsSearch, matchShipments, newLabels, packagesFromForm, buildPutOrder, xpsPutOrder, xpsTrigger } from './xps.mjs';
import { APPS, readApp, saveApp, connectionsPage, appStatus } from './vault.mjs';
import { addressesFor, addProfileAddress } from './shipping.mjs';
import { sampleData } from './data.mjs';
import { setDestination, destinationPanel, recordLabel, confirmInCoreBridge, completeBlocked, shippingPanel, invoicePage, addressBlock, SHIP_RULES_DEFAULT, mergeShipRules, shipRulesPanel } from './shipping.mjs';
import { page as simplePage0 } from './views.mjs';
import { importBatch, importPage } from './importer.mjs';
import { sequencesPage, mergeSequenceForm, withDefaults, sequenceTodos, markStepDone , sequenceProgress, sequenceProgressHtml } from './sequences.mjs';
import { expectedReady, expectedPanel, lateTasks } from './expected.mjs';
import { listImported, importedPage , loadImported, importedDetailPage } from './cbdata.mjs';
import { checklistsPage, parseChecklistForm, missingRequired, toggleCheck, salesStage } from './checklists.mjs';
import { verifySignature, parseCall, keepLatest, clarityExtra, callsPage, saveCall, listCalls, lookupPhone, phoneBackfillStep } from './calls.mjs';
import { phoneEntries } from './phones.mjs';
import { mergePriority, priorityOf } from './priority.mjs';
import { addNote, notesHtml, projectTasksHtml2, mentionsIn, mentionTask } from './projnotes.mjs';
import { trackLanes, stageLeft, stagePill, targetsFrom } from './stagetime.mjs';
import { indexEntries } from './cbindex.mjs';
import { prospectsView, applyRoute, applyHide, marketJob, viewToggle } from './market.mjs';
import { bookingForm, bookingButton, cleanBooking, helpMeWrite, followUpTask } from './mailextras.mjs';
import { withTemplateDefaults, mergeTemplateForm, templatesPage, templatePicker, pickTemplate, fillT, textToHtml } from './templates.mjs';
import { diffPriceLists, findAffected, resolveAlert, priceTodos, priceBox, DEMO_SHARED } from './pricewatch.mjs';
import { historyStep, historyPanel, newState, saveRecords } from './history.mjs';
import { saveProjects } from './data.mjs';
import { demoTeam, addMember, removeMember, teamAdminPage, isOwner, keyOf } from './team.mjs';
import { projectTasksHtml, historyHtml, approveProject, approveHtml, markLost, lostHtml } from './projectx.mjs';
import { groupTodos } from './activities.mjs';
import { addFeedback, feedbackPage, feedbackInbox, setFeedbackStatus, safePath as fbSafePath } from './feedback.mjs';
import { search, searchPage, mergeMe, mePage, changeLogPage, payPanel } from './misc.mjs';
import { demoJobs, tick, fieldPage } from './field.mjs';
import { seedVisit, visitAct, visitPage, startPage as svStartPage } from './sitevisit.mjs';
import { needsShippingAccount, shippingDraft, orderComplete, completedDraft, draftsPanel, demoInvoices, pastDuePage } from './drafts.mjs';
import { slug as custSlug } from './custrecord.mjs';
import { stuckItems, stepById, STEPS, STEP_TARGET_DAYS, stepTargetsFrom } from './workflow.mjs';
import { baseline, editDraft, builderPage as wfBuilderPage, proofReminders, proofPanel, interpret, addRule } from './wfbuilder.mjs';
import { reconPage, demoPayments, markEntered, setupPage, answer, answersToChanges } from './setup.mjs';
import { coordinatorPanel, coordSig } from './ops.mjs';
import { poCheck, poPanel, comingUpToday, demoHandled, coordinatorHtml, projectTiles, tilesHtml } from './ops.mjs';
import { listItems, moveItem, recentLog, resetDemo, projectCbStatus } from './items.mjs';
import { visibleColumns, LIST_COLUMNS } from './workflow.mjs';
import { portalToken, readPortalToken, canSendProof, decideProof, sendProofPage, portalPage, latestProof, APPROVAL_CHECKS, DEMO_PROOFS, readProofOpts } from './proofs.mjs';
import { addProofVersion, latestLink, versionsHtml } from './proofx.mjs';
import { demoProjects } from './data.mjs';

export function formBody(event) {
  const raw = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : (event.body || '');
  return Object.fromEntries(new URLSearchParams(raw));
}
// A project whose items are moving on a board (or waiting on the customer) already has a next step: the board owns it.
const ACTIVE_STEPS = new Set(['prep', 'queue', 'indesign', 'proofqc', 'salesrev', 'proofwait', 'files', 'wip', 'vended', 'qc', 'hold']);
const markOnBoard = (projects, items) => { const on = new Set((items || []).filter((i) => ACTIVE_STEPS.has(i.step)).map((i) => i.projectId)); return projects.map((p) => (on.has(p.id) ? { ...p, onBoard: true } : p)); };
const safeBack = (b, dflt) => (typeof b === 'string' && /^\/[\w/?=&.-]*$/.test(b) && !b.startsWith('//') ? b : dflt);

const SECURITY = {
  'content-type': 'text/html; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'same-origin',
  'strict-transport-security': 'max-age=31536000',
  'content-security-policy': "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; form-action 'self' https://*.amazoncognito.com; frame-ancestors 'none'",
};

const html = (body, status = 200, cookies = []) => ({ statusCode: status, headers: SECURITY, cookies, body });
const redirect = (to, cookies = []) => ({ statusCode: 302, headers: { location: to, 'cache-control': 'no-store' }, cookies, body: '' });

export function readCookies(event) {
  const out = {};
  for (const c of event.cookies || []) { const i = c.indexOf('='); if (i > 0) out[c.slice(0, i).trim()] = c.slice(i + 1).trim(); }
  return out;
}

export const handler = async (event) => {
  const res = await route(event);
  const p0 = (event && event.rawPath) || '/';
  if (res && res.statusCode === 200 && /^\/(admin\/|setup\/workflow|reports\/|log$)/.test(p0)) { try { res.body = withAdminNav(res.body, p0); } catch { /* leave page as is */ } }
  return res;
};
const route = async (event) => {
  const path = event.rawPath || '/';
  const method = event.requestContext?.http?.method || 'GET';
  const host = event.headers?.host;
  const base = `https://${host}/`;
  const q = event.queryStringParameters || {};
  const mode = q.mode === 'live' ? 'live' : 'demo';
  setLocation('nky');
  if (event && event.job === 'history') {
    // Every 10 minutes, rebuild the Prospects / market summary if it is over 6 hours old (skips that minute's import step).
    if (new Date().getUTCMinutes() % 10 === 5) { try { const t0 = Date.now(); await marketJob({ getConfig, putConfig, today: new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' }) }); if (Date.now() - t0 > 3000) return { market: 'rebuilt' }; } catch { /* next time */ } }
    try { await phonesJob(); } catch { /* next minute */ } return historyJob();
  }
  if (path === '/hooks/calls') return callsHook(event, method);
  try {
    const key = await sessionKey();
    const jar = readCookies(event);

    if (path === '/signed-out') return html(bare('Signed out', 'You are signed out of the SalesMax test copy.', ['Sign in again', '/']));
    if (path === '/auth/callback') {
      if (q.error) return html(bare('Sign-in cancelled', q.error_description || q.error, ['Try again', '/']), 400);
      const done = await finishLogin({ base, code: q.code, state: q.state, pendingCookie: jar.smx_login, key });
      return redirect('/activities', [done.cookie, cookie('smx_login', '', 0)]);
    }

    // Customer Order Portal: public, signed link, no staff sign-in. Only sees its own project.
    const pm = path.match(/^\/p\/([\w.-]+)(?:\/items\/([\w-]+)|\/(comment|price|email-link|po|approve-estimate))?$/);
    if (pm) {
      const t = readPortalToken(pm[1], key);
      if (!t) return html(bare('Link expired', 'This link has expired or is not valid. Please ask us for a new one.'), 403);
      const project = (await listProjects('demo')).projects.find((x) => x.id === t.p);
      if (!project) return html(bare('Not found', 'We could not find this order.'), 404);
      const mine = (await listItems()).filter((i) => i.projectId === project.id);
      const self = `/p/${pm[1]}`;
      if (pm[2] && method === 'POST') {
        const o = event.headers?.origin;
        if (o && o !== `https://${host}`) return html(bare('Blocked', 'That request came from another site.'), 403);
        const it = mine.find((i) => i.id === pm[2]);
        if (!it) return redirect(`${self}?error=${encodeURIComponent('We could not find that item.')}`);
        const f = formBody(event);
        try {
          const axP = await getConfig('admin-extra', null).catch(() => null); const aList = (axP && Array.isArray(axP.approvalChecks) && axP.approvalChecks.length) ? axP.approvalChecks : APPROVAL_CHECKS;
          const d = decideProof(it, f.decision, { checks: aList.map((_, n) => f[`check${n}`]).filter(Boolean), notes: f.notes, list: aList, mustAll: axP ? axP.approvalAll !== false : true });
          await moveItem(it.id, d.to, { by: `customer:${project.contact}`, note: d.note, reason: d.note });
          const msg = d.to === 'files' ? `Thank you! "${it.name}" is approved and going to production.` : `Thanks, we got your changes for "${it.name}". We will send a new proof soon.`;
          return redirect(`${self}?flash=${encodeURIComponent(msg)}`);
        } catch (e) {
          return redirect(`${self}?error=${encodeURIComponent(e.message.charAt(0).toUpperCase() + e.message.slice(1) + '.')}`);
        }
      }
      const pkey = `portal-${project.id}`;
      let px = {};
      try { px = await getConfig(pkey, {}); } catch { /* none yet */ }
      if (!('priceChange' in px)) px.priceChange = demoPriceChange(project.id);
      let threshold = DEFAULT_PRICE_THRESHOLD;
      let cardFee = 3;
      try { const a0 = await getConfig('admin-settings', {}); threshold = Number(a0.priceApprovalThreshold ?? DEFAULT_PRICE_THRESHOLD); cardFee = Number(a0.cardFeePct ?? 3); } catch { /* default */ }
      if (pm[3] && method === 'POST') {
        const o = event.headers?.origin;
        if (o && o !== `https://${host}`) return html(bare('Blocked', 'That request came from another site.'), 403);
        const f = formBody(event);
        const who = project.contact || 'Customer';
        try {
          let msg = '';
          if (pm[3] === 'comment') { px.comments = addComment(px.comments, f.text, { who, at: new Date().toISOString() }); msg = 'Thanks, we got your comment.'; }
          if (pm[3] === 'price') { px.priceChange = decidePrice(px.priceChange, f.decision, { by: who, at: new Date().toISOString(), threshold }); msg = px.priceChange.status === 'approved' ? 'New price approved. Thank you!' : 'Got it. We will call you before changing anything.'; }
          if (pm[3] === 'approve-estimate') {
            const ov = await getConfig('lane-overrides', {}).catch(() => ({}));
            await putConfig('lane-overrides', approveEstimateOnline(ov, project, f, { at: new Date().toISOString() }));
            const td = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
            const tk = await getConfig('tasks-phil', demoTasks(td)).catch(() => demoTasks(td));
            await putConfig('tasks-phil', [...tk, { id: `dep-${project.id}`, kind: 'email', title: `Collect the deposit: ${project.name} was approved online`, customer: project.company, projectId: project.id, due: td, done: false }]);
            msg = 'Thank you! Your estimate is approved. We will be in touch about the deposit.';
          }
          if (pm[3] === 'po') { await putConfig(`po-${project.id}`, customerPo(f)); msg = 'Thanks, we got your PO.'; }
          if (pm[3] === 'email-link') { px.emailed = true; msg = 'We emailed you the link. (Test copy: no email went out.)'; }
          await putConfig(pkey, px);
          return redirect(`${self}?flash=${encodeURIComponent(msg)}`);
        } catch (e) { return redirect(`${self}?error=${encodeURIComponent(e.message.charAt(0).toUpperCase() + e.message.slice(1) + '.')}`); }
      }
      const proofLinks = {};
      for (const it of mine) { try { const l = latestLink(await getConfig(`proofs-${it.id}`, [])); if (l) proofLinks[it.id] = l; } catch { /* none */ } }
      let poC = null; try { poC = await getConfig(`po-${project.id}`, null); } catch { /* none */ }
      const todayF = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
      let admP = {}; try { admP = await getConfig('admin-settings', {}); } catch { /* defaults */ }
      const extras = estimateApprovalHtml(pm[1], project, { depositPct: admP.depositPct ?? 50, notes: admP.estimateNotes ?? 'Prices are good for 30 days. A 50% deposit starts production.' });
      const tgF = stepTargetsFrom(await getConfig('workflow-published', null).catch(() => null));
      const side = forecastHtml((() => { const v = readyForecast(mine, { steps: STEPS, targets: tgF, today: todayF, due: null }); const x = expectedFor(project, mine, todayF); return v.state === 'ready' ? v : { ...v, likely: x.customerDate || v.likely, due: project.due }; })()) + poFormHtml(pm[1], poC) + payPanel(project.balance ?? Math.round((Number(project.total) || 0) * 50) / 100, cardFee) + extrasHtml({ token: pm[1], comments: px.comments || [], priceChange: px.priceChange, threshold, emailed: !!px.emailed });
      const axV = await getConfig('admin-extra', null).catch(() => null);
      const approval = axV && Array.isArray(axV.approvalChecks) && axV.approvalChecks.length ? { list: axV.approvalChecks, policy: axV.proofPolicy || '' } : null;
      return html(portalPage({ project, items: mine, token: pm[1], flash: q.flash, error: q.error, extras, side, proofLinks, approval }));
    }

    if (path === '/static/editor.js') return { statusCode: 200, headers: { 'content-type': 'application/javascript; charset=utf-8', 'cache-control': 'max-age=300', 'x-content-type-options': 'nosniff' }, body: EDITOR_JS };
    if (path === '/static/ui.js') return { statusCode: 200, headers: { 'content-type': 'application/javascript; charset=utf-8', 'cache-control': 'max-age=300', 'x-content-type-options': 'nosniff' }, body: UI_JS };
    if (path === '/static/board.js') return { statusCode: 200, headers: { 'content-type': 'application/javascript; charset=utf-8', 'cache-control': 'max-age=300', 'x-content-type-options': 'nosniff' }, body: BOARD_JS };
    // Public quote request form (no staff sign-in). Lands as a Prospect + a quote task for the owner's list.
    if (path === '/request') {
      const html2 = (b, s = 200) => ({ statusCode: s, headers: SECURITY, body: b });
      if (method === 'POST') {
        const o = event.headers?.origin;
        if (o && o !== `https://${host}`) return html2(bare('Blocked', 'That request came from another site.'), 403);
        const f = formBody(event);
        try {
          const r = parseRequest(f);
          const today12 = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
          const n = (await getConfig('qr-counter', 0).catch(() => 0)) + 1;
          const out = requestToRecords(r, { qrNumber: n, today: today12 });
          await putConfig('qr-counter', n);
          // Auto-assign (Admin › Sales › New Lead Assignment): round robin, counted per month.
          let owner = 'phil';
          { const as = assignLead(await getConfig('admin-extra', null).catch(() => null), await getConfig('lead-assign', null).catch(() => null), today12); if (as) { out.project.salesperson = as.name; owner = keyOf(as.name) || 'phil'; out.task.assignee = owner; await putConfig('lead-assign', as.log); } }
          const xp = await getConfig('extra-projects', []).catch(() => []);
          if (xp.filter((p) => p.source === 'web-request').length >= 300) throw new Error('we could not take more online requests right now. Please call us');
          await putConfig('extra-projects', [...xp, out.project]);
          await putConfig(`tasks-${owner}`, [...(await getConfig(`tasks-${owner}`, owner === 'phil' ? demoTasks(today12) : []).catch(() => [])), out.task]);
          return html2(requestPage({ done: out.qr }));
        } catch (e) {
          if (e.message === 'spam') return html2(requestPage({ done: 'request' }));
          return html2(requestPage({ f, error: e.message.charAt(0).toUpperCase() + e.message.slice(1) + '.' }), 400);
        }
      }
      return html2(requestPage({}));
    }
    const user = verify(jar.smx_session, key);
    if (!user) {
      const go = await loginRedirect(base, key);
      return redirect(go.url, [go.cookie]);
    }
    if (path === '/logout') return redirect(logoutUrl(base), [cookie('smx_session', '', 0)]);
    const sameSite0 = () => { const o = event.headers?.origin; return !o || o === `https://${host}`; };
    user.prefs = readPrefs(jar);
    setLocation(user.prefs.loc);
    try { setParallel(!!((await getConfig('parallel-mode', {})) || {}).on); } catch { setParallel(false); }
    const teamG = await getConfig('team', demoTeam()).catch(() => demoTeam());
    user.isAdmin = isOwner(user.email, teamG);
    if (/^\/(admin|calls|billing|reports\/(reconciliation|past-due))(\/|\.csv|$)/.test(path)) {
      if (!user.isAdmin) return html(simplePage({ user, mode, title: 'Owners Only', message: 'This page is for the owner. Ask them if you need something changed here.', tab: '' }), 403);
    }
    const viewsKey = `views-${personOf(user)}`;
    const savedView = async (b) => { try { return (await getConfig(viewsKey, {}))[b]; } catch { return undefined; } };
    const rememberView = async (b, v) => { try { const prev = await getConfig(viewsKey, {}); if (prev[b] !== v) await putConfig(viewsKey, { ...prev, [b]: v }); } catch { /* best effort */ } };
    if (path === '/me/prefs' && method === 'POST') {
      if (!sameSite0()) return html(bare('Blocked', 'That request came from another site.'), 403);
      let back = '/activities';
      try { const ref = new URL(event.headers?.referer || ''); if (ref.host === host) back = safeBack(ref.pathname + ref.search, back); } catch { /* default */ }
      try { return redirect(back, prefChange(formBody(event)).map(([n, val]) => cookie(n, val, 31536000))); }
      catch (e) { return redirect(back); }
    }

    if (path === '/') return redirect('/activities');
    if (path === '/projects') {
      let { projects, syncedAt } = await listProjects(mode);
      if (mode === 'demo') {
        const all = await listItems();
        const laneOf = { WIP: 'progress', BUILT: 'built', COMPLETED: 'complete' };
        projects = projects.map((p) => (all.some((i) => i.projectId === p.id) ? { ...p, lane: laneOf[projectCbStatus(all, p.id)] || p.lane } : p));
      }
      let tiles = '';
      const flags = {};
      if (mode === 'demo') {
        const today1 = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
        let tk = demoTasks(today1); try { tk = await getConfig(`tasks-${personOf(user)}`, tk); } catch { /* demo */ }
        const held = new Set((await listItems()).filter((i) => /^hold/.test(i.step || '')).map((i) => i.projectId));
        tiles = tilesHtml(projectTiles(projects, tk, today1, held));
        const openT = new Set(mergeAuto(tk, autoHandoffTasks(await listItems(), projects, today1)).filter((t) => !t.done).map((t) => t.projectId));
        for (const p of projects) { const f = []; if (held.has(p.id) || (p.due && p.due < today1 && !['complete', 'lost'].includes(p.lane))) f.push('Stuck'); if (!openT.has(p.id) && !['complete', 'lost'].includes(p.lane)) f.push('No next step'); if (f.length) flags[p.id] = f; }
      }
      const checklists = mode === 'demo' ? { saved: await getConfig('checklists', null).catch(() => null), checks: await getConfig('checks', {}).catch(() => ({})) } : null;
      if (mode === 'demo') { try { const cos = [...new Set(projects.map((pp) => pp.company))]; const prs = await Promise.all(cos.map((cn) => getConfig(`customer-${cSlug2(cn)}`, {}).catch(() => ({})))); const pm = Object.fromEntries(cos.map((cn, n) => [cn, priorityOf(prs[n])])); projects = projects.map((pp) => (pm[pp.company] ? { ...pp, priority: pm[pp.company].level, prioScore: pm[pp.company].score } : pp)); } catch { /* optional */ } }
      if (mode === 'demo') { try { const ls2 = await getConfig('lane-since', {}).catch(() => ({})); const tr2 = trackLanes(ls2, projects, new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })); if (tr2.changed) await putConfig('lane-since', tr2.since); } catch { /* optional */ } }
      return html(boardPage({ f: { view: q.view, show: q.show, due: q.due, prio: q.prio }, user, mode, lanes: groupByLane(projects), syncedAt, flash: q.flash, tiles, flags, checklists }));
    }
    if (path === '/projects/sync' && method === 'POST') {
      if (user.prefs.loc !== 'nky') return redirect(`/projects?mode=live&flash=${encodeURIComponent('CoreBridge is connected for Northern Kentucky only so far.')}`);
      const origin = event.headers?.origin;
      if (origin && origin !== `https://${host}`) return html(bare('Blocked', 'That request came from another site.'), 403);
      try {
        const r = await syncFromCoreBridge();
        return redirect(`/projects?mode=live&flash=${encodeURIComponent(`Refreshed ${r.count} estimates from CoreBridge.`)}`);
      } catch (e) {
        return redirect(`/projects?mode=live&flash=${encodeURIComponent(e.code === 'busy' ? 'CoreBridge is busy right now. Try again in a minute.' : 'CoreBridge refresh failed: ' + e.message)}`);
      }
    }
    const sameSite = () => { const o = event.headers?.origin; return !o || o === `https://${host}`; };
    const sbn = path.match(/^\/boards\/(permits|purchasing)\/new$/);
    if (sbn && method === 'POST') {
      if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
      let recN = demoRecords(sbn[1]); try { recN = await getConfig(`board-${sbn[1]}`, recN); } catch { /* demo */ }
      try { await putConfig(`board-${sbn[1]}`, newRecord(recN, formBody(event), sbn[1])); return redirect(`/boards/${sbn[1]}?flash=${encodeURIComponent('Added to the first column.')}`); }
      catch (e) { return redirect(`/boards/${sbn[1]}?flash=${encodeURIComponent('Not added: ' + e.message)}`); }
    }
    const sbm = path.match(/^\/boards\/(permits|purchasing)(?:\/([\w-]+)\/(move|fields|quote|check|fee))?$/);
    if (sbm) {
      const board = sbm[1];
      let records = demoRecords(board);
      try { records = await getConfig(`board-${board}`, records); } catch { /* demo */ }
      if (board === 'purchasing' && sbm[2] && sbm[3] === 'quote' && method === 'POST') {
        if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
        const today11 = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
        const rec = records.find((x) => x.id === sbm[2]);
        const proj = rec ? demoProjects().find((p) => p.id === rec.project) : null;
        try { records = applyQuoteCheck(records, sbm[2], formBody(event), { today: today11, due: proj?.due }); await putConfig(`board-${board}`, records); const lv = records.find((x) => x.id === sbm[2]).quoteCheck.level; return redirect(`/boards/${board}?flash=${encodeURIComponent(lv === 'ok' ? 'Quote checks out.' : lv === 'review' ? 'Quote needs a look. See the notes on the card.' : 'Quote blocked. See the notes on the card.')}`); }
        catch (e) { return redirect(`/boards/${board}?flash=${encodeURIComponent('Not checked: ' + e.message)}`); }
      }
      if (sbm[2] && method === 'POST') {
        if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
        const f = formBody(event);
        if (sbm[3] === 'check') { const all = await getConfig('checks', {}).catch(() => ({})); const rec0 = records.find((x) => x.id === sbm[2]); if (rec0) { all[`b:${board}:${rec0.id}`] = toggleCheck(all[`b:${board}:${rec0.id}`] || {}, `${board}-${rec0.col}`, f.n); await putConfig('checks', all); } return redirect(safeBack(f.back, `/boards/${board}`)); }
        if (sbm[3] === 'move') { const rec0 = records.find((x) => x.id === sbm[2]); const clEnf = await getConfig('checklist-enforce', { on: true }).catch(() => ({ on: true })); if (rec0 && f.to !== rec0.col && clEnf.on !== false) { const miss = missingRequired(await getConfig('checklists', null).catch(() => null), `${board}-${rec0.col}`, ((await getConfig('checks', {}).catch(() => ({})))[`b:${board}:${rec0.id}`] || {})[`${board}-${rec0.col}`] || []); if (miss.length) return redirect(`/boards/${board}?flash=${encodeURIComponent('Not moved: finish the checklist first (' + miss.join(', ') + ').')}`); } }
        try {
          records = sbm[3] === 'move' ? moveRecord(records, sbm[2], f.to, board) : sbm[3] === 'fee' && board === 'permits' ? addFee(records, sbm[2], f) : updateFields(records, sbm[2], f, board);
          await putConfig(`board-${board}`, records);
          return redirect(`/boards/${board}?flash=${encodeURIComponent(sbm[3] === 'move' ? 'Moved.' : 'Saved.')}`);
        } catch (e) { return redirect(`/boards/${board}?flash=${encodeURIComponent('Not changed: ' + e.message)}`); }
      }
      let view = q.view || jar[`smx_view_${board}`] || (await savedView(board)) || 'board';
      if (q.view && ['board', 'list'].includes(q.view)) await rememberView(board, q.view);
      if (!['board', 'list'].includes(view)) view = 'board';
      return html(simpleBoardPage({ user, board, records, view, flash: q.flash || '', checklists: { saved: await getConfig('checklists', null).catch(() => null), checks: await getConfig('checks', {}).catch(() => ({})) } }), 200, q.view ? [cookie(`smx_view_${board}`, view, 31536000)] : []);
    }
    const bm = path.match(/^\/boards\/(design|production)$/);
    if (bm) {
      const board = bm[1];
      const setCookies = [];
      let view = q.view || jar[`smx_view_${board}`] || (await savedView(board)) || 'board';
      if (!['board', 'list'].includes(view)) view = 'board';
      if (q.view) { setCookies.push(cookie(`smx_view_${board}`, view, 31536000)); await rememberView(board, view); }
      let hidden = jar[`smx_hide_${board}`] != null ? decodeURIComponent(jar[`smx_hide_${board}`]).split(',').filter(Boolean) : null;
      if (q.cols) {
        const chosen = new Set(String(q.c || '').split(',').filter(Boolean)); // Function URLs join repeated c= values with commas
        hidden = LIST_COLUMNS[board].filter((c) => !c.lock && !chosen.has(c.key)).map((c) => c.key);
        setCookies.push(cookie(`smx_hide_${board}`, encodeURIComponent(hidden.join(',')), 31536000));
      }
      const [items, log] = await Promise.all([listItems(), recentLog(8)]);
      const filters = { who: q.who || '', station: q.station || '', handoff: q.handoff || '', chip: ['ready', 'mine', 'rush', 'late', 'held'].includes(q.chip) ? q.chip : '' };
      const shipInfo = {};
      if (board === 'production') for (const pid of [...new Set(items.map((i) => i.projectId))]) { const d = await getConfig(`dest-${pid}`, null).catch(() => null); if (d && d.type === 'Ship') { const sp = await getConfig(`ship-${pid}`, null).catch(() => null); shipInfo[pid] = { ship: true, packages: (sp && sp.packages) || [] }; } }
      const clSaved = await getConfig('checklists', null).catch(() => null);
      const clChecks = await getConfig('checks', {}).catch(() => ({}));
      const custFlags = {};
      for (const cn of [...new Set(items.map((x) => x.customer).filter(Boolean))]) { const cp1 = await getConfig(`customer-${cSlug2(cn)}`, null).catch(() => null); if (cp1 && cp1.flag) custFlags[cn] = cp1.flag; }
      return html(workBoard({ user, board, items, view, columns: visibleColumns(board, hidden), log, flash: q.flash, filters, shipInfo, checklists: { saved: clSaved, checks: clChecks }, custFlags, holdReasons: ((((await getConfig('admin-extra', null).catch(() => null)) || {}).tags || []).find((g) => g && g.name === 'Hold reasons') || {}).tags }), 200, setCookies);
    }
    const mv = path.match(/^\/items\/([\w-]+)\/move$/);
    if (mv && method === 'POST') {
      if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
      const f = formBody(event);
      const back = safeBack(f.back, '/boards/production');
      const [to, reason] = String(f.to || '').split('|');
      if (to !== 'hold') {
        const itc = (await listItems()).find((i) => i.id === mv[1]);
        const clEnf = await getConfig('checklist-enforce', { on: true }).catch(() => ({ on: true }));
        if (itc && clEnf && clEnf.on !== false) {
          const miss = missingRequired(await getConfig('checklists', null).catch(() => null), itc.step, ((await getConfig('checks', {}).catch(() => ({})))[itc.id] || {})[itc.step] || []);
          if (miss.length) return redirect(`${back}${back.includes('?') ? '&' : '?'}flash=${encodeURIComponent('Not moved: finish the checklist first (' + miss.join(', ') + ').')}`);
        }
      }
      if (to === 'built') {
        const itb = (await listItems()).find((i) => i.id === mv[1]);
        if (itb) {
          const d0 = await getConfig(`dest-${itb.projectId}`, null).catch(() => null);
          const s0 = await getConfig(`ship-${itb.projectId}`, null).catch(() => null);
          const r0 = (await getConfig('ship-rules', {}).catch(() => ({}))) || {};
          if (r0.requireDetails !== false && d0 && (r0.types || ['Ship']).includes(d0.type) && !(s0 && s0.packages && s0.packages.length)) return redirect(`${back}${back.includes('?') ? '&' : '?'}flash=${encodeURIComponent('Not moved: this order ships. Open Shipping Details on the card, enter the weight and size, then move it to Built.')}`);
        }
      }
      if (to === 'done') {
        const itx = (await listItems()).find((i) => i.id === mv[1]);
        if (itx) {
          const why = completeBlocked(await getConfig(`dest-${itx.projectId}`, null).catch(() => null), await getConfig(`ship-${itx.projectId}`, null).catch(() => null));
          if (why) return redirect(`${back}${back.includes('?') ? '&' : '?'}flash=${encodeURIComponent('Not moved: ' + why)}`);
        }
      }
      try {
        const r = await moveItem(mv[1], to, { reason, by: user.email });
        let msg = r.log.cbWouldPush ? `Moved “${r.item.name}”. SalesMax would push ${r.log.cbWouldPush} to CoreBridge (writes are off in the test copy).` : `Moved “${r.item.name}”. Holds stay in SalesMax, so nothing is sent to CoreBridge.`;
        if (to === 'built') { try { msg += await afterBuilt(r.item.projectId, `auto (${user.email})`); } catch (e) { msg += ' Shipping step skipped: ' + e.message; } }
        return redirect(`${back}${back.includes('?') ? '&' : '?'}flash=${encodeURIComponent(msg)}`);
      } catch (e) {
        return redirect(`${back}${back.includes('?') ? '&' : '?'}flash=${encodeURIComponent('Not moved: ' + e.message)}`);
      }
    }
    if (path === '/demo/reset' && method === 'POST') {
      if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
      await resetDemo();
      const back = safeBack(formBody(event).back, '/boards/design');
      return redirect(`${back}?flash=${encodeURIComponent('Demo reset to the starting point.')}`);
    }
    const pvm = path.match(/^\/items\/([\w-]+)\/proof-version$/);
    if (pvm && method === 'POST') {
      if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
      let lst = []; try { lst = await getConfig(`proofs-${pvm[1]}`, []); } catch { /* none */ }
      const demoV = (DEMO_PROOFS[pvm[1]] || []).reduce((a, p) => Math.max(a, p.v), 0);
      try { lst = addProofVersion(lst, formBody(event), { by: user.email, at: new Date().toISOString(), startAt: demoV }); await putConfig(`proofs-${pvm[1]}`, lst); return redirect(`/items/${pvm[1]}/send-proof?flash=${encodeURIComponent(`Proof v${lst[lst.length - 1].v} added.`)}`); }
      catch (e) { return redirect(`/items/${pvm[1]}/send-proof?flash=${encodeURIComponent('Not added: ' + e.message)}`); }
    }
    const sp = path.match(/^\/items\/([\w-]+)\/send-proof$/);
    if (sp) {
      const all = await listItems();
      const it = all.find((i) => i.id === sp[1]);
      if (!it) return html(simplePage({ user, mode, title: 'Not found', message: 'That item is not here.', tab: 'Design' }), 404);
      const p = await getProject(it.projectId, 'demo');
      if (method === 'POST') {
        if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
        if (!canSendProof(it)) return redirect(`/items/${it.id}/send-proof?flash=${encodeURIComponent('This item is not at proof review, so there is no proof to send.')}`);
        try { await putConfig(`proofopts-${it.id}`, readProofOpts(formBody(event))); } catch (e) { return redirect(`/items/${it.id}/send-proof?flash=${encodeURIComponent('Not sent: ' + e.message)}`); }
        if (it.step === 'salesrev') await moveItem(it.id, 'proofwait', { by: user.email, note: `Proof v${latestProof(it.id).v} sent to the customer.` });
        return redirect(`/items/${it.id}/send-proof?flash=${encodeURIComponent(`Proof v${latestProof(it.id).v} marked as sent. Now waiting on the customer. (Test copy: no email went out.)`)}`);
      }
      const contact = { name: p?.contact || '', email: `${String(p?.contact || 'customer').toLowerCase().replace(/[^a-z]+/g, '.')}@example.com` };
      let pv = []; try { pv = await getConfig(`proofs-${it.id}`, []); } catch { /* none */ }
      const optsSaved = await getConfig(`proofopts-${it.id}`, null).catch(() => null);
      return html(sendProofPage({ user, item: it, project: p || { id: it.projectId, name: it.projectId }, contact, proof: latestProof(it.id), portalUrl: `/p/${portalToken(it.projectId, key)}`, flash: q.flash, saved: optsSaved }).replace('</body>', `<div class="wrap">${versionsHtml(it.id, pv, DEMO_PROOFS[it.id] || [])}</div></body>`));
    }
    const rcm = path.match(/^\/reports\/reconciliation(?:\/([\w-]+))?$/);
    if (rcm) {
      const today2 = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
      let pays = demoPayments(today2);
      try { pays = await getConfig('recon-payments', pays); } catch { /* demo */ }
      if (rcm[1] && method === 'POST') {
        if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
        try { pays = markEntered(pays, rcm[1], personOf(user), new Date().toISOString()); await putConfig('recon-payments', pays); return redirect('/reports/reconciliation?flash=' + encodeURIComponent('Marked as entered.')); }
        catch (e) { return redirect('/reports/reconciliation?flash=' + encodeURIComponent('Not changed: ' + e.message)); }
      }
      return html(reconPage({ user, payments: pays, flash: q.flash || '' }));
    }
    if (path === '/reports/past-due') {
      const today4 = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
      let adm = {}; try { adm = await getConfig('admin-settings', {}); } catch { /* defaults */ }
      const invs = demoInvoices(today4);
      const links = Object.fromEntries(invs.map((i) => [i.id, `${base}p/${portalToken(i.projectId, key)}`]));
      return html(pastDuePage({ user, invoices: invs, today: today4, links, remindersOn: adm.pastDueReminders !== false, tpl: adm.tplPastDue || '' }));
    }
    if (path === '/setup/workflow/build' && method === 'POST') {
      if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
      let ans = []; try { ans = await getConfig('setup-answers', []); } catch { /* none */ }
      const base1 = baseline(STEPS, STEP_TARGET_DAYS);
      let pub = base1, draft = null; try { pub = await getConfig('workflow-published', base1); draft = await getConfig('workflow-draft', null); } catch { /* defaults */ }
      await putConfig('workflow-draft', editDraft(draft || pub, answersToChanges(ans, draft || pub)));
      return redirect('/admin/workflow?flash=' + encodeURIComponent('Built from your answers. Review the draft, then Publish.'));
    }
    if (path === '/setup/workflow/skip' && method === 'POST') {
      if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
      await putConfig('workflow-draft', baseline(STEPS, STEP_TARGET_DAYS));
      return redirect('/admin/workflow?flash=' + encodeURIComponent('Started from the standard FASTSIGNS workflow. Review the draft, then Publish Changes.'));
    }
    if (path === '/setup/workflow') {
      let ans = [];
      try { ans = await getConfig('setup-answers', []); } catch { /* none */ }
      if (method === 'POST') {
        if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
        const f = formBody(event);
        try { ans = answer(ans, f.i, f.send ? f.custom : f.text); await putConfig('setup-answers', ans); return redirect(`/setup/workflow?at=${Number(f.i) + 1}`); }
        catch (e) { return html(setupPage({ user, answers: ans, at: Number(f.i) || 0, flash: e.message.charAt(0).toUpperCase() + e.message.slice(1) + '.' }), 400); }
      }
      const at = q.at != null ? Number(q.at) : ans.filter(Boolean).length;
      return html(setupPage({ user, answers: ans, at }));
    }
    if (path === '/admin/workflow') {
      const base0 = baseline(STEPS, STEP_TARGET_DAYS);
      let pub = base0, draft = null;
      try { pub = await getConfig('workflow-published', base0); draft = await getConfig('workflow-draft', null); } catch { /* defaults */ }
      draft = draft || pub;
      if (method === 'POST') {
        if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
        const f = formBody(event);
        try {
          if (f.do === 'addrule') { const cur = await getConfig('workflow-rules', []).catch(() => []); await putConfig('workflow-rules', addRule(cur, f.rule)); return redirect('/admin/workflow?flash=' + encodeURIComponent('Rule added.') + '#wf-rules'); }
          if (f.do === 'chat') { const it = interpret(draft, f.say); const next = editDraft(draft, it.changes); await putConfig('workflow-draft', next); return html(wfBuilderPage({ user, published: pub, draft: next, reply: it.reply })); }
          if (f.do === 'discard') { await putConfig('workflow-draft', pub); return redirect('/admin/workflow?flash=' + encodeURIComponent('Draft discarded.')); }
          const next = editDraft(draft, f);
          await putConfig('workflow-draft', next);
          if (f.do === 'publish') { await putConfig('workflow-published', next); return redirect('/admin/workflow?flash=' + encodeURIComponent('Published. Everyone now works from this version.')); }
          return redirect('/admin/workflow?flash=' + encodeURIComponent('Draft saved. Publish when you are ready.'));
        } catch (e) { return html(wfBuilderPage({ user, published: pub, draft, error: 'Not saved: ' + e.message + '.' }), 400); }
      }
      const sr0 = (await getConfig('ship-rules', null).catch(() => null)) || SHIP_RULES_DEFAULT;
      const wr0 = await getConfig('workflow-rules', []).catch(() => []);
      return html(wfBuilderPage({ user, published: pub, draft, flash: q.flash || '', rules: Array.isArray(wr0) ? wr0 : [], test: q.test === 'rush' }).replace('</main>', shipRulesPanel(sr0) + '</main>'));
    }
    if (path === '/admin/reset-demo' && method === 'POST') {
      if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
      const n = await resetDemoConfig();
      await resetDemo();
      return redirect('/admin?flash=' + encodeURIComponent(`Sample data reset (${n} saved changes cleared). Admin settings were kept.`));
    }
    if (path === '/admin/connections' || /^\/admin\/connections\/(xps|cardpointe|corebridge|clarity)$/.test(path)) {
      const appId = path.split('/')[3];
      if (appId && method === 'POST') {
        if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
        try { await saveApp(appId, formBody(event), user.email); return redirect('/admin/connections?flash=' + encodeURIComponent(`${APPS[appId].name} keys saved to AWS.`)); }
        catch (e) { return redirect('/admin/connections?flash=' + encodeURIComponent('Not saved: ' + e.message)); }
      }
      const saved = {}; let warn = '';
      for (const a of Object.keys(APPS)) { try { saved[a] = await readApp(a); } catch { warn = 'Could not read saved keys right now.'; } }
      const par0 = await getConfig('parallel-mode', {}).catch(() => ({}));
      const clV = await getConfig('clarity-verification', null).catch(() => null);
      const clL = await getConfig('calls-latest', []).catch(() => []);
      return html(connectionsPage({ user, saved, flash: q.flash || warn, parallel: !!(par0 && par0.on), extras: { clarity: clarityExtra({ hookUrl: `https://${host}/hooks/calls`, latest: clL, verification: clV }) } }));
    }
    if (path === '/admin/parallel' && method === 'POST') {
      if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
      const on = formBody(event).on === '1';
      await putConfig('parallel-mode', { on, by: user.email, at: new Date().toISOString() });
      return redirect('/admin/connections?flash=' + encodeURIComponent(on ? 'Parallel mode is on. SalesMax sends nothing to customers, CoreBridge or XPS.' : 'Parallel mode is off.'));
    }
    if (path === '/admin/ship-rules' && method === 'POST') {
      if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
      await putConfig('ship-rules', { ...mergeShipRules(formBody(event)), by: user.email, at: new Date().toISOString() });
      return redirect('/admin/workflow?flash=' + encodeURIComponent('Shipping rules saved.') + '#ship-rules');
    }
    if (path === '/admin/history' && method === 'POST') {
      if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
      const on = formBody(event).on === '1';
      await putConfig('history-job', { on, by: user.email, at: new Date().toISOString() });
      return redirect('/admin/import?flash=' + encodeURIComponent(on ? 'History import is running. It adds about 200 records a minute and picks up where it left off.' : 'History import paused.') + '#history');
    }
    if (path === '/admin/sequences') {
      let seqs = await getConfig('sequences', null).catch(() => null);
      if (method === 'POST') {
        if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
        const f = formBody(event);
        try { seqs = mergeSequenceForm(seqs, f.id, f); await putConfig('sequences', seqs); const s0 = seqs.find((x) => x.id === f.id); const bkS = q.back ? safeBack(q.back, '/admin/sequences') : '/admin/sequences'; return redirect(bkS + (bkS.includes('?') ? '&' : '?') + 'flash=' + encodeURIComponent(f.do === 'toggle' ? `${s0.name} is ${s0.on ? 'on' : 'off'}.` : f.do === 'reset' ? 'Back to the prebuilt steps.' : f.add ? 'Step added. Fill it in and save.' : 'Saved.') + (q.back ? '#seqs-h' : '#seq-' + encodeURIComponent(f.id))); }
        catch (e) { return redirect('/admin/sequences?flash=' + encodeURIComponent('Not saved: ' + e.message)); }
      }
      return html(sequencesPage({ page: (o) => simplePage0(o), user, seqs, flash: q.flash || '' }));
    }
    if (path === '/sequences/done' && method === 'POST') {
      if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
      const f = formBody(event);
      await putConfig('seqstate', markStepDone(await getConfig('seqstate', {}).catch(() => ({})), String(f.key || ''), f.n));
      return redirect('/activities?flash=' + encodeURIComponent('Done. The next step shows up on its day.'));
    }
    if (path === '/admin/preview-order-page') {
      const pv = (await listProjects('demo')).projects[0];
      if (!pv) return redirect('/admin?tab=orders&flash=' + encodeURIComponent('No sample project to preview yet.'));
      return redirect(`/p/${portalToken(pv.id, key)}`);
    }
    if (path === '/admin/checklists') {
      if (method === 'POST') {
        if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
        const fCl = formBody(event); const customCl = await getConfig('custom-stages', []).catch(() => []);
        if (fCl.rows === '1') {
          await putConfig('checklists', parseChecklistRows(fCl, await getConfig('checklists', null).catch(() => null), customCl));
          const bp = safeBack(q.back, '/admin?tab=work');
          return redirect(bp + (bp.includes('?') ? '&' : '?') + 'flash=' + encodeURIComponent(fCl.del ? 'Checklist item removed.' : 'Checklists saved. Cards show them right away.') + '#stagecl-h');
        }
        await putConfig('checklists', parseChecklistForm(fCl, customCl));
        return redirect('/admin/checklists?flash=' + encodeURIComponent('Checklists saved. Cards show them right away.'));
      }
      return html(checklistsPage({ page: (o) => simplePage0(o), user, saved: await getConfig('checklists', null).catch(() => null), custom: await getConfig('custom-stages', []).catch(() => []), flash: q.flash || '' }));
    }
    if (path === '/calls') {
      let calls = await listCalls().catch(() => null);
      if (!calls || !calls.length) calls = await getConfig('calls-latest', []).catch(() => []);
      return html(callsPage({ page: simplePage0, user, calls, f: q, backfill: await getConfig('phones-backfill', null).catch(() => null) }));
    }
    const pnm = path.match(/^\/projects\/([\w-]+)\/notes$/);
    if (pnm && method === 'POST') {
      if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
      try {
        const txtN = formBody(event).text;
        await putConfig(`notes-${pnm[1]}`, addNote(await getConfig(`notes-${pnm[1]}`, []).catch(() => []), txtN, { by: user.name || user.email, at: new Date().toISOString() }));
        const teamN = await getConfig('team', demoTeam()).catch(() => demoTeam());
        const whoN = mentionsIn(txtN, teamN).filter((t) => t.key !== personOf(user));
        if (whoN.length) { const pN = await getProject(pnm[1], 'demo').catch(() => null) || { id: pnm[1] }; const tdN = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' }); for (const t of whoN) { const tk = await getConfig(`tasks-${t.key}`, demoTasks(tdN)).catch(() => demoTasks(tdN)); await putConfig(`tasks-${t.key}`, mentionTask(tk, { note: txtN, by: user.name || user.email, project: pN, today: tdN })); } }
        return redirect(`/projects/${pnm[1]}?mode=demo&tab=notes&flash=${encodeURIComponent(whoN.length ? `Note added. ${whoN.map((t) => t.name).join(', ')} got a task on Activities.` : 'Note added.')}`);
      }
      catch (e) { return redirect(`/projects/${pnm[1]}?mode=demo&tab=notes&flash=${encodeURIComponent('Not added: ' + e.message)}`); }
    }
    const ppm = path.match(/^\/projects\/([\w-]+)\/prices$/);
    if (ppm && method === 'POST') {
      if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
      const f = formBody(event);
      try {
        const r = resolveAlert(await getConfig('price-alerts', {}).catch(() => ({})), await getConfig('shared-prices', sampleData() ? DEMO_SHARED : {}).catch(() => ({})), ppm[1], f.do, { by: user.name || user.email, at: new Date().toISOString() });
        await putConfig('price-alerts', r.alerts); await putConfig('shared-prices', r.shared);
        return redirect(`/projects/${ppm[1]}?mode=demo&flash=${encodeURIComponent(f.do === 'keep' ? 'Shared prices kept.' : 'Updated to the latest prices. Send the new version for approval.')}`);
      } catch (e) { return redirect(`/projects/${ppm[1]}?mode=demo&flash=${encodeURIComponent('Not changed: ' + e.message)}`); }
    }
    const pck = path.match(/^\/projects\/([\w-]+)\/check$/);
    if (pck && method === 'POST') {
      if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
      const f = formBody(event);
      const p = await getProject(pck[1], 'demo');
      if (p) { const all = await getConfig('checks', {}).catch(() => ({})); all['p:' + p.id] = toggleCheck(all['p:' + p.id] || {}, salesStage(q.lane || f.lane || p.lane), f.n); await putConfig('checks', all); }
      return redirect(safeBack(f.back, '/projects?mode=demo'));
    }
    const ckm = path.match(/^\/items\/([\w-]+)\/check$/);
    if (ckm && method === 'POST') {
      if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
      const f = formBody(event);
      const it = (await listItems()).find((i) => i.id === ckm[1]);
      const back = safeBack(f.back, '/boards/production');
      if (it) { const all = await getConfig('checks', {}).catch(() => ({})); all[it.id] = toggleCheck(all[it.id] || {}, it.step, f.n); await putConfig('checks', all); }
      return redirect(back);
    }
    if (path === '/admin/migration') return html(migrationPage({ user }));
    if (path === '/activities/coord-dismiss' && method === 'POST') {
      if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
      const t0 = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
      const items0 = await listItems();
      await putConfig(`coord-${personOf(user)}`, { sig: coordSig(comingUpToday(items0, t0), demoHandled(t0)), at: new Date().toISOString() });
      return redirect('/activities?flash=' + encodeURIComponent('Hidden until something new comes up.'));
    }
    if (path === '/admin/rules') {
      const admR = await getConfig('admin-settings', {}).catch(() => ({}));
      if (method === 'POST') {
        if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
        const bkR = q.back ? safeBack(q.back, '/admin/rules') : '/admin/rules';
        const sepR = bkR.includes('?') ? '&' : '?';
        try { await putConfig('admin-settings', mergeRules(admR, formBody(event))); return redirect(bkR + sepR + 'flash=' + encodeURIComponent('Saved.')); }
        catch (e) { return redirect(bkR + sepR + 'flash=' + encodeURIComponent('Not saved: ' + e.message)); }
      }
      return html(rulesPage({ user, adm: admR, flash: q.flash || '' }));
    }
    if (path === '/admin/lists') {
      const listsL = await getConfig('customer-lists', {}).catch(() => ({}));
      if (method === 'POST') {
        if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
        const f = formBody(event);
        if (f.do === 'check') { let chk = null, err = ''; try { chk = checkImport(f.kind, f.csv); } catch (e) { err = 'Not checked: ' + e.message; } return html(listsPage({ user, lists: listsL, check: chk, kind: f.kind, csv: String(f.csv || '').slice(0, 20000), flash: err })); }
        try { await putConfig('customer-lists', mergeLists(listsL, f)); return redirect('/admin/lists?flash=' + encodeURIComponent('Lists saved.')); }
        catch (e) { return redirect('/admin/lists?flash=' + encodeURIComponent('Not saved: ' + e.message)); }
      }
      return html(listsPage({ user, lists: listsL, flash: q.flash || '' }));
    }
    if (path === '/admin/pricing') {
      const savedP = await getConfig('price-parts', {}).catch(() => ({}));
      if (method === 'POST') {
        if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
        try { await putConfig('price-parts', mergePartPrice(savedP, formBody(event))); return redirect('/admin/pricing?tab=parts&flash=' + encodeURIComponent('Saved. Price Check uses the new values; CoreBridge estimates are unchanged.')); }
        catch (e) { return redirect('/admin/pricing?tab=parts&flash=' + encodeURIComponent('Not saved: ' + e.message)); }
      }
      let cbP = null;
      if (q.cb === '1' && (q.tab || 'check') === 'check') {
        const bp = catalog().byId.get(Number(q.part) || 48);
        const ln = cbLineFor(bp, { w: q.w, h: q.h, q: q.q, ds: q.ds === '1' });
        if (!ln) cbP = { ok: false, errors: ['That part is not in the catalog.'] };
        else { try { cbP = readPrice(await cbRead('priceConfiguredOrder', undefined, { body: buildConfiguredRequest({ lines: [ln] }), interactive: true, deadline: Date.now() + 20000 })); } catch (e) { cbP = { ok: false, errors: [e.code === 'busy' ? 'CoreBridge is busy right now. Try again in a minute.' : 'CoreBridge price check failed: ' + e.message] }; } }
      }
      return html(pricingPage({ user, saved: savedP, tab: q.tab || 'check', f: q, flash: q.flash || '', cb: cbP }));
    }
    if (path === '/billing' || path === '/billing/addon') {
      const todayB = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
      const savedB = await getConfig('billing-addons', {}).catch(() => ({}));
      if (path === '/billing/addon' && method === 'POST') {
        if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
        try { await putConfig('billing-addons', setAddon(savedB, formBody(event), todayB)); return redirect('/billing?flash=' + encodeURIComponent('Saved. Test copy: nothing is charged.')); }
        catch (e) { return redirect('/billing?flash=' + encodeURIComponent('Not saved: ' + e.message)); }
      }
      const teamB = await getConfig('team', demoTeam()).catch(() => demoTeam());
      return html(billingPage({ user, people: Math.max(1, (teamB || []).length), saved: savedB, today: todayB, flash: q.flash || '' }));
    }
    if (path === '/help') return html(helpPage({ user }));
    if (path === '/admin/team') {
      let team = demoTeam(); try { team = await getConfig('team', team); } catch { /* demo */ }
      if (method === 'POST') {
        if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
        const f = formBody(event);
        try { team = f.remove ? removeMember(team, f.remove, personOf(user)) : addMember(team, f); await putConfig('team', team); return redirect('/admin/team?flash=' + encodeURIComponent(f.remove ? 'Removed.' : 'Added.')); }
        catch (e) { return redirect('/admin/team?flash=' + encodeURIComponent('Not changed: ' + e.message)); }
      }
      return html(teamAdminPage({ user, team, flash: q.flash || '' }));
    }
    if (path === '/admin/import') {
      let adm = {}; try { adm = await getConfig('admin-settings', {}); } catch { /* defaults */ }
      let state = {}; try { state = await getConfig('import-state', {}); } catch { /* none */ }
      const allowed = adm.importApproved === true && user.prefs.loc === 'nky';
      if (method === 'POST') {
        if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
        if (!allowed) return redirect('/admin/import?flash=' + encodeURIComponent('Import is turned off.'));
        try {
          state = await importBatch({ read: (op, params) => cbRead(op, params, { deadline: Date.now() + 20000 }), save: saveProjects, state, maxCalls: 2 });
          await putConfig('import-state', state);
          return redirect('/admin/import?flash=' + encodeURIComponent(state.done ? 'Import finished.' : 'Batch done. Run the next one when you are ready.'));
        } catch (e) { await putConfig('import-state', state); return redirect('/admin/import?flash=' + encodeURIComponent(e.code === 'busy' ? 'CoreBridge is busy. Try again in a minute.' : 'Stopped: ' + e.message)); }
      }
      const hctl = await getConfig('history-job', {}).catch(() => ({}));
      const hst = await getConfig('history-state', null).catch(() => null);
      return html(importPage({ user, state, allowed, flash: q.flash || '' }).replace('</main>', `<div class="wrap" style="max-width:760px">${historyPanel(hst || newState(), { on: !!(hctl && hctl.on) })}</div></main>`));
    }
    if (path === '/admin') {
      let settings = {};
      try { settings = await getConfig('admin-settings', {}); } catch { /* defaults */ }
      const tab = q.tab || 'company';
      if (method === 'POST') {
        if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
        try {
          const next = mergeSettings(settings, tab, formBody(event));
          next._savedAt = { ...(next._savedAt || {}), [tab]: new Date().toISOString() };
          next._savedBy = user.email;
          await putConfig('admin-settings', next);
          return redirect(`/admin?tab=${encodeURIComponent(tab)}&flash=${encodeURIComponent('Saved.')}`);
        } catch (e) { return html(settingsPage({ user, settings, tab, error: 'Not saved: ' + e.message.charAt(0).toUpperCase() + e.message.slice(1) + '.' }), 400); }
      }
      const extraA = await getConfig('admin-extra', null).catch(() => null);
      const wfX = tab === 'work' ? { checklists: await getConfig('checklists', null).catch(() => null), custom: await getConfig('custom-stages', []).catch(() => []), cl: q.cl || 'sales' } : {};
      const listsX = (tab === 'sales' || tab === 'orders') ? await getConfig('customer-lists', {}).catch(() => ({})) : {};
      const appsX = {};
      if (tab === 'orders' || tab === 'cb') for (const a of ['cardpointe', 'clarity', 'xps', 'corebridge']) { try { appsX[a] = appStatus(a, await readApp(a)).connected; } catch { appsX[a] = false; } }
      return html(settingsPage({ user, settings, tab, flash: q.flash || '', extra: extraA, lists: listsX, apps: appsX, seqs: tab === 'sales' ? await getConfig('sequences', null).catch(() => null) : null, leadLog: tab === 'sales' ? await getConfig('lead-assign', null).catch(() => null) : null, ...wfX }));
    }
    if (path === '/admin/extra' && method === 'POST') {
      if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
      const bkX = q.back ? safeBack(q.back, '/admin?tab=company') : '/admin?tab=company';
      const fX = formBody(event); const goX = /^[\w-]{1,40}$/.test(fX.go || '') ? '#' + fX.go : '';
      try { const cur = await getConfig('admin-extra', null).catch(() => null); const r = mergeExtra(cur, fX); await putConfig('admin-extra', r.x); return redirect(bkX + '&flash=' + encodeURIComponent(r.msg) + goX); }
      catch (e) { return redirect(bkX + '&flash=' + encodeURIComponent('Not saved: ' + e.message + '.') + goX); }
    }
    if (path === '/admin/modifier-prices') {
      let list = [];
      try { list = await getConfig('modifier-prices', []); } catch { /* none yet */ }
      if (method === 'POST') {
        if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
        const f = formBody(event);
        const before = list;
        list = mergePriceForm(list, String(f.group || ''), f);
        await putConfig('modifier-prices', list);
        const changes = diffPriceLists(before, list);
        let hit = 0;
        if (changes.length) {
          const at = new Date().toISOString();
          const shared = await getConfig('shared-prices', sampleData() ? DEMO_SHARED : {}).catch(() => ({}));
          const { projects: projs } = await listProjects('demo');
          const found = findAffected({ shared, changes, projects: projs, at, by: user.email });
          const prevA = await getConfig('price-alerts', {}).catch(() => ({}));
          await putConfig('price-alerts', { ...prevA, ...found });
          const log = await getConfig('price-changes', []).catch(() => []);
          await putConfig('price-changes', [{ at, by: user.email, changes, jobs: Object.keys(found) }, ...log].slice(0, 100));
          hit = Object.keys(found).length;
        }
        return redirect(`/admin/modifier-prices?g=${encodeURIComponent(f.group || '')}&saved=1${hit ? `&jobs=${hit}` : ''}`);
      }
      return html(priceListPage({ user, group: q.g, list, fill: q.fill === '1', flash: q.saved ? (q.jobs ? `Saved. ${q.jobs} open job(s) would change price; each got a "Prices changed" box and a To Do.` : 'Saved.') : '' }));
    }
    if (path === '/prospects') {
      const today = new Date().toISOString().slice(0, 10);
      let claims = DEMO_CLAIMS;
      try { claims = await getConfig('claims', DEMO_CLAIMS); } catch { /* demo */ }
      if (method === 'POST') {
        if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
        const f = formBody(event);
        if (f.reset) { await putConfig('claims', DEMO_CLAIMS); return redirect('/prospects?flash=' + encodeURIComponent('Demo claims reset.')); }
        const action = f.claim ? 'claim' : f.release ? 'release' : f.touch ? 'touch' : '';
        const r = applyClaimAction(claims, { action, business: f.claim || f.release || f.touch, person: personOf(user), today });
        await putConfig('claims', r.claims);
        return redirect('/prospects?flash=' + encodeURIComponent(r.flash));
      }
      return html(prospectsPage({ user, claims, today, flash: q.flash || '' }));
    }
    if (path === '/field/start') {
      const qs = String(q.q || '').trim().toLowerCase();
      const allP = demoProjects().filter((x) => !['complete', 'lost'].includes(x.lane));
      const today6 = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
      const tj = demoJobs(today6).filter((j) => j.kind === 'visit' && j.projectId).map((j) => { const pp = allP.find((x) => x.id === j.projectId) || {}; return { id: j.projectId, company: j.company, name: pp.name || j.title, where: j.address }; });
      const res = qs ? allP.filter((x) => `${x.company} ${x.name}`.toLowerCase().includes(qs)).slice(0, 20).map((x) => ({ id: x.id, company: x.company, name: x.name, where: x.status || '' })) : [];
      return html(svStartPage({ user, q: String(q.q || '').slice(0, 80), results: res, today: tj }));
    }
    // Project scope (mockup ProspectRecord · Scope tab): what the customer wants, written like you'd tell a coworker.
    const scm = path.match(/^\/projects\/([\w-]+)\/scope$/);
    if (scm && method === 'POST') {
      if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
      const p = await getProject(scm[1], 'demo');
      if (!p) return redirect('/projects?mode=demo');
      const text = String(formBody(event).scope || '').replace(/\r/g, '').slice(0, 6000);
      await putConfig(`scope-${p.id}`, { text, at: new Date().toISOString(), by: user.name || user.email });
      return redirect(`/projects/${p.id}?mode=demo&tab=scope&flash=${encodeURIComponent('Scope saved.')}#pscope`);
    }
    const svm = path.match(/^\/projects\/([\w-]+)\/visit$/);
    if (svm) {
      const p = await getProject(svm[1], 'demo');
      if (!p) return redirect('/field/start');
      const vk = `visit-${p.id}`;
      let v = await getConfig(vk, null).catch(() => null);
      v = v || seedVisit(p, sampleData());
      if (method === 'POST') {
        if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
        const f = formBody(event);
        try {
          const r = visitAct(v, f);
          if (r.need) {
            const pk = `customer-${custSlug(p.company)}`;
            const prof = await getConfig(pk, {}).catch(() => ({}));
            const nd = new Date(Date.now() + 90 * 864e5).toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
            const an = addNeed(prof, { needWhat: r.need, needDate: nd }, { at: new Date().toISOString() });
            await putConfig(pk, an.profile);
            const td = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
            let tk = demoTasks(td); try { tk = await getConfig(`tasks-${personOf(user)}`, tk); } catch { /* demo */ }
            await putConfig(`tasks-${personOf(user)}`, [...tk, { ...an.task, customer: p.company, projectId: p.id }]);
          }
          await putConfig(vk, r.v);
          return redirect(`/projects/${p.id}/visit?flash=${encodeURIComponent(r.msg)}`);
        } catch (e) { return html(visitPage({ user, p, v, flash: 'Not saved: ' + e.message + '.' }), 400); }
      }
      return html(visitPage({ user, p, v, flash: q.flash || '' }));
    }
    const fm = path.match(/^\/field(?:\/([\w-]+))?$/);
    if (fm) {
      const today5 = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
      const jobs = demoJobs(today5);
      const fkey = `field-${personOf(user)}-${today5}`;
      let st = {}; try { st = await getConfig(fkey, {}); } catch { /* none */ }
      if (fm[1] && method === 'POST') {
        if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
        const job = jobs.find((j) => j.id === fm[1]);
        if (!job) return redirect('/field?flash=' + encodeURIComponent('That job is not on today’s list.'));
        st = tick(st, job, formBody(event)); await putConfig(fkey, st);
        return redirect('/field?flash=' + encodeURIComponent(st[job.id].complete ? 'All done. Nice work.' : 'Saved.'));
      }
      const flagsF = {};
      for (const cn of [...new Set(jobs.map((j) => j.company))]) { const cpF = await getConfig(`customer-${cSlug2(cn)}`, null).catch(() => null); if (cpF && cpF.flag) flagsF[cn] = cpF.flag; }
      let look = null;
      if (q.kind === 'look') {
        const qs = String(q.q || '').trim().slice(0, 60);
        const rowsL = [];
        if (qs.length >= 2) {
          const s0 = qs.toLowerCase();
          for (const c of listCustomers((await listProjects('demo')).projects).filter((c) => c.name.toLowerCase().includes(s0)).slice(0, 5)) rowsL.push({ name: c.name, meta: `${(c.contacts || [])[0] || ''}${c.projects.length ? ' · ' + c.projects.length + ' project(s)' : ''}`, href: `/customers/${c.id}` });
          const imp = await listImported({ q: qs, limit: 8 }).then((r) => r.rows).catch(() => []);
          for (const r of imp) { const a = r.defaultCustomerAddress || {}; const pc = r.primaryAccountContact || {}; rowsL.push({ name: r.companyName || `Account ${r.accountId}`, meta: [[pc.firstName, pc.lastName].filter(Boolean).join(' '), [a.city, a.state].filter(Boolean).join(', '), r.accountType === 'PROSPECT' ? 'Prospect' : 'CoreBridge customer'].filter(Boolean).join(' · '), phone: r.companyPhone || pc.officePhone || pc.cellPhone || '', address: [a.address1, a.city, a.state, a.postalCode].filter(Boolean).join(', '), href: `/customers/imported/${r.accountId}` }); }
        }
        look = { q: qs, rows: rowsL };
      }
      return html(fieldPage({ user, jobs, state: st, flash: q.flash || '', kind: ['visit', 'install', 'look'].includes(q.kind) ? q.kind : '', flags: flagsF, look }));
    }
    if (path === '/customers.csv' || path === '/reports/past-due.csv') {
      const today8 = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
      const body8 = path === '/customers.csv'
        ? csv(listCustomers((await listProjects('demo')).projects).map((c) => ({ ...c, contacts: c.contacts.join('; '), count: c.projects.length })), [['name', 'Customer'], ['contacts', 'Contacts'], ['count', 'Projects'], ['open', 'Open $'], ['lifetime', 'Completed $'], ['salesperson', 'Salesperson']])
        : csv(demoInvoices(today8), [['number', 'Invoice'], ['customer', 'Customer'], ['contact', 'Contact'], ['balance', 'Balance'], ['due', 'Due']]);
      return { statusCode: 200, headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="${path.split('/').pop()}"`, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }, body: body8 };
    }
    if (path === '/admin/templates' || path === '/me/templates') {
      const shopScope = path === '/admin/templates';
      const keyT = shopScope ? 'email-templates' : `tpl-${personOf(user)}`;
      if (method === 'POST') {
        if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
        try { await putConfig(keyT, mergeTemplateForm([], formBody(event))); return redirect(`${path}?flash=${encodeURIComponent('Templates saved.')}`); }
        catch (e) { return redirect(`${path}?flash=${encodeURIComponent('Not saved: ' + e.message)}`); }
      }
      const listT = shopScope ? withTemplateDefaults(await getConfig(keyT, null).catch(() => null)) : await getConfig(keyT, []).catch(() => []);
      return html(templatesPage({ page: simplePage0, user, list: listT, scope: shopScope ? 'shop' : 'mine', flash: q.flash || '' }));
    }
    if (path === '/me/digest') {
      const today9 = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
      let tk = demoTasks(today9); try { tk = await getConfig(`tasks-${personOf(user)}`, tk); } catch { /* demo */ }
      const its9 = await listItems();
      const lines = digest({ name: user.name || '', groups: groupTodos(tk, today9, { projects: (await listProjects('demo')).projects }), comingUp: comingUpToday(its9, today9), stuck: stuckItems(its9), proofs: proofReminders(its9, new Date(), 2).length });
      return html(digestPage({ user, lines }));
    }
    if (path === '/search') {
      const today7 = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
      const qs7 = String(q.q || '').slice(0, 80);
      const { projects: sp } = await listProjects('demo');
      let tk = demoTasks(today7); try { tk = await getConfig(`tasks-${personOf(user)}`, tk); } catch { /* demo */ }
      let mail7 = []; try { mail7 = await getConfig(`mail-${personOf(user)}`, demoMail(today7)); } catch { /* none */ }
      const long7 = qs7.trim().length >= 2;
      const [calls7, imp7] = await Promise.all([long7 && user.isAdmin ? listCalls({ max: 300 }).catch(() => []) : [], long7 ? listImported({ q: qs7.trim(), limit: 25 }).then((r) => r.rows).catch(() => []) : []]);
      let refFrom = ''; try { refFrom = new URL((event.headers || {}).referer || '').pathname.split('/')[1] || ''; } catch { /* none */ }
      return html(searchPage2({ user, q: qs7, show: String(q.show || ''), from: refFrom, results: searchAll(qs7, { projects: sp, customers: listCustomers(sp), tasks: tk, mail: mail7, calls: calls7 || [], imported: imp7 || [] }) }));
    }
    if (path === '/feedback' || path === '/admin/feedback') {
      let list = []; try { list = await getConfig('feedback', []); } catch { /* none */ }
      const adminFb = path === '/admin/feedback';
      if (method === 'POST') {
        if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
        const f = formBody(event);
        if (adminFb) {
          try { await putConfig('feedback', setFeedbackStatus(list, f, { at: new Date().toISOString() })); return redirect('/admin/feedback?flash=' + encodeURIComponent('Status saved. The person sees it under Your Earlier Suggestions.')); }
          catch (e) { return redirect('/admin/feedback?flash=' + encodeURIComponent('Not saved: ' + e.message)); }
        }
        try { await putConfig('feedback', addFeedback(list, f, { who: personOf(user), at: new Date().toISOString() })); return redirect('/feedback?flash=' + encodeURIComponent('Thanks. The team will see this.') + (fbSafePath(f.page) ? '&from=' + encodeURIComponent(fbSafePath(f.page)) : '')); }
        catch (e) { return redirect('/feedback?flash=' + encodeURIComponent('Not sent: ' + e.message)); }
      }
      if (adminFb) return html(feedbackInbox({ user, list, status: ['review', 'planned', 'shipped', 'no'].includes(q.status) ? q.status : '', flash: q.flash || '' }));
      let refPath = ''; try { const rf = new URL((event.headers || {}).referer || (event.headers || {}).Referer || ''); if (rf.host === host) refPath = rf.pathname + rf.search; } catch { /* none */ }
      return html(feedbackPage({ user, mine: list.filter((x) => x.who === personOf(user)), flash: q.flash || '', from: q.from || refPath, kind: q.kind || '' }));
    }
    if (path === '/me/booking' && method === 'POST') {
      if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
      const mkb = `me-${personOf(user)}`;
      const curb = await getConfig(mkb, {}).catch(() => ({}));
      try { await putConfig(mkb, { ...curb, booking: cleanBooking(formBody(event).booking) }); return redirect('/me?flash=' + encodeURIComponent('Booking link saved. Use the Booking Link button when you write an email.') + '#booking'); }
      catch (e) { return redirect('/me?flash=' + encodeURIComponent('Not saved: ' + e.message) + '#booking'); }
    }
    if (path === '/me/signature' && method === 'POST') {
      if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
      const mk2 = `me-${personOf(user)}`;
      const cur = await getConfig(mk2, {}).catch(() => ({}));
      const sigIn = String(formBody(event).signature || '');
      const sigHtml = /<\/?(b|strong|i|em|u|br|p|div|span|ul|ol|li|a|img|font)\b[^>]*>/i.test(sigIn) ? sanitizeHtml(sigIn) : esc(sigIn).replace(/\r?\n/g, '<br>');
      await putConfig(mk2, { ...cur, signature: sigHtml.slice(0, 5000) });
      return redirect('/me?flash=' + encodeURIComponent('Signature saved. It is added to every email you send.') + '#signature');
    }
    if (path === '/me') {
      const mk = `me-${personOf(user)}`;
      let me = {}; try { me = await getConfig(mk, {}); } catch { /* none */ }
      if (method === 'POST') {
        if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
        try { await putConfig(mk, mergeMe(me, formBody(event))); return redirect('/me?flash=' + encodeURIComponent('Saved.')); }
        catch (e) { return redirect('/me?flash=' + encodeURIComponent('Not saved: ' + e.message)); }
      }
      let oooM = {}; try { oooM = await getConfig(`ooo-${personOf(user)}`, {}); } catch { /* none */ }
      return html(mePage({ user, me, flash: q.flash || '' }).replace('</main>', `<div class="wrap" style="max-width:720px">${oooForm(oooM, await getConfig('team', demoTeam()).catch(() => demoTeam()), personOf(user))}${signatureForm(me.signature || '', me.booking || '')}${bookingForm(me.booking || '')}</div></main>`));
    }
    if (path === '/log') {
      const [lg7, its7] = await Promise.all([recentLog(200).catch(() => []), listItems()]);
      const nm = Object.fromEntries(its7.map((i) => [i.id, i.name]));
      return html(changeLogPage({ user, log: lg7.map((l) => ({ ...l, itemName: nm[l.itemId || l.item || l.id] })), stepName: (id) => stepById(id)?.name || id || '' }));
    }
    if (path === '/projects/new') {
      if (method === 'POST') {
        if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
        const f = formBody(event);
        let list = []; try { list = await getConfig('extra-projects', []); } catch { /* none */ }
        try { { const raw0 = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : (event.body || ''); f.needs = new URLSearchParams(raw0).getAll('needs'); } const next = newProject(list, f, { salesperson: user.name || user.email }); await putConfig('extra-projects', next); const nid = next[next.length - 1].id; return redirect(f.go === 'estimate' ? `/projects/${nid}/build` : `/projects/${nid}?mode=demo`); }
        catch (e) { return html(newProjectPage({ user, f, error: 'Not created: ' + e.message + '.' }), 400); }
      }
      { const cut = (v, n) => String(v || '').slice(0, n);
        const allP = [...(await listProjects('demo').catch(() => ({ projects: [] }))).projects, ...(await getConfig('extra-projects', []).catch(() => []))];
        const lc = cut(q.company, 120).trim().toLowerCase(); const le = cut(q.email, 120).trim().toLowerCase();
        const dupes = (lc || le) ? allP.filter((p) => (lc && String(p.company || '').toLowerCase() === lc) || (le && String(p.email || '').toLowerCase() === le)).filter((p) => !['complete', 'lost'].includes(p.lane)).slice(0, 5) : [];
        return html(newProjectPage({ user, dupes, from: q.from ? { subject: cut(q.subject, 140), from: cut(q.from, 120) } : null, f: { company: cut(q.company, 120), name: cut(q.name, 120), contact: cut(q.contact, 80), email: cut(q.email, 120), notes: cut(q.notes, 2000), origination: q.from ? 'inbound' : '' } })); }
    }
    const emm = path.match(/^\/email(?:\/(ooo|send|[\w-]+\/(archive|spam|notspam|inbox|snooze|wake|unsend|unschedule)))?$/);
    if (emm) {
      const today13 = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
      const me13 = personOf(user);
      let mail = demoMail(today13); try { mail = await getConfig(`mail-${me13}`, mail); } catch { /* demo */ }
      let blocked = []; try { blocked = await getConfig(`mailblock-${me13}`, []); } catch { /* none */ }
      let ooo = {}; try { ooo = await getConfig(`ooo-${me13}`, {}); } catch { /* none */ }
      if (method === 'POST') {
        if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
        const f = formBody(event);
        const back13 = safeBack(f.back, '/activities');
        const go = (msg) => redirect(`${back13}${back13.includes('?') ? '&' : '?'}flash=${encodeURIComponent(msg)}`);
        try {
          if (emm[1] === 'ooo') { await putConfig(`ooo-${me13}`, setOutOfOffice(ooo, f, { team: await getConfig('team', demoTeam()).catch(() => demoTeam()), me: me13 })); return redirect('/me?flash=' + encodeURIComponent(f.on === 'on' ? 'Out of Office is on.' : 'Out of Office is off.') + '#ooo'); }
          if (emm[1] === 'send') {
            let sig = ''; try { sig = (await getConfig(`me-${me13}`, {})).signature || ''; } catch { /* none */ }
            if (f.do === 'draft') { await putConfig(`mail-${me13}`, saveDraft(mail, f, { from: user.email, at: new Date().toISOString() })); return go('Draft saved. It is in To Do under Email › Draft.'); }
            let next13 = sendEmail(mail, f, { from: user.email, signature: sig, at: new Date().toISOString() });
            if (f.replyTo && next13.some((x) => x.id === f.replyTo)) next13 = archiveThread(next13.map((x) => (x.id === f.replyTo && x.folder === 'archive' ? { ...x, folder: 'inbox' } : x)), f.replyTo);
            await putConfig(`mail-${me13}`, dropDraftFor(next13, f.replyTo));
            const sentId = (next13.filter((x) => x.folder === 'sent' || x.folder === 'scheduled').slice(-1)[0] || {}).id || '';
            if (f.followup === 'on' && sentId) {
              const sm13 = next13.find((x) => x.id === sentId) || {};
              const sentYmd = new Date(sm13.sendAt || Date.now()).toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
              let tk13 = demoTasks(today13); try { tk13 = await getConfig(`tasks-${me13}`, tk13); } catch { /* demo */ }
              await putConfig(`tasks-${me13}`, followUpTask(tk13, { mailId: sentId, subject: sm13.subject, to: sm13.to, customer: sm13.customer, projectId: sm13.projectId, sentYmd }));
            }
            if (f.do === 'schedule') return go('Scheduled. It sends at the time you picked; cancel it under Email › Scheduled. (Test copy: nothing leaves SalesMax.)');
            return redirect(`${back13}${back13.includes('?') ? '&' : '?'}undo=${encodeURIComponent(sentId)}&flash=${encodeURIComponent('Sent and archived. It is off your To Do list. (Test copy: nothing left SalesMax.)')}`);
          }
          const id = emm[1].split('/')[0], act = emm[2];
          if (act === 'spam') { const r = markSpam(mail, id, blocked); await putConfig(`mail-${me13}`, r.mail); await putConfig(`mailblock-${me13}`, r.blocked); return go('Marked as spam. Future email from that sender goes to Spam.'); }
          if (act === 'notspam') { const r = notSpam(mail, id, blocked); await putConfig(`mail-${me13}`, r.mail); await putConfig(`mailblock-${me13}`, r.blocked); return go('Moved back to the Inbox.'); }
          if (act === 'snooze') { await putConfig(`mail-${me13}`, snooze(mail, id, f.days, new Date().toISOString())); return go('Snoozed. It comes back to your To Do then.'); }
          if (act === 'unsend') { await putConfig(`mail-${me13}`, unsend(mail, id, new Date().toISOString())); return go('Unsent. It is back as a draft under Email › Draft.'); }
          if (act === 'unschedule') { await putConfig(`mail-${me13}`, unschedule(mail, id, new Date().toISOString())); return go('Cancelled. It is a draft again under Email › Draft.'); }
          if (act === 'wake') { await putConfig(`mail-${me13}`, mail.map((x) => (x.id === id && x.folder === 'snoozed' ? { ...x, folder: 'inbox', snoozeUntil: null } : x))); return go('Back in Need Reply.'); }
          if (act === 'archive') { await putConfig(`mail-${me13}`, archiveThread(mail, id)); return go('Archived. Email is never deleted.'); }
          await putConfig(`mail-${me13}`, move(mail, id, act)); return go('Moved to the Inbox.');
        } catch (e) { return go('Not changed: ' + e.message); }
      }
      return html(emailPage({ user, mail, folder: q.folder || 'spam', ooo, today: today13, flash: q.flash || '' }));
    }
    const shm = path.match(/^\/projects\/([\w-]+)\/(destination|label|shipping-confirm|invoice|xps|boxes|xps-order)$/);
    if (shm) {
      const p = await getProject(shm[1], 'demo');
      if (!p) return html(simplePage({ user, mode, title: 'Not found', message: 'That project is not here.', tab: 'Projects' }), 404);
      let dest = null; try { dest = await getConfig(`dest-${p.id}`, null); } catch { /* none */ }
      let shp = null; try { shp = await getConfig(`ship-${p.id}`, null); } catch { /* none */ }
      if (shm[2] === 'invoice') { const preI = ((await getConfig('admin-settings', {}).catch(() => ({}))) || {}).docPrefix ?? '226'; return html(invoicePage({ page: (o) => simplePage0(o), user, p, dest, ship: shp, items: (await listItems()).filter((i) => i.projectId === p.id), prefix: preI })); }
      if (method !== 'POST') return redirect(`/projects/${p.id}?mode=demo`);
      if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
      const f = formBody(event);
      let adm14 = {}; try { adm14 = await getConfig('admin-settings', {}); } catch { /* defaults */ }
      try {
        if (shm[2] === 'destination') { const pk0 = `customer-${custSlug(p.company)}`; const prof1 = await getConfig(pk0, {}).catch(() => ({})); const d1 = setDestination(f, addressesFor(prof1, p.company, sampleData())); await putConfig(`dest-${p.id}`, d1); if (f.saveToProfile === 'on' && (f.saved === '' || f.saved === undefined) && d1.street) await putConfig(pk0, addProfileAddress(prof1, d1)); return redirect(`/projects/${p.id}?mode=demo&flash=${encodeURIComponent('Hand-off address saved. It shows on the estimate and invoice.')}`); }
        if (shm[2] === 'boxes') { await putConfig(`ship-${p.id}`, { ...(shp || { labels: [] }), packages: packagesFromForm(f), packedBy: user.email, packedAt: new Date().toISOString() }); let bx = 'Shipping details saved.'; try { bx += await afterBuilt(p.id, `auto (${user.email})`); } catch { /* shown on the panel */ } const bk = f.back ? safeBack(f.back, '/boards/production') : ''; return redirect(bk ? `${bk}${bk.includes('?') ? '&' : '?'}flash=${encodeURIComponent(bx)}` : `/projects/${p.id}?mode=demo&flash=${encodeURIComponent(bx)}`); }
        if ((shm[2] === 'xps' || shm[2] === 'xps-order') && (await getConfig('parallel-mode', {}).catch(() => ({}))).on) throw new Error('parallel mode is on, so the shipping steps are turned off');
        if (shm[2] === 'xps-order') { await putConfig(`ship-${p.id}`, { ...(shp || {}), xpsOrder: null }); const t0 = await afterBuilt(p.id, user.email); return redirect(`/projects/${p.id}?mode=demo&flash=${encodeURIComponent(t0.trim() || 'Not every line is Built yet.')}`); }
        if (false) {
          const itsO = (await listItems()).filter((i) => i.projectId === p.id);
          const orderNoO = p.orderId || ((itsO[0] && String(itsO[0].ref || '').match(/Order (\d+)/)) || [])[1];
          const bodyO = buildPutOrder({ orderNumber: orderNoO, project: p, dest, packages: (shp && shp.packages) || [], today: new Date().toISOString().slice(0, 10) });
          let note;
          if (process.env.XPS_WRITES === 'on') { let c = null; try { c = await readApp('xps'); } catch { c = null; } await xpsPutOrder({ ...(c || {}), body: bodyO }); note = `Sent to XPS as order ${bodyO.orderId} with ${bodyO.packages.length} box(es). Buy the label in XPS, then Get Labels from XPS.`; }
          else note = `Test copy: XPS order ${bodyO.orderId} is ready (${bodyO.packages.length} box(es), ship to ${dest.city}, ${dest.state}) but was not sent. Sending turns on at go-live.`;
          await putConfig(`ship-${p.id}`, { ...(shp || { labels: [] }), xpsOrder: { note, at: new Date().toISOString(), by: user.email } });
          return redirect(`/projects/${p.id}?mode=demo&flash=${encodeURIComponent(note)}`);
        }
        if (shm[2] === 'xps') {
          let creds = null;
          try { creds = await readApp('xps'); } catch { creds = null; }
          if (!creds) throw new Error('XPS is not connected yet. Add the XPS API key and customer ID first');
          const its15 = (await listItems()).filter((i) => i.projectId === p.id);
          const orderNo = p.orderId || ((its15[0] && String(its15[0].ref || '').match(/Order (\d+)/)) || [])[1];
          const found = newLabels(shp, matchShipments(await xpsSearch({ customerId: creds.customerId, apiKey: creds.apiKey, keyword: orderNo }), orderNo));
          if (!found.length) return redirect(`/projects/${p.id}?mode=demo&flash=${encodeURIComponent('No new shipping labels for order ' + orderNo + ' yet.')}`);
          let n = shp;
          for (const l of found) n = recordLabel(n, { carrier: l.carrier, service: l.service, tracking: l.tracking || l.bookNumber, cost: String(l.cost) }, { markupPct: adm14.shipMarkupPct ?? 20, handling: adm14.shipHandling ?? 0, at: new Date().toISOString(), by: 'XPS' });
          await putConfig(`ship-${p.id}`, n);
          return redirect(`/projects/${p.id}?mode=demo&flash=${encodeURIComponent(`Got ${found.length} label(s) from shipping. Shipping on the invoice is now $${n.total.toFixed(2)}.`)}`);
        }
        if (shm[2] === 'label') { const n = recordLabel(shp, f, { markupPct: adm14.shipMarkupPct ?? 20, handling: adm14.shipHandling ?? 0, at: new Date().toISOString(), by: user.email }); await putConfig(`ship-${p.id}`, n); return redirect(`/projects/${p.id}?mode=demo&flash=${encodeURIComponent(`Label added. Shipping on the invoice is now $${n.total.toFixed(2)}. Add it to the CoreBridge order before completing.`)}`); }
        await putConfig(`ship-${p.id}`, confirmInCoreBridge(shp, { by: user.email, at: new Date().toISOString() })); return redirect(`/projects/${p.id}?mode=demo&flash=${encodeURIComponent('Confirmed. The order can now be marked Complete.')}`);
      } catch (e) { return redirect(`/projects/${p.id}?mode=demo&flash=${encodeURIComponent('Not saved: ' + e.message)}`); }
    }
    const lsm = path.match(/^\/projects\/([\w-]+)\/lost$/);
    if (lsm && method === 'POST') {
      if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
      const p = await getProject(lsm[1], 'demo');
      if (!p) return redirect('/projects');
      let ov = {}; try { ov = await getConfig('lane-overrides', {}); } catch { /* none */ }
      try { await putConfig('lane-overrides', markLost(ov, p, formBody(event), { by: user.email, at: new Date().toISOString() })); return redirect('/projects?flash=' + encodeURIComponent(`Marked “${p.name}” as lost. It counts in Lost pipeline.`)); }
      catch (e) { return redirect(`/projects/${p.id}?mode=demo&flash=${encodeURIComponent('Not changed: ' + e.message)}`); }
    }
    const apm = path.match(/^\/projects\/([\w-]+)\/approve$/);
    if (apm && method === 'POST') {
      if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
      const p = await getProject(apm[1], 'demo');
      if (!p) return redirect('/projects');
      { const miss = missingRequired(await getConfig('checklists', null).catch(() => null), salesStage(p.lane), ((await getConfig('checks', {}).catch(() => ({})))['p:' + p.id] || {})[salesStage(p.lane)] || []);
        if (miss.length) return redirect(`/projects/${p.id}?mode=demo&flash=${encodeURIComponent('Not approved: finish the checklist first (' + miss.join(', ') + ').')}`); }
      let ov = {}; try { ov = await getConfig('lane-overrides', {}); } catch { /* none */ }
      try { await putConfig('lane-overrides', approveProject(ov, p, formBody(event), { by: user.email, at: new Date().toISOString() })); return redirect(`/projects/${p.id}?mode=demo&flash=${encodeURIComponent('Approved. It is now In production.')}`); }
      catch (e) { return redirect(`/projects/${p.id}?mode=demo&flash=${encodeURIComponent('Not approved: ' + e.message)}`); }
    }
    const pom = path.match(/^\/projects\/([\w-]+)\/po$/);
    if (pom && method === 'POST') {
      if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
      const f = formBody(event);
      await putConfig(`po-${pom[1]}`, { poNumber: String(f.poNumber || '').trim().slice(0, 40), poAmount: String(f.poAmount || '').replace(/[$,\s]/g, '').slice(0, 14) });
      return redirect(`/projects/${pom[1]}?mode=demo`);
    }
    const psm = path.match(/^\/projects\/([\w-]+)\/packing-slip$/);
    if (psm) {
      const p = await getProject(psm[1], 'demo');
      if (!p) return redirect('/projects');
      const itsP = (await listItems()).filter((i) => i.projectId === p.id).map((i) => ({ name: i.name, qty: i.qty || 1 }));
      const destP = await getConfig(`dest-${p.id}`, null).catch(() => null);
      return html(packingSlipPage({ p, items: itsP.length ? itsP : (p.items || []), dest: destP, today: new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', year: 'numeric' }) }));
    }
    const bp = path.match(/^\/projects\/([\w-]+)\/build$/);
    if (bp) {
      const p = await getProject(bp[1], 'demo');
      if (!p) return html(simplePage({ user, mode, title: 'Not found', message: 'That project is not here.', tab: 'Projects' }), 404);
      const cu = customerFor(p);
      const tax = taxGroupFor(cu.company);
      let origin = suggestOrigination(cu.facts || {});
      const survey = surveyFor(p.id);
      if (method !== 'POST') {
        if (q.draft && survey) { const d = draftFromSurvey(survey); return html(builderPage({ user, p, lines: readLines(d.form), origin, draft: d, hasSurvey: true })); }
        return html(builderPage({ user, p, lines: readLines({}), origin, hasSurvey: !!survey }));
      }
      if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
      const f = formBody(event);
      const picked = originationById(f.origination);
      if (picked) origin = { ...origin, ...picked, reason: picked.id === origin.id ? origin.reason : 'Changed by you.' };
      if (f.do === 'add') f.lines = String(Math.min(10, (Number(f.lines) || 3) + 1));
      const lines = readLines(f);
      let priceList = [];
      try { priceList = await getConfig('modifier-prices', []); } catch { /* no saved prices yet */ }
      for (const l of lines) { const r = modifierCharges(l.sel, { list: priceList }); l.charges = r.charges; l.unpriced = [...r.unpriced, ...r.unknown]; }
      if (f.do !== 'price') return html(builderPage({ user, p, lines, origin }));
      const chosen = lines.filter((l) => l.part);
      if (!chosen.length) return html(builderPage({ user, p, lines, origin, flash: 'Pick at least one part first.' }));
      if (chosen.some((l) => checkLine(l).length)) return html(builderPage({ user, p, lines, origin, flash: 'Fix the items marked in red, then get the price again.' }));
      let price;
      try {
        price = readPrice(await cbRead('priceConfiguredOrder', undefined, { body: buildConfiguredRequest({ lines, taxGroupId: tax.id }), interactive: true, deadline: Date.now() + 24000 }));
      } catch (e) {
        price = { ok: false, errors: [e.code === 'busy' ? 'CoreBridge is busy right now. Try again in a minute.' : 'CoreBridge price check failed: ' + e.message] };
      }
      return html(builderPage({ user, p, lines, origin, price }));
    }
    const em = path.match(/^\/projects\/([\w-]+)\/estimate$/);
    if (em) {
      const p = await getProject(em[1], 'demo');
      if (!p) return html(simplePage({ user, mode, title: 'Not found', message: 'That project is not here.', tab: 'Projects' }), 404);
      const survey = surveyFor(p.id);
      const cu = customerFor(p);
      const tax = taxGroupFor(cu.company);
      const plan = planCustomerSync({ company: cu.company, contact: cu.contact });
      const origin = suggestOrigination(cu.facts || {});
      const body = buildPlaceholderEstimate({ project: p, lines: surveyLines(survey), settings: { taxGroupId: tax.id, originationId: origin.id } });
      let adm6 = {}; try { adm6 = await getConfig('admin-settings', {}); } catch { /* defaults */ }
      const notes6 = adm6.estimateNotes ?? 'Prices are good for 30 days. A 50% deposit starts production.';
      const pre6 = ((await getConfig('admin-settings', {}).catch(() => ({}))) || {}).docPrefix ?? '226';
      const page6 = estimatePage({ user, p, survey, body, plan, tax, origin, prefix: pre6 });
      const dest6 = await getConfig(`dest-${p.id}`, null).catch(() => null);
      return html(notes6 ? page6.replace('</body>', `<div class="wrap"><section class="panel" aria-label="Hand-off address"><h2 style="margin:0 0 6px;font-size:15px">Hand-Off Address</h2>${addressBlock(dest6)}</section><section class="panel" aria-label="Estimate notes"><h2 style="margin:0 0 6px;font-size:15px">Estimate Notes</h2><p style="margin:0">${esc(notes6)}</p><p style="margin:6px 0 0;font-size:12px;color:var(--mute)">Change these in Admin Settings, Pricing.</p></section></div></body>`) : page6);
    }
    const m = path.match(/^\/projects\/([\w-]+)$/);
    if (m) {
      const p = await getProject(m[1], mode);
      if (!p) return html(simplePage({ user, mode, title: 'Not found', message: 'That project is not here.', tab: 'Projects' }), 404);
      const today0 = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
      let cu0 = {}; try { if (mode === 'demo') cu0 = customerFor(p) || {}; } catch { /* no customer facts */ }
      let stagePillHtml = '';
      const extrasP = {};
      if (mode === 'demo') { try { let tkP = demoTasks(today0); tkP = await getConfig(`tasks-${personOf(user)}`, tkP).catch(() => tkP); extrasP.tasks = projectTasksHtml2(p.id, tkP, today0); extrasP.notes = notesHtml(p.id, await getConfig(`notes-${p.id}`, []).catch(() => [])); } catch { /* optional */ } }
      if (mode === 'demo') { try { const ls = await getConfig('lane-since', {}).catch(() => ({})); const tr = trackLanes(ls, [p], today0); if (tr.changed) await putConfig('lane-since', tr.since); stagePillHtml = stagePill(stageLeft(tr.since[p.id], today0, targetsFrom(await getConfig('admin-settings', {}).catch(() => ({}))))); } catch { /* optional */ } }
      let standing = standingHtml(p, mode === 'demo' ? (await listItems()).filter((i) => i.projectId === p.id) : [], today0, cu0);
      if (mode === 'demo') { const pa0 = (await getConfig('price-alerts', {}).catch(() => ({})))[p.id]; if (pa0) standing = priceBox(pa0, p.id) + standing; }
      if (mode === 'demo') { const cp0 = await getConfig(`customer-${cSlug2(p.company)}`, {}).catch(() => ({})); if (cp0 && cp0.flag) standing = flagStrip(cp0.flag, `/customers/${cSlug2(p.company)}?tab=account`) + standing; }
      if (mode === 'demo') {
        let tk0 = demoTasks(today0); try { tk0 = await getConfig(`tasks-${personOf(user)}`, tk0); } catch { /* demo */ }
        const nx = tk0.filter((t) => !t.done && t.projectId === p.id).sort((a, b) => String(a.due).localeCompare(String(b.due)))[0];
        const dueTxt = nx ? (nx.due < today0 ? 'was due ' + new Date(nx.due + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) : nx.due === today0 ? 'due today' : 'due ' + new Date(nx.due + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })) : '';
        const bar0 = nx
          ? `<div class="nstep"><b>Next step</b><span>${esc(nx.title)}</span><span class="m">· ${dueTxt} · on your Activities</span><form method="post" action="/activities/tasks/${esc(nx.id)}/done" style="margin:0"><input type="hidden" name="back" value="/projects/${esc(p.id)}?mode=demo"><button class="go" title="Marks it done on your Activities too">Do It →</button></form></div>`
          : `<div class="nstep" style="background:#fdf3dc;color:#7a4e00"><b>No next step</b><span>Every open job needs one.</span><a class="go" href="/activities?new=1&project=${esc(p.id)}">Add Next Step →</a></div>`;
        standing = `<style>.nstep{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px;color:#3d4658;background:#fff;border:1px solid var(--line);border-radius:8px;padding:6px 8px 6px 12px;align-self:flex-start}.nstep b{color:var(--mute)}.nstep .m{color:var(--mute)}.nstep .go{font:inherit;font-size:12px;font-weight:700;color:#fff;background:#a8343f;border:0;border-radius:6px;padding:0 10px;min-height:28px;cursor:pointer;display:inline-flex;align-items:center}.nstep a.go:hover{text-decoration:none}</style>` + standing;
        // One next-step control (UX review): it lives in the header; the separate banner is gone.
        const onB0 = !nx && (await listItems()).some((i) => i.projectId === p.id && ACTIVE_STEPS.has(i.step)); p.nextStep = nx ? `${nx.title} · ${dueTxt}` : onB0 ? 'On the boards: each product has its own next step (see Products)' : ''; p.nextMissing = !nx && !onB0; void bar0;
      }
      if (mode === 'demo') {
        let po0 = null; try { po0 = await getConfig(`po-${p.id}`, null); } catch { /* none */ }
        const co0 = cu0.company || {};
        const its0 = (await listItems()).filter((i) => i.projectId === p.id);
        let prof0 = {}; try { prof0 = await getConfig(`customer-${custSlug(p.company)}`, {}); } catch { /* none */ }
        let adm0 = {}; try { adm0 = await getConfig('admin-settings', {}); } catch { /* defaults */ }
        const drafts = [];
        if (needsShippingAccount(its0, prof0, adm0)) drafts.push(shippingDraft(p, adm0.tplShipping || ''));
        if (orderComplete(its0)) { const cd = completedDraft(p, { mode: adm0.completedEmail || 'Invoice + review request', reviewLink: adm0.reviewLink || '', payLink: `${base}p/${portalToken(p.id, key)}`, tpl: adm0.tplCompleted || '' }); if (cd) drafts.push(cd); }
        standing += draftsPanel(drafts);
        let mailP = demoMail(today0); try { mailP = await getConfig(`mail-${personOf(user)}`, mailP); } catch { /* demo */ }
        const cslugP = custSlug(p.company);
        const mineP = mailForCustomer(mailP, p.company).filter((m) => m.folder !== 'spam').sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6);
        standing += `<section class="panel" aria-label="Email"><div style="display:flex;gap:8px;align-items:center"><h2 style="margin:0;font-size:15px">Email · ${mineP.filter((m) => m.folder === 'inbox').length} to answer</h2><a class="btn" style="margin-left:auto" href="/customers/${esc(cslugP)}?tab=email&project=${esc(p.id)}#compose">Write Email</a></div><div style="margin-top:8px">${mailRows(mineP, { back: `/projects/${p.id}?mode=demo`, replyHref: (m) => `/customers/${cslugP}?tab=email&reply=${m.id}#compose` }) || '<p style="margin:0;color:var(--mute);font-size:13px">No email with this customer yet.</p>'}</div></section>`;
        const dest0 = await getConfig(`dest-${p.id}`, null).catch(() => null);
        const ship0 = await getConfig(`ship-${p.id}`, null).catch(() => null);
        standing += expectedPanel(expectedFor(p, its0, today0));
        standing += destinationPanel(p.id, dest0, { saved: addressesFor(prof0, p.company, sampleData()), company: p.company }) + shippingPanel(p.id, dest0, ship0, { markupPct: adm0.shipMarkupPct ?? 20, handling: adm0.shipHandling ?? 0 });
        const plink = `${base}p/${portalToken(p.id, key)}`;
        standing += `<section class="panel" aria-label="Customer order page"><h2 style="margin:0 0 6px;font-size:15px">Customer Order Page</h2><p style="margin:0 0 8px;font-size:13px;color:var(--mute)">What ${esc(p.contact || 'the customer')} sees: status, proofs, estimate approval, PO and payment. The link works without signing in and expires on its own.</p><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><a class="btn" href="${esc(plink)}" target="_blank" rel="noopener">Open as the Customer</a><label for="pl-${esc(p.id)}" style="position:absolute;left:-9999px">Customer link</label><input id="pl-${esc(p.id)}" readonly value="${esc(plink)}" style="flex:1;min-width:200px;font:inherit;font-size:12px;min-height:36px;border:1px solid #d5dbe5;border-radius:8px;padding:0 8px"></div></section>`;
        let tk0 = demoTasks(today0); try { tk0 = await getConfig(`tasks-${personOf(user)}`, tk0); } catch { /* demo */ }
        standing = (q.flash ? `<div class="note" style="margin:0 0 12px;background:#e6f2ec;color:#1f6a43">${esc(q.flash)}</div>` : '') + approveHtml(p, adm0.depositPct ?? 50) + standing + projectTasksHtml(p.id, tk0, today0) + lostHtml(p);
        const ids0 = new Set(its0.map((i) => i.id)); const nm0 = Object.fromEntries(its0.map((i) => [i.id, i.name]));
        const hist0 = (await recentLog(200).catch(() => [])).filter((l) => ids0.has(l.itemId || l.item || l.id)).map((l) => ({ ...l, itemName: nm0[l.itemId || l.item || l.id] }));
        standing += historyHtml(hist0, (id) => stepById(id)?.name || id || '');
        { const sc0 = await getConfig(`scope-${p.id}`, null).catch(() => null); let v0 = await getConfig(`visit-${p.id}`, null).catch(() => null); v0 = v0 || seedVisit(p, sampleData()); extrasP.scope = { text: (sc0 && sc0.text) || '', at: sc0 && sc0.at, by: sc0 && sc0.by, items: (v0.items || []).filter((x) => !x.dropped).length, meas: (v0.items || []).reduce((a, x) => a + (x.meas || []).length, 0), visits: v0.visits || 0, needs: (v0.needs || []).length }; }
        extrasP.side = { dest: dest0, po: po0, email: (cu0.contact || {}).email || '', phone: (cu0.company || {}).phone || (cu0.contact || {}).phone || '', expected: expectedFor(p, its0, today0) };
        standing += poPanel(p.id, po0 || {}, po0 && po0.poAmount ? poCheck({ poAmount: po0.poAmount, total: p.total, tax: p.tax || 0, taxExempt: !!(co0.isTaxExempt ?? co0.IsTaxExempt ?? co0.taxExempt) }) : null);
      }
      if (mode === 'demo') {
        const all = await listItems();
        const its = all.filter((i) => i.projectId === p.id);
        if (its.length) return html(projectPage({ extras: { ...extrasP, itemCount: its.length }, stagePillHtml, tab: q.tab || '', user, mode, p, standing, itemsHtml: itemsPanel(its, `/projects/${p.id}?mode=demo`, { total: p.total, discount: p.discount, balance: p.balance, deposit: p.balance != null && p.total != null ? Math.max(0, Number(p.total) - Number(p.balance)) : 0 }), cbStatus: projectCbStatus(all, p.id) }));
      }
      if (mode === 'demo' && ['prospect', 'estimate'].includes(p.lane)) return html(projectPage({ extras: extrasP, stagePillHtml, tab: q.tab || '', user, mode, p, standing, itemsHtml: estimateCta(p) }));
      return html(projectPage({ extras: extrasP, stagePillHtml, tab: q.tab || '', user, mode, p, standing }));
    }
    if (path === '/activities' || path === '/activities/tasks/new' || /^\/activities\/tasks\/[\w-]+\/(done|snooze)$/.test(path)) {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
      const who = personOf(user);
      let tasks = demoTasks(today);
      try { tasks = await getConfig(`tasks-${who}`, tasks); } catch { /* demo */ }
      tasks = mergeAuto(tasks, autoHandoffTasks(await listItems(), (await listProjects('demo')).projects, today));
      const dm = path.match(/^\/activities\/tasks\/([\w-]+)\/done$/);
      if (dm && method === 'POST') {
        if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
        try {
          tasks = completeTask(tasks, dm[1], new Date().toISOString());
          await putConfig(`tasks-${who}`, tasks);
          const doneT = tasks.find((x) => x.id === dm[1]);
          if (doneT && doneT.customer) { const ck = `customer-${cSlug(doneT.customer)}`; try { await putConfig(ck, activityFromTask(await getConfig(ck, {}), doneT, { who, at: new Date().toISOString() })); } catch { /* history is best effort */ } }
          { const fb = formBody(event); const bk = fb && fb.back ? safeBack(fb.back, '/activities') : '/activities'; return redirect(bk + (bk.includes('?') ? '&' : '?') + 'flash=' + encodeURIComponent('Done. Nice work.')); }
        } catch (e) { return redirect('/activities?flash=' + encodeURIComponent('Not changed: ' + e.message)); }
      }
      const snz = path.match(/^\/activities\/tasks\/([\w-]+)\/snooze$/);
      if (snz && method === 'POST') {
        if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
        try { tasks = snoozeTask(tasks, snz[1], formBody(event).days, today); await putConfig(`tasks-${who}`, tasks); return redirect('/activities?flash=' + encodeURIComponent('Snoozed.')); }
        catch (e) { return redirect('/activities?flash=' + encodeURIComponent('Not snoozed: ' + e.message)); }
      }
      if (path === '/activities/tasks/new' && method === 'POST') {
        if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
        const f = formBody(event);
        const pj = demoProjects().find((x) => x.id === f.projectId);
        try {
          const target = f.assignee && /^[a-z0-9]+$/.test(f.assignee) ? f.assignee : who;
          if (target !== who) { let tt = []; try { tt = await getConfig(`tasks-${target}`, []); } catch { /* none */ } await putConfig(`tasks-${target}`, addTask(tt, f, { customer: pj?.company || '' })); return redirect('/activities?flash=' + encodeURIComponent(`Task added for ${target.charAt(0).toUpperCase() + target.slice(1)}.`)); }
          tasks = addTask(tasks, f, { customer: pj?.company || '' }); await putConfig(`tasks-${who}`, tasks); { const bk = f.back ? safeBack(f.back, '/activities') : '/activities'; return redirect(bk + (bk.includes('?') ? '&' : '?') + 'flash=' + encodeURIComponent('Task added.')); }
        }
        catch (e) { return redirect('/activities?new=1&flash=' + encodeURIComponent('Not added: ' + e.message)); }
      }
      let adm = {}; try { adm = await getConfig('admin-settings', {}); } catch { /* defaults */ }
      const [{ projects }, log] = await Promise.all([listProjects('demo'), recentLog(200).catch(() => [])]);
      const allItems = await listItems();
      const upA = comingUpToday(allItems, today), hdA = demoHandled(today);
      const proofA = proofPanel(proofReminders(allItems, new Date(), adm.proofReminderDays ?? 2), allItems, adm.proofRoundLimit ?? 3);
      const side = coordinatorHtml(upA, hdA) + proofA;
      const sigA = coordSig(upA, hdA);
      const hidA = await getConfig(`coord-${who}`, null).catch(() => null);
      const coordA = hidA && hidA.sig === sigA ? '' : coordinatorPanel(upA, hdA);
      const asRole = ['sales', 'design', 'production', 'permits', 'purchasing'].includes(q.as) ? q.as : user.prefs.as;
      if (asRole !== 'sales') {
        const role = asRole;
        let recs = [];
        if (SIMPLE_BOARDS[role]) { recs = demoRecords(role); try { recs = await getConfig(`board-${role}`, recs); } catch { /* demo */ } }
        const groups = roleGroups(role, { items: allItems, records: recs, stepName: (id) => stepById(id)?.name || id, cols: SIMPLE_BOARDS[role]?.cols || [] });
        return html(roleActivitiesPage({ user, role, groups, side }));
      }
      let mailA = demoMail(today); try { mailA = await getConfig(`mail-${who}`, mailA); } catch { /* demo */ }
      let seqTodos = [];
      try {
        const seqsA = await getConfig('sequences', null).catch(() => null);
        if (withDefaults(seqsA).some((s) => s.on)) {
          const stA = await getConfig('seqstate', {}).catch(() => ({}));
          const unpaidA = new Set(sampleData() ? ['demo-12', 'demo-14'] : []);
          const ovA = await getConfig('lane-overrides', {}).catch(() => ({}));
          const startOfA = Object.fromEntries(Object.entries(ovA || {}).filter(([, v]) => v && v.at).map(([k2, v]) => [k2, String(v.at).slice(0, 10)]));
          const r = sequenceTodos({ seqs: seqsA, projects, state: stA, today, unpaid: unpaidA, startOf: startOfA, prefix: adm.docPrefix ?? '226', vars: { shop_name: adm.companyName || 'FASTSIGNS of Northern Kentucky', shop_phone: adm.phone || '' } });
          if (JSON.stringify(r.state) !== JSON.stringify(stA)) await putConfig('seqstate', r.state);
          seqTodos = r.todos;
        }
      } catch { /* sequences are best effort */ }
      const coverList = [];
      for (const tm of await getConfig('team', demoTeam()).catch(() => demoTeam())) { if (tm.key === who) continue; const o = await getConfig(`ooo-${tm.key}`, null).catch(() => null); if (o && o.on && o.delegate === who) coverList.push({ name: tm.name, ooo: o, mail: await getConfig(`mail-${tm.key}`, []).catch(() => []) }); }
      mailA = wakeSnoozed(mailA, new Date().toISOString());
      const evA = ['need', 'waiting', 'snoozed', 'draft'].includes(q.ev) ? q.ev : 'need';
      return html(activitiesPage({ undo: q.undo || '', user, tasks: [...tasks, ...lateTasks(projects.filter((pp) => ['progress', 'built'].includes(pp.lane)).map((pp) => expectedFor(pp, allItems.filter((i) => i.projectId === pp.id), today)), today), ...seqTodos, ...priceTodos(await getConfig('price-alerts', {}).catch(() => ({})), today), ...emailTodos(mailA, evA), ...coveringTasks(coverList, today)], emailBar: emailFilterBar(emailCounts(mailA), q.f === 'email' ? evA : ''), projects: markOnBoard(projects, allItems), log, today, filter: q.f || '', party: q.party === '1', isSales: user.prefs.as === 'sales', flash: q.flash || '', side: proofA, coord: coordA, cal: q.cal === 'week' ? 'week' : 'day', waiting: emailTodos(mailA, 'waiting'), goals: adm, celebrations: adm.celebrations !== false, newTask: q.new ? { projectId: q.project || '' } : null, team: await getConfig('team', demoTeam()).catch(() => demoTeam()), me: who }));
    }
    const cim = path.match(/^\/customers\/imported\/(\d{1,9})$/);
    if (cim) {
      let data = null; try { data = await loadImported(cim[1]); } catch { data = null; }
      if (!data) return html(simplePage({ user, mode, title: 'Not found', message: 'That CoreBridge customer is not in the import yet.', tab: 'Customers' }), 404);
      const ixs = await getConfig('index-backfill', null).catch(() => null);
      return html(importedDetailPage({ page: (o) => simplePage0(o), user, data, indexing: !(ixs && ixs.done) }));
    }
    if (path === '/customers/imported') {
      const hs = await getConfig('history-state', null).catch(() => null);
      let r = { rows: [], next: '' };
      try { r = await listImported({ q: q.q || '', token: q.t || '' }); } catch { /* table not reachable in tests */ }
      return html(importedPage({ page: (o) => simplePage0(o), user, rows: r.rows, q: q.q || '', next: r.next, total: (hs && hs.counts && hs.counts.customers) || 0 }));
    }
    const prvM = path.match(/^\/customers\/prospects\/(route|hide)$/);
    if (prvM && method === 'POST') {
      if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
      const f = formBody(event);
      const bk = safeBack(f.back, '/customers?view=prospects');
      const go = (msg) => redirect(`${bk}${bk.includes('?') ? '&' : '?'}flash=${encodeURIComponent(msg)}${prvM[1] === 'route' ? '#route' : ''}`);
      try {
        if (prvM[1] === 'route') { const key = `prospect-route-${personOf(user)}`; const r0 = await getConfig(key, { ids: [] }).catch(() => ({ ids: [] })); await putConfig(key, applyRoute(r0, f)); return go(f.do === 'add' ? 'Added to your route.' : f.do === 'clear' ? 'Route cleared.' : 'Removed from your route.'); }
        const h0 = await getConfig('prospect-hidden', []).catch(() => []); await putConfig('prospect-hidden', applyHide(h0, f));
        return go(f.do === 'unhide' ? 'Moved back to Prospects.' : 'Marked Not a Fit. Find it under Not a Fit to move it back. Nothing changes in CoreBridge.');
      } catch (e) { return go('Not saved: ' + e.message); }
    }
    if (path === '/customers' && q.view === 'prospects') {
      const [mk, rt, hd, adm] = await Promise.all([getConfig('market-summary', null).catch(() => null), getConfig(`prospect-route-${personOf(user)}`, { ids: [] }).catch(() => ({ ids: [] })), getConfig('prospect-hidden', []).catch(() => []), getConfig('admin-settings', {}).catch(() => ({}))]);
      const body = `<div class="wrap">${prospectsView({ market: mk, route: rt, hidden: hd, city: String(q.city || '').slice(0, 60), q: String(q.q || '').slice(0, 80), showHidden: q.hidden === '1', origin: adm.shopAddress || 'FASTSIGNS of Northern Kentucky, Florence, KY', flash: q.flash || '' })}</div>`;
      return html(simplePage0({ title: 'Prospects', user, tab: 'Customers', body: `<div class="bar" style="padding:14px 20px"><h1>Customers</h1></div>${body}` }));
    }
    const cm = path.match(/^\/customers(?:\/([\w-]+))?(?:\/(activity|vote|contact|need|priority))?$/);
    if (cm) {
      const { projects: allP } = await listProjects('demo');
      const customers = listCustomers(allP);
      if (!cm[1]) {
        const today3 = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
        let adm = {}; try { adm = await getConfig('admin-settings', {}); } catch { /* defaults */ }
        const profs = await Promise.all(customers.map((c) => getConfig(`customer-${c.id}`, {}).catch(() => ({}))));
        const warm = customers.map((c, n) => ({ ...c, ...warmth(c, profs[n], today3, adm) })).filter((w) => w.state !== 'Active');
        let mailL = demoMail(today3); try { mailL = await getConfig(`mail-${personOf(user)}`, mailL); } catch { /* demo */ }
        const lastConv = lastConversations(customers, { profiles: profs, mail: mailL });
        return html(customersPage({ lastConv, today: today3, cbMatches: q.q ? await listImported({ q: q.q, limit: 50 }).then((r) => r.rows.length).catch(() => 0) : 0, user, customers, q: q.q || '', warm, stage: ['prospect', 'quoting', 'active', 'warm', 'dormant'].includes(q.stage) ? q.stage : '', show: ['attention', 'prospects', 'inactive'].includes(q.show) ? q.show : '', sort: ['attention', 'next', 'lifetime'].includes(q.sort) ? q.sort : '', group: q.group === 'none' ? 'none' : '' }).replace('<section aria-label="Contact summary" class="ctiles">', viewToggle('') + '<section aria-label="Contact summary" class="ctiles">').replace('<main id="main">', '<main id="main"><div class="note" style="margin:12px 20px 0;background:#e8f0fb;color:#1d4f91">CoreBridge history is importing. <a href="/customers/imported"><b>Browse the imported CoreBridge customers →</b></a></div>'));
      }
      const c = customers.find((x) => x.id === cm[1]);
      if (!c) return html(simplePage({ user, mode, title: 'Not found', message: 'That customer is not here.', tab: 'Customers' }), 404);
      let profile = {};
      try { profile = await getConfig(`customer-${c.id}`, {}); } catch { /* none yet */ }
      if (method === 'POST') {
        if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
        if (cm[2] === 'need') {
          try {
            const r = addNeed(profile, formBody(event), { at: new Date().toISOString() });
            const today10 = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
            let tk = demoTasks(today10); try { tk = await getConfig(`tasks-${personOf(user)}`, tk); } catch { /* demo */ }
            const openP = c.projects.find((x) => !['complete', 'lost'].includes(x.lane));
            await putConfig(`tasks-${personOf(user)}`, [...tk, { ...r.task, customer: c.name, projectId: openP ? openP.id : '' }]);
            await putConfig(`customer-${c.id}`, r.profile);
            return redirect(`/customers/${c.id}?flash=${encodeURIComponent('Need added. It will show on Activities on that date.')}`);
          } catch (e) { return redirect(`/customers/${c.id}?flash=${encodeURIComponent('Not added: ' + e.message)}`); }
        }
        if (cm[2] === 'priority') {
          try { await putConfig(`customer-${c.id}`, mergePriority(profile, formBody(event))); return redirect(`/customers/${c.id}?flash=${encodeURIComponent('Priority saved. It shows on every project for this customer.')}`); }
          catch (e) { return redirect(`/customers/${c.id}?flash=${encodeURIComponent('Not saved: ' + e.message)}`); }
        }
        if (cm[2]) {
          const at = new Date().toISOString();
          const back2 = `/customers/${c.id}?tab=${cm[2] === 'vote' ? 'activity' : cm[2] === 'contact' ? 'contacts' : 'activity'}&`;
          try { await putConfig(`customer-${c.id}`, cm[2] === 'activity' ? logActivity(profile, formBody(event), { who: personOf(user), at }) : cm[2] === 'contact' ? addContact(profile, formBody(event)) : voteInsight(profile, formBody(event).v, { who: personOf(user), at })); return redirect(back2 + 'flash=' + encodeURIComponent(cm[2] === 'activity' ? 'Logged.' : cm[2] === 'contact' ? 'Contact added.' : 'Thanks for the feedback.')); }
          catch (e) { return redirect(back2 + 'flash=' + encodeURIComponent('Not saved: ' + e.message)); }
        }
        const back = `/customers/${c.id}${q.tab ? '?tab=' + encodeURIComponent(q.tab) + '&' : '?'}`;
        try { await putConfig(`customer-${c.id}`, mergeProfile(profile, formBody(event))); return redirect(back + 'flash=' + encodeURIComponent('Saved.')); }
        catch (e) { return redirect(back + 'flash=' + encodeURIComponent('Not saved: ' + e.message)); }
      }
      const todayC = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
      let mailC = demoMail(todayC); try { mailC = await getConfig(`mail-${personOf(user)}`, mailC); } catch { /* demo */ }
      const mineC = mailForCustomer(mailC, c.name).filter((m) => m.folder !== 'spam').sort((a, b) => b.at.localeCompare(a.at));
      let emailHtml = '';
      if (q.tab === 'email') {
        let meC = {}; try { meC = await getConfig(`me-${personOf(user)}`, {}); } catch { /* none */ }
        const sigC = meC.signature || '';
        const rp = q.reply ? mineC.find((m) => m.id === q.reply) : null;
        const fw = !rp && q.fwd ? mineC.find((m) => m.id === q.fwd) : null;
        const toC = rp ? rp.from : ((profile.contactsExtra || []).find((x) => x.email) || {}).email || (mineC.find((m) => m.folder === 'inbox') || {}).from || '';
        const backC = `/customers/${c.id}?tab=email`;
        const shopT = withTemplateDefaults(await getConfig('email-templates', null).catch(() => null));
        const mineT = await getConfig(`tpl-${personOf(user)}`, []).catch(() => []);
        const tplC = q.tpl ? pickTemplate(q.tpl, shopT, mineT) : null;
        const pOpen = c.projects.find((pp) => !['complete', 'lost'].includes(pp.lane)) || c.projects[0] || {};
        const admT = await getConfig('admin-settings', {}).catch(() => ({}));
        const varsT = { first_name: String(pOpen.contact || (c.contacts || [])[0] || '').split(' ')[0], company: c.name, order_number: pOpen.orderId ? `${admT.docPrefix ?? '226'}-${pOpen.orderId}` : (pOpen.name || ''), salesperson: user.name || '' };
        emailHtml = templatePicker({ action: `/customers/${c.id}`, hidden: { tab: 'email', ...(q.reply ? { reply: q.reply } : {}) }, shop: shopT, mine: mineT, current: q.tpl || '' }) + composer({ tools: `${bookingButton(meC.booking || '')}<a class="btn" href="/customers/${esc(c.id)}?tab=email${q.reply ? '&reply=' + encodeURIComponent(q.reply) : ''}&help=1#compose" style="background:#f3f0fa;color:#4a3373;border-color:#e2dbf2;margin-left:auto" title="Starts a draft from this customer's open project. You edit it before sending.">Help Me Write</a>`, body: fw ? `<br><br>---------- Forwarded message ----------<br>From: ${esc(fw.name || fw.from || '')}<br>Subject: ${esc(fw.subject || '')}<br><br>${fw.html || esc(fw.preview || '')}` : tplC ? textToHtml(fillT(tplC.body, varsT)) : q.help ? textToHtml(helpMeWrite({ first: varsT.first_name, company: c.name, project: pOpen.name || '', lane: pOpen.lane || '', salesperson: user.name || '', booking: meC.booking || '' })) : '', to: fw ? '' : toC, subject: fw ? (/^fwd:/i.test(fw.subject) ? fw.subject : 'Fwd: ' + fw.subject) : tplC ? fillT(tplC.subject, varsT) : rp ? (/^re:/i.test(rp.subject) ? rp.subject : 'Re: ' + rp.subject) : '', back: backC, customer: c.name, projectId: q.project || (rp && rp.projectId) || '', signature: sigC, replyTo: rp ? rp.id : '' })
          + `<section aria-label="Email history"><h2 style="margin:14px 0 8px;font-size:15px">Email History</h2>${mailRows(mineC, { back: backC, replyHref: (m) => `/customers/${c.id}?tab=email&reply=${m.id}#compose`, fwdHref: (m) => `/customers/${c.id}?tab=email&fwd=${m.id}#compose` }) || '<div class="panel" style="color:var(--mute)">No email with this customer yet.</div>'}</section>`;
      }
      let seqHtmlC = '';
      if (q.tab === 'activity') { try { seqHtmlC = sequenceProgressHtml(sequenceProgress({ seqs: await getConfig('sequences', null).catch(() => null), state: await getConfig('seqstate', {}).catch(() => ({})), projects: c.projects, today: todayC })); } catch { /* none */ } }
      return html(customerPage({ undo: q.undo || '', user, c, profile, tab: q.tab, flash: q.flash || '', emailHtml, emailCount: mineC.filter((m) => m.folder === 'inbox').length, seqHtml: seqHtmlC }));
    }
    if (path === '/performance') {
      let adm = {}; try { adm = await getConfig('admin-settings', {}); } catch { /* defaults */ }
      return html(performancePage({ user, person: /^[a-z][a-z .'-]{0,40}$/.test(String(q.rep || '')) ? String(q.rep) : '', projects: (await listProjects('demo')).projects, preview: q.preview === '1', celebrations: adm.celebrations !== false, goals: { monthSales: adm.monthSales ?? 40000, closeRate: adm.closeRate ?? 50 } }));
    }
    if (path === '/risks' || path === '/team') {
      const its = await listItems();
      const tgT = stepTargetsFrom(await getConfig('workflow-published', null).catch(() => null));
      const st = stuckItems(its, new Date(), tgT).map((s) => ({ ...its.find((i) => i.id === s.id), ...s }));
      const todayT = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
      const teamT = await getConfig('team', demoTeam()).catch(() => demoTeam());
      const tasksBy = {}, mailBy = {};
      for (const m of teamT.slice(0, 15)) { tasksBy[m.key] = await getConfig(`tasks-${m.key}`, m.key === personOf(user) ? demoTasks(todayT) : []).catch(() => []); mailBy[m.key] = await getConfig(`mail-${m.key}`, m.key === personOf(user) ? demoMail(todayT) : []).catch(() => []); }
      const { projects: prT } = await listProjects('demo');
      const admT2 = await getConfig('admin-settings', {}).catch(() => ({}));
      const stN = st.map((s) => ({ ...s, stepName: stepById(s.step)?.name || s.step }));
      const slip = slipping({ projects: markOnBoard(prT, its), tasksBy, mailBy, stuck: stN, team: teamT, today: todayT });
      return html(teamPage({ user, stuck: st, items: its, stepName: (id) => stepById(id)?.name || id, slip, reps: repRows({ projects: prT, tasksBy, mailBy, stuck: stN, today: todayT, goal: admT2.monthSales ?? 40000 }), show: ['Email', 'Task', 'Project', 'Customer'].includes(q.show) ? q.show : '', flash: q.flash || '' }));
    }
    if (path === '/team/nudge' && method === 'POST') {
      if (!sameSite()) return html(bare('Blocked', 'That request came from another site.'), 403);
      const f = formBody(event);
      const teamU = await getConfig('team', demoTeam()).catch(() => demoTeam());
      const who = teamU.find((t) => t.key === String(f.to || ''));
      if (!who) return redirect('/team?flash=' + encodeURIComponent('Not sent: pick someone on the team.'));
      const tdU = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
      const tkU = await getConfig(`tasks-${who.key}`, []).catch(() => []);
      const pid = (String(f.href || '').match(/^\/projects\/([\w-]+)/) || [])[1] || '';
      await putConfig(`tasks-${who.key}`, [...tkU, { id: 'nd' + Date.now().toString(36), kind: 'task', title: `Nudge from ${user.name || 'the owner'}: ${String(f.title || '').slice(0, 100)}`, customer: '', projectId: pid, due: tdU, done: false, nudge: true }]);
      return redirect('/team?flash=' + encodeURIComponent(`Nudged ${who.name}. It's on their Activities for today.`));
    }
    const tabs = { '/performance': 'Performance', '/risks': 'Team', '/me': 'My Profile & Settings', '/feedback': 'Send Feedback' };
    if (tabs[path]) return html(simplePage({ user, mode, tab: tabs[path], title: tabs[path], message: `${tabs[path]} is coming in a later slice. Projects is live in this test copy.` }));
    return html(simplePage({ user, mode, title: 'Not found', message: 'That page does not exist.', tab: '' }), 404);
  } catch (e) {
    console.error(JSON.stringify({ msg: 'request failed', path, error: e.message }));
    return html(bare('Something went wrong', e.message.includes('access') || e.message.includes('sign-in') ? e.message : 'Please try again. The error was logged.', ['Back to Projects', '/projects']), 500);
  }
};


// Every product line Built -> order Built -> send to XPS (Phil, Nov 12). Returns text for the flash message.
async function afterBuilt(projectId, by) {
  const all = (await listItems()).filter((i) => i.projectId === projectId);
  const dest = await getConfig(`dest-${projectId}`, null).catch(() => null);
  const ship = await getConfig(`ship-${projectId}`, null).catch(() => null);
  const par = await getConfig('parallel-mode', {}).catch(() => ({}));
  const rules0 = await getConfig('ship-rules', {}).catch(() => ({}));
  const t = xpsTrigger({ items: all, dest, ship, parallel: !!(par && par.on), rules: rules0 || {} });
  if (t.action !== 'push') return t.message ? ' ' + t.message : '';
  const p = await getProject(projectId, 'demo');
  const orderNo = (p && p.orderId) || ((all[0] && String(all[0].ref || '').match(/Order (\d+)/)) || [])[1];
  const at = new Date().toISOString();
  let rec;
  try {
    const body = buildPutOrder({ orderNumber: orderNo, project: p || {}, dest, packages: ship.packages, today: at.slice(0, 10) });
    if (process.env.XPS_WRITES === 'on') {
      let c = null; try { c = await readApp('xps'); } catch { c = null; }
      await xpsPutOrder({ ...(c || {}), body });
      rec = { ok: true, note: `Sent for shipping as order ${body.orderId} with ${body.packages.length} box(es). Shipping buys the label.` };
    } else rec = { ok: true, test: true, note: `Test copy: shipping order ${body.orderId} is ready (${body.packages.length} box(es), ship to ${dest.city}, ${dest.state}) but was not sent.` };
  } catch (e) { rec = { ok: false, failed: true, note: 'The shipping system did not take the order: ' + e.message }; }
  await putConfig(`ship-${projectId}`, { ...ship, xpsOrder: { ...rec, at, by } });
  return ' Every line is Built, so the order is Built. ' + rec.note;
}


// Scheduled every minute (EventBridge input {"job":"history"}). Runs only while the owner has it turned on.
// Builds the phone list (PHONE#) from imported CoreBridge records, and files the first raw Clarity samples as calls.
async function phonesJob() {
  let st = await getConfig('phones-backfill', null).catch(() => null);
  if (st && st.done && st.rawDone) {
    let ix = await getConfig('index-backfill', null).catch(() => null);
    if (!ix || !ix.done) { ix = await phoneBackfillStep(ix || {}, { budgetMs: 15000, order: ['contacts', 'orders'], entries: indexEntries, toItem: (e) => e, keyOf: (e) => e.sk }); await putConfig('index-backfill', ix); }
    return st;
  }
  if (!st || !st.done) st = await phoneBackfillStep(st || {}, { budgetMs: 15000, entries: phoneEntries });
  if (st.done && !st.rawDone) {
    for (const x of await getConfig('calls-raw', []).catch(() => [])) { try { const rec = parseCall(x.raw, x.at); if (rec.id) { rec.match = await lookupPhone(rec.customerPhone).catch(() => null); await saveCall(rec); } } catch { /* skip */ } }
    st.rawDone = true;
  }
  await putConfig('phones-backfill', st);
  return st;
}
async function historyJob() {
  const ctl = await getConfig('history-job', {}).catch(() => ({}));
  if (!ctl || !ctl.on) return { skipped: 'off' };
  let st = await getConfig('history-state', null).catch(() => null);
  try {
    st = await historyStep({ read: (op, req) => cbRead(op, req.params, { body: req.body, deadline: Date.now() + 12000 }), save: (e, recs) => saveRecords(e, recs, { loc: 'nky' }), state: st, maxCalls: 3, budgetMs: 26000 });
    st.lastError = '';
  } catch (e) { st = { ...(st || newState()), lastError: String(e.message || e).slice(0, 200), lastRunAt: new Date().toISOString() }; }
  await putConfig('history-state', st);
  if (st.done) await putConfig('history-job', { ...ctl, on: false, finishedAt: new Date().toISOString() });
  return { ok: true, done: !!st.done };
}


// Clarity Voice posts completed calls here (no SalesMax sign-in; checked with the signing secret instead).
async function callsHook(event, method) {
  const J = (code, obj) => ({ statusCode: code, headers: { 'content-type': 'application/json' }, body: JSON.stringify(obj) });
  if (method !== 'POST') return J(405, { error: 'POST only' });
  let app = null; try { app = await readApp('clarity'); } catch { app = null; }
  if (!app || !app.signingKey) return J(503, { error: 'not set up yet' });
  if (!verifySignature(event.headers, app.signingKey)) return J(401, { error: 'signing key does not match' });
  const raw = event.body ? (event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body) : '';
  if (raw.length > 256000) return J(413, { error: 'too large' });
  const rec = parseCall(raw);
  if (rec.verification) await putConfig('clarity-verification', { value: rec.verification, at: rec.receivedAt });
  if (rec.id) { try { rec.match = await lookupPhone(rec.customerPhone).catch(() => null); await saveCall(rec); } catch { /* kept in calls-latest */ } }
  const prev = await getConfig('calls-latest', []).catch(() => []);
  await putConfig('calls-latest', keepLatest(prev.filter((x) => !rec.id || x.id !== rec.id), { receivedAt: rec.receivedAt, at: rec.at, id: rec.id, direction: rec.direction, from: rec.from, to: rec.to, duration: rec.duration, summary: String(rec.summary || '').slice(0, 300), keys: rec.keys, test: rec.test }, 50));
  try { const rawPrev = await getConfig('calls-raw', []).catch(() => []); await putConfig('calls-raw', keepLatest(rawPrev, { at: rec.receivedAt, raw: raw.slice(0, 60000) }, 3)); } catch { /* sample only */ }
  return J(200, { ok: true });
}


function expectedFor(p, its, today) {
  const v = readyForecast(its, { steps: STEPS, targets: STEP_TARGET_DAYS, today, due: null });
  const live = its.filter((i) => i.step !== 'done');
  return { ...expectedReady({ velocity: live.length ? v.likely : null, vended: live.filter((i) => i.vendorEta).map((i) => ({ name: i.name, date: i.vendorEta })), hardDue: p.hardDue ? p.due : null }), projectId: p.id, name: p.name, company: p.company };
}
