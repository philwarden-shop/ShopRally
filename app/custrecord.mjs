import { priorityCard } from './priority.mjs';
import { undoBar } from './mailtodo.mjs';
// Customers list + Customer record (tabs with count badges, Account tab last, Shipping Accounts, Classification).
import { page, esc } from './views.mjs';
import { contactsHtml } from './extras2.mjs';

export const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const money = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('en-US');

export const CARRIERS = { express: 'Express', ground: 'Ground', freight: 'Freight' };
export const STATUSES = ['Active', 'Keep Warm', 'Dormant', 'On Hold'];
export const LOCATIONS = ['Northern Kentucky', 'Second location'];
export const TABS = [['overview', 'Overview'], ['projects', 'Projects'], ['contacts', 'Contacts'], ['activity', 'Activity'], ['email', 'Email'], ['account', 'Account']];

export function listCustomers(projects) {
  const by = new Map();
  for (const p of projects) {
    const k = slug(p.company);
    if (!k) continue;
    const c = by.get(k) || { id: k, name: p.company, projects: [], contacts: new Set(), open: 0, lifetime: 0, salesperson: p.salesperson };
    c.projects.push(p);
    if (p.contact) c.contacts.add(p.contact);
    if (['complete', 'lost'].includes(p.lane)) c.lifetime += Number(p.total) || 0; else c.open += Number(p.total) || 0;
    by.set(k, c);
  }
  return [...by.values()].map((c) => ({ ...c, contacts: [...c.contacts] })).sort((a, b) => a.name.localeCompare(b.name));
}

export function defaultProfile() {
  return { homeLocation: LOCATIONS[0], status: 'Active', marketing: true, strategic: false, shipping: { express: { carrier: '', acct: '' }, ground: { carrier: '', acct: '' }, freight: { carrier: '', acct: '' } } };
}

// Saving a form: only known fields, trimmed; shipping account numbers kept as typed (letters, digits, dashes).
export function mergeProfile(prev, f) {
  const p = { ...defaultProfile(), ...prev, shipping: { ...defaultProfile().shipping, ...(prev?.shipping || {}) } };
  if (f.homeLocation && LOCATIONS.includes(f.homeLocation)) p.homeLocation = f.homeLocation;
  if (f.status && STATUSES.includes(f.status)) p.status = f.status;
  if ('marketingSet' in f) p.marketing = f.marketing === 'on';
  if (f.togglePrio) p.strategic = !p.strategic;
  if ('flagSet' in f) { p.flag = String(f.flag || '').replace(/\s+/g, ' ').trim().slice(0, 200); p.why = String(f.why || '').replace(/\s+/g, ' ').trim().slice(0, 300); }
  if ('termsSet' in f) {
    if (f.terms) p.terms = String(f.terms).slice(0, 40);
    if (f.taxGroup) p.taxGroup = String(f.taxGroup).slice(0, 40);
    const cl = String(f.creditLimit ?? '').trim();
    if (cl !== '' && !(Number(cl) >= 0)) throw new Error('the credit limit must be a number');
    p.creditLimit = cl === '' ? null : Number(cl);
    p.taxExemptReason = String(f.taxExemptReason || '').trim().slice(0, 60);
  }
  if ('locations' in f) p.locations = [...new Set(String(f.locations || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean))].slice(0, 20).map((s) => s.slice(0, 160));
  for (const k of Object.keys(CARRIERS)) {
    if (`${k}Carrier` in f || `${k}Acct` in f) {
      const acct = String(f[`${k}Acct`] || '').trim();
      if (acct && !/^[A-Za-z0-9-]{3,30}$/.test(acct)) throw new Error(`the ${CARRIERS[k]} account number can only have letters, numbers and dashes`);
      p.shipping[k] = { carrier: String(f[`${k}Carrier`] || '').trim().slice(0, 40), acct };
    }
  }
  return p;
}


export const ACT_KINDS = ['Call', 'Email', 'Visit', 'Note'];
export function logActivity(profile, f, { who, at }) {
  const kind = ACT_KINDS.includes(f.actKind) ? f.actKind : null;
  if (!kind) throw new Error('pick Call, Email, Visit or Note');
  const note = String(f.actNote || '').trim();
  if (note.length < 2) throw new Error('add a short note');
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(f.actDate || '')) ? f.actDate : at.slice(0, 10);
  const activity = [{ kind, note: note.slice(0, 1000), date, who, at }, ...((profile && profile.activity) || [])].slice(0, 200);
  return { ...defaultProfile(), ...profile, activity, lastContact: [date, profile?.lastContact || ''].sort().pop() };
}
export function voteInsight(profile, v, { who, at }) {
  if (!['up', 'down'].includes(v)) throw new Error('pick thumbs up or down');
  return { ...defaultProfile(), ...profile, insightVotes: [...((profile && profile.insightVotes) || []), { v, who, at }].slice(-50) };
}
const daysBetween = (a, b) => Math.round((new Date(b + 'T12:00:00Z') - new Date(a + 'T12:00:00Z')) / 86400000);
// Last contact = latest logged activity, else the latest project date. Keep Warm after keepWarmDays, Dormant after dormantDays.
export function warmth(c, profile, today, { keepWarmDays = 90, dormantDays = 180 } = {}) {
  const dates = [profile?.lastContact, ...c.projects.map((p) => p.due)].filter(Boolean).sort();
  const last = dates.pop();
  if (!last) return { state: 'Keep Warm', days: null, last: null };
  const d = daysBetween(last, today);
  return { state: d >= dormantDays ? 'Dormant' : d >= keepWarmDays ? 'Keep Warm' : 'Active', days: d, last };
}

// Upcoming needs: "they'll want trade show banners in March". Each need becomes a task on Activities for its date.
export function addNeed(profile, f, { at }) {
  const what = String(f.needWhat || '').trim();
  if (what.length < 3) throw new Error('say what they will need');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(f.needDate || ''))) throw new Error('pick when to follow up');
  const id = 'need-' + Date.now().toString(36);
  return { profile: { ...(profile || {}), needs: [...((profile && profile.needs) || []), { id, what: what.slice(0, 200), date: f.needDate, at }] }, task: { id, kind: 'call', title: `Follow up: ${what.slice(0, 120)}`, due: f.needDate, done: false } };
}
export function needsHtml(cid, needs = []) {
  const rows = needs.slice().sort((a, b) => a.date.localeCompare(b.date)).map((n) => `<li style="padding:6px 0;border-top:1px solid #eef1f5"><b>${esc(n.what)}</b> · ${esc(n.date)} <span style="font-size:12px;color:var(--mute)">(task on Activities)</span></li>`).join('');
  return `<section class="panel" aria-label="Upcoming needs"><h2 style="margin:0 0 6px;font-size:15px">Upcoming Needs · ${needs.length}</h2>${rows ? `<ul style="list-style:none;margin:0;padding:0;font-size:13px">${rows}</ul>` : '<p style="margin:0;color:var(--mute);font-size:13px">Nothing noted yet.</p>'}
<details style="margin-top:8px"><summary style="cursor:pointer;font-weight:700">+ Add a Need</summary><form method="post" action="/customers/${esc(cid)}/need" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px;align-items:end;margin-top:8px"><label style="display:flex;flex-direction:column;font-size:12px">What they will need<input name="needWhat" required minlength="3" style="font:inherit;min-height:36px;border:1px solid #d5dbe5;border-radius:8px;padding:0 8px"></label><label style="display:flex;flex-direction:column;font-size:12px">Follow up on<input type="date" name="needDate" required style="font:inherit;min-height:36px;border:1px solid #d5dbe5;border-radius:8px;padding:0 8px"></label><button class="btn primary">Add Need</button></form></details></section>`;
}

export function customerInsight(c) {
  const open = c.projects.filter((p) => !['complete', 'lost'].includes(p.lane));
  const install = c.projects.some((p) => /install|exterior|lobby|channel/i.test(p.name));
  if (!open.length) return { text: `No open projects. Last spend ${money(c.lifetime)}. A check-in call could restart the conversation.`, action: 'Add a Follow-Up Task' };
  if (install) return { text: `${open.length} open project${open.length === 1 ? '' : 's'} with install work. A site walk now avoids surprises at install.`, action: 'Schedule Site Walk' };
  return { text: `${open.length} open project${open.length === 1 ? '' : 's'} worth ${money(c.open)}. Keep the next step booked.`, action: 'Add a Follow-Up Task' };
}

const badge = (n) => `<span style="display:inline-flex;min-width:20px;height:20px;padding:0 6px;border-radius:10px;align-items:center;justify-content:center;background:#dfe8f5;color:#2c4a73;font-size:11px;font-weight:700;margin-left:6px">${n}</span>`;
const info = (t) => `<span title="${esc(t)}" aria-label="${esc(t)}" style="display:inline-flex;width:16px;height:16px;border-radius:8px;background:#eef1f5;color:#5a6478;font-size:11px;font-weight:700;align-items:center;justify-content:center;cursor:help">i</span>`;

export function flagStrip(flag, editHref = '') {
  if (!flag) return '';
  return `<div role="note" style="display:flex;gap:10px;align-items:flex-start;background:#fff8ec;border:1px solid #f2d29b;border-radius:10px;padding:10px 14px;font-size:13px;color:#5c3a0c"><b style="white-space:nowrap">⚑ Customer flag</b><span style="flex:1 1 auto">${esc(flag)}</span>${editHref ? `<a href="${esc(editHref)}" style="font-size:12px;color:#874511">Edit</a>` : ''}</div>`;
}

export function customersPage({ user, customers, q = '', warm = [], stage: pick = '', cbMatches = null, lastConv = {}, today = new Date().toISOString().slice(0, 10), show = '', sort = '', group = '' }) {
  const s = String(q).toLowerCase();
  const STAGES = [
    ['prospect', 'New prospect', 'Cold · just added', '#e8f0fb', '#1d4f91'],
    ['quoting', 'Quoting', 'Hot · estimate out', '#fbeaec', '#8f2a34'],
    ['active', 'Active project', 'Hot · order in progress', '#a8343f', '#ffffff'],
    ['warm', 'Keep warm', 'Ordered, nothing open', '#fdeedf', '#874511'],
    ['dormant', 'Dormant', 'No contact in a long while', '#eef0f4', '#3d4658'],
  ];
  const warmIds = new Set(warm.filter((w) => w.state !== 'Dormant').map((w) => w.id));
  const dormIds = new Set(warm.filter((w) => w.state === 'Dormant').map((w) => w.id));
  const stageOf = (c) => {
    const lanes = c.projects.map((p) => p.lane);
    if (lanes.some((l) => ['progress', 'built'].includes(l))) return 'active';
    if (lanes.includes('estimate')) return 'quoting';
    if (lanes.includes('prospect')) return 'prospect';
    return dormIds.has(c.id) ? 'dormant' : 'warm';
  };
  const TEMP = { prospect: ['Cold', '#e8f0fb', '#1d4f91'], quoting: ['Hot', '#fbeaec', '#8f2a34'], active: ['Hot', '#fbeaec', '#8f2a34'], warm: ['Warm', '#fdeedf', '#874511'], dormant: ['Inactive', '#eef0f4', '#3d4658'] };
  const all = customers.map((c) => ({ ...c, stage: stageOf(c), lifetime: c.projects.reduce((a, p) => a + (Number(p.total) || 0), 0), openN: c.projects.filter((p) => !['complete', 'lost'].includes(p.lane)).length }));
  const counts = Object.fromEntries(STAGES.map(([k2]) => [k2, all.filter((c) => c.stage === k2).length]));
  const needsAttn = (c) => ['warm', 'dormant'].includes(c.stage) || !c.projects.some((p) => !['complete', 'lost'].includes(p.lane));
  const SHOW = { attention: needsAttn, prospects: (c) => c.stage === 'prospect', inactive: (c) => c.stage === 'dormant' };
  const ORDER = { dormant: 0, warm: 1, prospect: 2, quoting: 3, active: 4 };
  const nextDue = (c) => (c.projects.filter((p) => !['complete', 'lost'].includes(p.lane) && p.due).map((p) => p.due).sort()[0] || '9999');
  const SORTS = { attention: (a, b) => (needsAttn(b) - needsAttn(a)) || ORDER[a.stage] - ORDER[b.stage] || a.name.localeCompare(b.name), next: (a, b) => nextDue(a).localeCompare(nextDue(b)), lifetime: (a, b) => b.lifetime - a.lifetime, name: (a, b) => a.name.localeCompare(b.name) };
  const list = all.filter((c) => (!s || c.name.toLowerCase().includes(s) || (c.contacts || []).some((n) => String(n).toLowerCase().includes(s))) && (!pick || c.stage === pick) && (!SHOW[show] || SHOW[show](c))).sort(SORTS[sort] || SORTS.name);
  const contactsN = new Set(all.flatMap((c) => (c.contacts || []).map((n) => c.id + '|' + n))).size;
  const openVal = all.reduce((a, c) => a + (Number(c.open) || 0), 0);
  const tile = (label, value, hint, color, action, href) => `<div class="ctile"><div class="l">${label}</div><div class="v" style="color:${color}">${value}</div><div class="h">${hint}</div><a href="${href}">${action} →</a></div>`;
  const tiles = `<section aria-label="Contact summary" class="ctiles">${tile('Customers to keep warm', warmIds.size, 'Nothing open · each has a reason to call', '#a8343f', 'Start Check-Ins', '/customers?stage=warm')}${tile('Going dormant', dormIds.size, 'No contact in a long while', '#a8343f', 'Win Them Back', '/customers?stage=dormant')}${tile('Prospects to develop', counts.prospect, 'New and not quoted yet', 'var(--ink)', 'Plan Next Steps', '/customers?stage=prospect')}${tile('Quoting now', counts.quoting, 'Estimate out, waiting on a yes', 'var(--ink)', 'Follow Up', '/customers?stage=quoting')}${tile('Open pipeline', money(openVal), `${counts.active} customers with work in progress`, '#5b3f8c', 'Open Projects', '/projects')}</section>`;
  const journey = `<section aria-label="Contact journey" class="cpanel"><h2>Where Your Contacts Are</h2><ol class="journey">${STAGES.map(([k2, n, h, bg, fg]) => `<li><a href="/customers${pick === k2 ? '' : '?stage=' + k2}" aria-current="${pick === k2}" style="background:${bg};color:${fg}${pick === k2 ? ';outline:3px solid #16213a' : ''}"><span>${n}</span><b>${counts[k2]}</b></a><div>${h}</div></li>`).join('')}</ol></section>`;
  const sugg = cleanupSuggestions(all);
  const suggHtml = sugg.length ? `<section aria-label="Cleanup suggestions" style="background:#fffaf3;border:1px solid #f0d6b3;border-radius:12px;padding:16px 20px;display:flex;flex-direction:column;gap:10px"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap"><h2 style="margin:0;font-size:16px">${sugg.length} Cleanup Suggestion${sugg.length === 1 ? '' : 's'}</h2><span style="font-size:12px;color:#874511;font-weight:600">Nothing changes until you open it and confirm</span></div>${sugg.map((x) => `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;background:#fff;border:1px solid #f0e2cf;border-radius:10px;padding:10px 14px"><div><span style="font-size:11px;font-weight:700;color:#874511;text-transform:uppercase;letter-spacing:.4px">${esc(x.kind)}</span><div style="font-size:14px;font-weight:600">${esc(x.title)}</div><div style="font-size:12px;color:var(--mute)">${esc(x.why)}</div></div><a class="btn" href="${esc(x.href)}">Review</a></div>`).join('')}</section>` : '';
  const groups = list.map((c) => {
    const [t, tb, tf] = TEMP[c.stage];
    const people = (c.contacts && c.contacts.length ? c.contacts : ['No contact yet']).slice(0, 6);
    const openP = c.projects.filter((p) => !['complete', 'lost'].includes(p.lane));
    const nextP = openP[0];
    return `<tbody><tr><th scope="rowgroup" colspan="6" class="cgrp"><div><a href="/customers/${esc(c.id)}">${esc(c.name)}</a><span>${people.length} contact${people.length === 1 ? '' : 's'} · ${c.openN} open · ${money(c.lifetime)} lifetime${c.salesperson ? ' · ' + esc(c.salesperson) : ''}</span></div></th></tr>${people.map((n, i) => `<tr><td class="cn"><a href="/customers/${esc(c.id)}?tab=contacts"><b>${esc(n)}</b></a><div>${i === 0 ? 'Main contact' : 'Contact'}</div></td><td class="cc"><span class="temp" style="background:${tb};color:${tf}">${t}</span><div>${esc(STAGES.find(([k2]) => k2 === c.stage)[1])}</div></td><td class="cc">${i === 0 ? lastConvCell(lastConv[c.id], today, c.id) : ''}</td><td style="color:${nextP ? '#1b2436' : '#a8343f'};font-weight:500">${i === 0 ? (nextP ? `<a href="/projects/${esc(nextP.id)}?mode=demo">${esc(nextP.name)}</a>` : 'Set a next step') : ''}</td><td>${i === 0 ? (openP.length ? `${openP.length} · ${money(c.open)}` : 'None') : ''}</td><td style="text-align:right;font-weight:600">${i === 0 ? money(c.lifetime) : ''}</td></tr>`).join('')}</tbody>`;
  }).join('');
  const CCSS = `.cw{max-width:1240px;margin:0 auto;padding:28px 32px 48px;display:flex;flex-direction:column;gap:24px}
.ctiles{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:16px}@media (max-width:1000px){.ctiles{grid-template-columns:repeat(2,minmax(0,1fr))}}
.ctile{background:#fff;border:1px solid var(--line);border-radius:12px;padding:18px 20px;display:flex;flex-direction:column;gap:6px;min-width:0}.ctile .l{font-size:13px;color:var(--mute);font-weight:500}.ctile .v{font-size:30px;font-weight:700}.ctile .h{font-size:12px;color:var(--mute)}.ctile a{font-size:13px;font-weight:600}
.cpanel{background:#fff;border:1px solid var(--line);border-radius:12px;padding:16px 20px;display:flex;flex-direction:column;gap:12px}.cpanel h2{margin:0;font-size:16px}
.journey{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px}.journey a{display:block;padding:12px 14px 12px 22px;clip-path:polygon(0 0,calc(100% - 14px) 0,100% 50%,calc(100% - 14px) 100%,0 100%,14px 50%);min-height:64px}.journey a:hover{text-decoration:none;filter:brightness(.97)}.journey span{display:block;font-size:13px;font-weight:700}.journey b{display:block;font-size:20px}.journey div{font-size:11px;color:var(--mute);padding:4px 6px 0}
.ctool{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.ctool input{font:inherit;font-size:13px;border:1px solid #d5dbe5;border-radius:8px;padding:0 10px;min-height:38px;width:260px}
.clist{background:#fff;border:1px solid var(--line);border-radius:12px;overflow-x:auto}.clist table{font-size:14px;min-width:980px}.clist thead th{font-size:12px;padding:10px 12px;border-bottom:1px solid var(--line)}.clist thead th:first-child{padding-left:20px}
.flat .cgrp{display:none}.cgrp{text-align:left;padding:10px 20px!important;background:#f8f9fb;border-bottom:1px solid #eef1f5}.cgrp div{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}.cgrp a{color:var(--ink);font-size:14px;font-weight:700}.cgrp span{font-size:12px;color:var(--mute);font-weight:500}
.clist td{padding:12px;border-bottom:1px solid #eef1f5;font-size:13px}.clist td.cn{padding-left:20px}.cn a{color:var(--ink)}.cn div,.cc div{font-size:12px;color:var(--mute);margin-top:2px}.cc{text-align:center}.temp{font-size:12px;font-weight:600;padding:3px 10px;border-radius:10px}`;
  const body = `<div class="cw"><header style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px"><div><h1 style="position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0)">Customers</h1><p style="margin:0;color:#3d4658;font-size:14px">${contactsN} contacts at ${all.length} companies</p></div><a class="btn" href="/customers.csv">Download CSV</a></header>
${tiles}${journey}${suggHtml}
<div class="ctool"><form role="search" style="margin:0;display:flex;gap:12px;flex-wrap:wrap;align-items:center">${pick ? `<input type="hidden" name="stage" value="${esc(pick)}">` : ''}${(() => { const sel = (name, label, opts, cur) => `<label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--mute)">${label}<select name="${name}" data-autosubmit style="font:inherit;font-size:14px;border:1px solid #d5dbe5;border-radius:8px;padding:0 10px;min-height:38px;background:#fff;color:var(--ink)">${opts.map(([v, l]) => `<option value="${v}"${cur === v ? ' selected' : ''}>${l}</option>`).join('')}</select></label>`; return sel('show', 'Show', [['', `All contacts (${contactsN})`], ['attention', `Needs attention (${all.filter(needsAttn).length})`], ['prospects', `Prospects (${counts.prospect})`], ['inactive', `Inactive (${counts.dormant})`]], show) + sel('group', 'Group', [['', 'Company A–Z'], ['none', 'No grouping']], group) + sel('sort', 'Sort', [['', 'Name A–Z'], ['attention', 'Needs attention first'], ['next', 'Next due date'], ['lifetime', 'Lifetime sales']], sort); })()}<input type="search" name="q" value="${esc(q)}" aria-label="Filter contacts or companies" placeholder="Filter contacts or companies"><noscript><button class="btn">Apply</button></noscript></form>${pick || q || show ? `<a class="btn" href="/customers">Clear Filter</a>` : ''}${q && cbMatches ? `<a class="btn" href="/customers/imported?q=${encodeURIComponent(q)}">Also in CoreBridge: ${cbMatches >= 50 ? '50+' : cbMatches} match${cbMatches === 1 ? '' : 'es'} →</a>` : ''}<span style="margin-left:auto;font-size:13px;color:var(--mute)">${list.length} of ${all.length} companies</span></div>
<section aria-label="Contact list" class="clist${group === 'none' ? ' flat' : ''}"><table><thead><tr style="text-align:left;color:var(--mute)"><th scope="col">Contact</th><th scope="col" style="text-align:center">Temperature · Step</th><th scope="col" style="text-align:center">Last Conversation</th><th scope="col">Next Step</th><th scope="col">Open Projects</th><th scope="col" style="text-align:right">Lifetime Sales</th></tr></thead>${groups || '<tbody><tr><td colspan="6" style="color:var(--mute);padding:16px 20px">No customers match.</td></tr></tbody>'}</table></section></div><style>${CCSS}</style>`;
  return page({ title: 'Customers', user, tab: 'Customers', body });
}

export function customerPage({ user, c, profile, tab = 'overview', flash = '', emailHtml = '', emailCount = 0, seqHtml = '', undo = '' }) {
  const pr = { ...defaultProfile(), ...profile };
  const counts = { projects: c.projects.length, contacts: new Set([...c.contacts, ...(pr.contactsExtra || []).map((x) => x.name)]).size, email: emailCount, activity: (pr.activity || []).length };
  const t = TABS.some(([k]) => k === tab) ? tab : 'overview';
  const tabs = TABS.map(([k, label]) => `<a href="/customers/${esc(c.id)}?tab=${k}" ${t === k ? 'aria-current="page"' : ''} style="padding:10px 12px;font-weight:600;border-bottom:3px solid ${t === k ? '#a8343f' : 'transparent'};color:${t === k ? '#1b2436' : '#5a6478'}">${label}${counts[k] != null ? badge(counts[k]) : ''}</a>`).join('');
  const ins = customerInsight(c);
  const prio = `<form method="post" action="/customers/${esc(c.id)}" style="display:inline"><input type="hidden" name="togglePrio" value="1"><button class="pill" style="border:0;cursor:pointer;background:${pr.strategic ? '#f6e8ea' : '#eef1f5'};color:${pr.strategic ? '#a8343f' : '#5a6478'}" title="Click to change">${pr.strategic ? '★ Strategic Priority' : '☆ Not a Strategic Priority'}</button></form>`;
  let main = '';
  if (t === 'overview') {
    main = `<section class="panel" style="background:#f3f0fa;border-color:#d9cff0;color:#4a3373"><h2 style="margin:0 0 6px;font-size:15px">✦ Insight</h2><p style="margin:0">${esc(ins.text)}</p>
<div style="display:flex;gap:8px;margin-top:10px;align-items:center"><a class="btn" href="/activities">${esc(ins.action)}</a><span style="margin-left:auto;font-size:12px">${(pr.insightVotes || []).length ? 'Thanks for the feedback.' : 'Helpful?'}</span><form method="post" action="/customers/${esc(c.id)}/vote" style="margin:0;display:flex;gap:6px"><button class="btn" name="v" value="up" aria-label="Helpful">👍</button><button class="btn" name="v" value="down" aria-label="Not helpful">👎</button></form></div></section>
${needsHtml(c.id, pr.needs || [])}<section class="panel"><h2 style="margin:0 0 10px;font-size:15px">Open Projects</h2>${c.projects.filter((p) => !['complete', 'lost'].includes(p.lane)).map((p) => `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eef1f5"><a href="/projects/${esc(p.id)}?mode=demo">${esc(p.name)}</a><span>${money(p.total)}</span></div>`).join('') || '<p style="color:var(--mute);margin:0">No open projects.</p>'}</section>`;
  } else if (t === 'projects') {
    const openPs = c.projects.filter((p) => !['complete', 'lost'].includes(p.lane));
    const pastPs = c.projects.filter((p) => p.lane === 'complete');
    const row = (p, past) => `<tr><td><a href="/projects/${esc(p.id)}?mode=demo">${esc(p.name)}</a>${p.orderId ? `<div style="font-size:12px;color:var(--mute)">Order ${esc(p.orderId)}</div>` : ''}</td><td>${esc(p.status || p.lane)}</td><td>${money(p.total)}</td>${past ? `<td style="text-align:right"><a class="btn" href="/projects/new?company=${encodeURIComponent(c.name)}&name=${encodeURIComponent('Reorder: ' + p.name)}" title="Starts a new project with the same name">Reorder</a></td>` : ''}</tr>`;
    main = `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px"><a class="btn primary" href="/projects/new?company=${encodeURIComponent(c.name)}">Start a Project</a><a class="btn" href="/activities?new=1">Schedule Site Walk</a></div><section class="panel" aria-label="Open projects"><h2 style="margin:0 0 8px;font-size:15px">Open Projects · ${openPs.length}</h2>${openPs.length ? `<table><thead><tr><th>Project</th><th>Stage</th><th>Total</th></tr></thead><tbody>${openPs.map((p) => row(p, false)).join('')}</tbody></table>` : '<p style="margin:0;color:var(--mute)">No open projects.</p>'}</section><section class="panel" aria-label="Past orders"><h2 style="margin:0 0 8px;font-size:15px">Past Orders · ${pastPs.length}</h2>${pastPs.length ? `<table><thead><tr><th>Order</th><th>Status</th><th>Total</th><th></th></tr></thead><tbody>${pastPs.map((p) => row(p, true)).join('')}</tbody></table>` : '<p style="margin:0;color:var(--mute)">No completed orders in SalesMax yet. Older orders are in the CoreBridge history.</p>'}</section>`;
  } else if (t === 'contacts') {
    main = contactsHtml(c.id, c.contacts, pr.contactsExtra || []);
  } else if (t === 'email') {
    main = emailHtml;
  } else if (t === 'activity') {
    const acts = (pr.activity || []).map((a) => `<li style="padding:8px 0;border-top:1px solid #eef1f5"><b>${esc(a.kind)}</b> · ${esc(a.date)} · <span style="color:var(--mute)">${esc(a.who || '')}</span><div>${esc(a.note)}</div></li>`).join('');
    main = `<section class="panel"><h2 style="margin:0 0 8px;font-size:15px">Log Activity</h2><form method="post" action="/customers/${esc(c.id)}/activity" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;align-items:end"><label style="display:flex;flex-direction:column;font-size:12px">Kind<select name="actKind" style="font:inherit;min-height:36px">${ACT_KINDS.map((k) => `<option>${k}</option>`).join('')}</select></label><label style="display:flex;flex-direction:column;font-size:12px">Date<input type="date" name="actDate" style="font:inherit;min-height:36px;border:1px solid #d5dbe5;border-radius:8px;padding:0 8px"></label><label style="display:flex;flex-direction:column;font-size:12px;grid-column:1/-1">What happened<textarea name="actNote" rows="2" required minlength="2" style="font:inherit;border:1px solid #d5dbe5;border-radius:8px;padding:6px 8px"></textarea></label><button class="btn primary">Log It</button></form></section>
${seqHtml}<section class="panel"><h2 style="margin:0 0 8px;font-size:15px">History</h2>${acts ? `<ul style="list-style:none;margin:0;padding:0">${acts}</ul>` : '<p style="margin:0;color:var(--mute)">No activity logged yet. Calls, emails and visits will show here.</p>'}</section>`;
  } else {
    const opt = (list, cur) => list.map((x) => `<option ${x === cur ? 'selected' : ''}>${esc(x)}</option>`).join('');
    const ship = Object.entries(CARRIERS).map(([k, label]) => `<tr><th scope="row">${label}</th><td><input name="${k}Carrier" aria-label="${label} carrier" value="${esc(pr.shipping?.[k]?.carrier)}" placeholder="UPS, FedEx…" style="font:inherit;width:100%;border:1px solid #d5dbe5;border-radius:6px;padding:6px"></td><td><input name="${k}Acct" aria-label="${label} account number" value="${esc(pr.shipping?.[k]?.acct)}" style="font:inherit;width:100%;border:1px solid #d5dbe5;border-radius:6px;padding:6px"></td></tr>`).join('');
    main = `<form method="post" action="/customers/${esc(c.id)}?tab=account"><section class="panel"><h2 style="margin:0 0 10px;font-size:15px">Classification</h2><div class="kv">
<div><label for="hl">Home location</label> ${info('Which FASTSIGNS location owns this customer.')}</div><div><select id="hl" name="homeLocation" style="font:inherit">${opt(LOCATIONS, pr.homeLocation)}</select></div>
<div><label for="st">Account status</label> ${info('Keep Warm and Dormant follow the Keep-Warm Rules in Admin (dormant after 180 days).')}</div><div><select id="st" name="status" style="font:inherit">${opt(STATUSES, pr.status)}</select></div>
<div><label for="mk">Marketing emails</label></div><div><input type="hidden" name="marketingSet" value="1"><input id="mk" type="checkbox" name="marketing" ${pr.marketing ? 'checked' : ''}> <span style="font-size:12px;color:var(--mute)">Off means Do Not Mail</span></div></div></section>
<section class="panel"><h2 style="margin:0 0 10px;font-size:15px">Notes for the Team</h2><input type="hidden" name="flagSet" value="1"><div style="display:flex;flex-direction:column;gap:10px"><label style="display:flex;flex-direction:column;gap:4px;font-size:13px;font-weight:600">⚑ Customer flag <span style="font-weight:400;color:var(--mute);font-size:12px">Shows on the customer, every project and the Design/Production cards. Example: Always call Dana before an install.</span><input name="flag" maxlength="200" value="${esc(pr.flag || '')}" style="font:inherit;min-height:36px;border:1px solid #d5dbe5;border-radius:8px;padding:0 8px"></label><label style="display:flex;flex-direction:column;gap:4px;font-size:13px;font-weight:600">Why this customer matters <span style="font-weight:400;color:var(--mute);font-size:12px">One line the whole team sees at the top of the customer page.</span><input name="why" maxlength="300" value="${esc(pr.why || '')}" style="font:inherit;min-height:36px;border:1px solid #d5dbe5;border-radius:8px;padding:0 8px"></label></div></section>
<section class="panel"><h2 style="margin:0 0 10px;font-size:15px">Shipping Accounts ${info('Bill shipping to the customer’s own carrier account. Used when an order ships.')}</h2><table><thead><tr><th>Type</th><th>Carrier</th><th>Account #</th></tr></thead><tbody>${ship}</tbody></table></section>
<section class="panel" aria-label="Terms, credit and tax"><h2 style="margin:0 0 10px;font-size:15px">Terms, Credit &amp; Tax</h2><input type="hidden" name="termsSet" value="1"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px">${[['terms', 'Terms', ['Due on receipt', 'Net 15', 'Net 30', 'Cash customer']], ['taxGroup', 'Tax group', ['Kentucky State Tax', 'Ohio State Tax', 'Indiana State Tax', 'Tax exempt']]].map(([k, l, opts]) => `<label style="display:flex;flex-direction:column;font-size:12px">${l}<select name="${k}" style="font:inherit;min-height:36px">${opts.map((o) => `<option ${(pr[k] || opts[0]) === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></label>`).join('')}<label style="display:flex;flex-direction:column;font-size:12px">Credit limit ($)<input name="creditLimit" type="number" min="0" step="100" value="${esc(pr.creditLimit ?? '')}" style="font:inherit;min-height:36px;border:1px solid #d5dbe5;border-radius:8px;padding:0 8px"></label><label style="display:flex;flex-direction:column;font-size:12px">Tax-exempt reason<input name="taxExemptReason" maxlength="60" value="${esc(pr.taxExemptReason || '')}" placeholder="Certificate on File" style="font:inherit;min-height:36px;border:1px solid #d5dbe5;border-radius:8px;padding:0 8px"></label></div><p style="margin:8px 0 0;font-size:12px;color:var(--mute)">Saved in SalesMax. CoreBridge keeps its own terms until the switch-over.</p></section>
<section class="panel" aria-label="Locations"><h2 style="margin:0 0 8px;font-size:15px">Locations</h2>${(pr.locations || []).length ? `<ul style="margin:0 0 8px;padding-left:18px">${pr.locations.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : '<p style="margin:0 0 8px;font-size:13px;color:var(--mute)">No extra ship-to or install addresses yet.</p>'}<label style="display:flex;flex-direction:column;font-size:12px">+ Add Location (one address per line)<textarea name="locations" rows="3" style="font:inherit;border:1px solid #d5dbe5;border-radius:8px;padding:8px">${esc((pr.locations || []).join('\n'))}</textarea></label></section>
<button class="btn primary">Save</button></form>`;
  }
  const lanes = c.projects.map((p) => p.lane);
  const temp = lanes.some((l) => ['progress', 'built'].includes(l)) ? ['Hot · Active Project', '#fbeaec', '#8f2a34'] : lanes.includes('estimate') ? ['Hot · Quoting', '#fbeaec', '#8f2a34'] : lanes.includes('prospect') ? ['Cold · New Prospect', '#e8f0fb', '#1d4f91'] : [pr.status === 'Dormant' ? 'Dormant' : 'Warm · Keep Warm', '#fdeedf', '#874511'];
  const lifetime = c.projects.reduce((a, p) => a + (Number(p.total) || 0), 0);
  const initials = String(c.name).split(/\s+/).filter((w) => /^[A-Za-z]/.test(w)).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  const people = [...new Set([...c.contacts, ...(pr.contactsExtra || []).map((x) => x.name)])];
  const extra = Object.fromEntries((pr.contactsExtra || []).map((x) => [x.name, x]));
  const peopleHtml = people.map((n, i) => { const x = extra[n] || {}; return `<div class="cp"><div><b>${esc(n)}</b> <span>${esc(x.role || (i === 0 ? 'Main contact' : ''))}</span></div>${x.email ? `<a href="mailto:${esc(x.email)}">${esc(x.email)}</a>` : ''}${x.phone ? `<div>${esc(x.phone)}</div>` : ''}</div>`; }).join('') || '<p style="margin:0;color:var(--mute);font-size:13px">No contacts yet.</p>';
  const facts = [['Home location', pr.homeLocation], ['Account status', pr.status], ['Salesperson', c.salesperson || ''], ['Marketing emails', pr.marketing ? 'On' : 'Do Not Mail'], ['Open projects', String(c.projects.filter((p) => !['complete', 'lost'].includes(p.lane)).length)]].filter(([, v]) => v);
  const tabs2 = TABS.map(([k2, label]) => `<a href="/customers/${esc(c.id)}?tab=${k2}" ${t === k2 ? 'aria-current="page"' : ''} class="${t === k2 ? 'on' : ''}">${label}${counts[k2] != null ? badge(counts[k2]) : ''}</a>`).join('');
  const RCSS = `.rw{max-width:1240px;margin:0 auto;padding:20px 32px 48px;display:flex;flex-direction:column;gap:20px}.rw .note{margin:0}
.crumb{font-size:13px;color:var(--mute)}.rhead{background:#fff;border:1px solid var(--line);border-radius:12px;padding:20px 24px;display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:20px}
.av2{width:52px;height:52px;border-radius:12px;background:var(--navy);color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;flex:0 0 52px}
.rhead h1{margin:0;font-size:24px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}.tpill{font-size:12px;font-weight:600;padding:3px 10px;border-radius:10px}.rsub{font-size:13px;color:var(--mute);margin-top:4px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.rstats{margin:0;display:grid;grid-template-columns:repeat(4,minmax(110px,auto));gap:28px}.rstats dt{font-size:12px;color:var(--mute)}.rstats dd{margin:2px 0 0;font-size:22px;font-weight:700}
.rcols{display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start}.raside{flex:1 1 280px;min-width:0;max-width:340px;display:flex;flex-direction:column;gap:16px}
.rcard{background:#fff;border:1px solid var(--line);border-radius:12px;padding:16px 18px;display:flex;flex-direction:column;gap:10px}.rcard h2{margin:0;font-size:14px}
.cp{display:flex;flex-direction:column;gap:2px;font-size:13px}.cp b{font-size:14px}.cp span{font-size:12px;color:var(--mute)}.fact{display:flex;justify-content:space-between;gap:12px;font-size:13px}.fact span:first-child{color:var(--mute)}.fact span:last-child{font-weight:500;text-align:right}
.ws{flex:999 1 560px;min-width:0;background:#fff;border:1px solid var(--line);border-radius:12px}.wtabs{display:flex;gap:4px;padding:0 16px;overflow-x:auto;border-bottom:1px solid var(--line)}
.wtabs a{font-size:14px;font-weight:500;color:var(--mute);padding:0 12px;min-height:48px;display:inline-flex;align-items:center;white-space:nowrap;border-bottom:3px solid transparent}.wtabs a.on{font-weight:700;color:var(--ink);border-bottom-color:#a8343f}.wtabs a:hover{text-decoration:none;color:var(--ink)}
.wbody{padding:16px 20px}.wbody .panel{border:0;border-bottom:1px solid #eef1f5;border-radius:0;padding:0 0 16px;margin:0 0 16px}.wbody .panel:last-child{border-bottom:0;margin-bottom:0}`;
  const body = `<div class="rw"><div class="crumb"><a href="/customers">Customers</a> <span aria-hidden="true">›</span> ${esc(c.name)}</div>${flash ? `<div class="note" style="background:#e6f2ec;color:#1f6a43;display:flex;gap:12px;align-items:center;flex-wrap:wrap">${esc(flash)}${undo ? undoBar(undo, `/customers/${c.id}?tab=${t}`) : ''}</div>` : ''}
<header class="rhead"><div style="display:flex;align-items:center;gap:16px"><div class="av2" aria-hidden="true">${esc(initials || '?')}</div><div><h1>${esc(c.name)} <span class="tpill" style="background:${temp[1]};color:${temp[2]}">${esc(temp[0])}</span></h1><div class="rsub">${esc(pr.homeLocation)}${c.salesperson ? ' · Owner: ' + esc(c.salesperson) : ''}${prio}</div></div></div>
<dl class="rstats"><div><dt>Open orders</dt><dd>${money(c.open)}</dd></div><div><dt>Lifetime</dt><dd>${money(lifetime)}</dd></div><div><dt>Projects</dt><dd>${c.projects.length}</dd></div><div><dt>Contacts</dt><dd>${counts.contacts}</dd></div></dl></header>
${pr.why || pr.flag ? `<div style="display:flex;flex-direction:column;gap:8px">${pr.why ? `<div style="display:flex;gap:10px;align-items:flex-start;background:#fff;border:1px solid var(--line);border-left:4px solid #1d4f91;border-radius:10px;padding:10px 14px;font-size:13px"><b style="white-space:nowrap">Why this customer matters</b><span style="color:#3d4658">${esc(pr.why)}</span></div>` : ''}${flagStrip(pr.flag, `/customers/${c.id}?tab=account`)}</div>` : ''}
<div class="rcols"><aside class="raside" aria-label="Customer details"><section class="rcard"><h2>People</h2>${peopleHtml}<a href="/customers/${esc(c.id)}?tab=contacts" style="font-size:13px;font-weight:600">+ Add Person</a></section>${priorityCard(c.id, pr)}<section class="rcard"><div style="display:flex;justify-content:space-between;align-items:center"><h2>Relationship</h2><a href="/customers/${esc(c.id)}?tab=account" style="font-size:13px">Edit</a></div>${facts.map(([k2, v]) => `<div class="fact"><span>${esc(k2)}</span><span>${esc(v)}</span></div>`).join('')}</section></aside>
<section class="ws" aria-label="Customer workspace"><nav class="wtabs" aria-label="Customer sections">${tabs2}</nav><div class="wbody">${main}</div></section></div></div><style>${RCSS}</style>`;
  return page({ title: c.name, user, tab: 'Customers', body });
}

// A finished task is also history on the customer's record.
export const KIND_TO_ACTIVITY = { call: 'Call', email: 'Email', quote: 'Note', proof: 'Note', task: 'Note' };
export function activityFromTask(profile, task, { who, at }) {
  const entry = { kind: KIND_TO_ACTIVITY[task.kind] || 'Note', note: `Done: ${task.title}`, date: at.slice(0, 10), who, at, fromTask: task.id };
  if (((profile && profile.activity) || []).some((a) => a.fromTask === task.id)) return profile;
  return { ...(profile || {}), activity: [entry, ...((profile && profile.activity) || [])].slice(0, 200), lastContact: [entry.date, profile?.lastContact || ''].sort().pop() };
}

// Read-only cleanup hints for the Customers list: same person under two companies, companies with no contact or salesperson.
export function cleanupSuggestions(customers = []) {
  const out = [];
  const byName = {};
  for (const c of customers) for (const n of c.contacts || []) { const k = String(n).trim().toLowerCase(); if (k) (byName[k] = byName[k] || []).push(c); }
  for (const [, cs] of Object.entries(byName)) if (cs.length > 1) out.push({ kind: 'Possible duplicate', title: `${cs[0].contacts.find((n) => String(n).toLowerCase() === String(cs[0].contacts.find((x) => cs.every((c) => (c.contacts || []).map((y) => String(y).toLowerCase()).includes(String(x).toLowerCase())))).toLowerCase()) || 'Same contact'} · ${cs.map((c) => c.name).join(' and ')}`, why: 'The same person is listed under more than one company.', href: `/customers/${cs[0].id}?tab=contacts` });
  for (const c of customers) if (!(c.contacts || []).length) out.push({ kind: 'Missing details', title: c.name, why: 'No contact on file, so nobody gets proofs or invoices.', href: `/customers/${c.id}?tab=contacts` });
  for (const c of customers) if (!c.salesperson) out.push({ kind: 'No owner', title: c.name, why: 'No salesperson assigned, so follow-ups land on no one.', href: `/customers/${c.id}?tab=account` });
  return out.slice(0, 6);
}

// Most recent logged activity or email for each customer (calls stay on the admin Calls tab for now).
export function lastConversations(customers, { profiles = [], mail = [] } = {}) {
  const out = {};
  customers.forEach((c, n) => {
    const acts = ((profiles[n] || {}).activity || []).map((a) => ({ at: String(a.date || a.at || ''), kind: String(a.kind || 'Note').toLowerCase() }));
    const ms = mail.filter((m) => String(m.customer || '').toLowerCase() === c.name.toLowerCase() && ['inbox', 'sent', 'archive'].includes(m.folder)).map((m) => ({ at: String(m.at || ''), kind: 'email' }));
    const best = [...acts, ...ms].filter((x) => x.at).sort((a, b) => b.at.localeCompare(a.at))[0];
    if (best) out[c.id] = best;
  });
  return out;
}
export function lastConvCell(x, today, id) {
  if (!x) return `<a href="/customers/${esc(id)}?tab=activity" style="color:#a8343f">None logged</a>`;
  const d = x.at.slice(0, 10);
  const days = Math.round((new Date(today + 'T12:00:00Z') - new Date(d + 'T12:00:00Z')) / 86400000);
  const when = days <= 0 ? 'Today' : days === 1 ? 'Yesterday' : days < 7 ? `${days} days ago` : new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  return `<a href="/customers/${esc(id)}?tab=activity" style="color:${days > 60 ? '#874511' : '#3d4658'}">${esc(when)}</a><div>${esc(x.kind)}</div>`;
}
