// Billing & Add-ons (for each licensee) and Help. In the test copy nothing is charged: add-on switches only
// change what this page shows, and there is no card, Stripe or invoice yet.
import { page, esc } from './views.mjs';

export const PLAN = { name: 'SalesMax Core', base: 199, included: 5, perExtra: 29 };
// [id, name, description, price/month, icon path, icon bg, icon fg]
export const ADDONS = [
  ['site', 'Site Visit', 'Phone site surveys by item with photos, measurements and voice notes; makes the Site Survey PDF in Drive.', 49, 'M4 8h3l2-3h6l2 3h3v11H4z', '#fbeaec', '#8f2a34'],
  ['cos', 'AI Chief of Staff', 'Focus now, smart due dates, tasks pulled from email, and keep-warm reasons to call.', 99, 'M12 2l2.2 6.6L21 11l-6.8 2.4L12 20l-2.2-6.6L3 11l6.8-2.4z', '#f1ebf8', '#5b3f8c'],
  ['calls', 'Call Tracking', 'Call logs, scorecards and call summaries through Clarity Voice.', 39, 'M5 4h4l2 5-3 2a11 11 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2', '#fdeedf', '#874511'],
  ['seq', 'Follow-Up Sequences', 'Automatic estimate follow-ups, proof reminders, pickup and past-due notices.', 49, 'M4 6h16M4 12h10M4 18h6', '#e8f0fb', '#1d4f91'],
  ['prio', 'Strategic Priority', 'Scores each customer and prospect High, Med or Low so the right work comes first.', 29, 'M3 20h18M6 16v-5M11 16V8M16 16v-9', '#fbeaec', '#8f2a34'],
  ['team', 'Team Dashboard', 'Team view for managers: what is slipping, who needs help, and how fast issues get fixed.', 39, 'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20a6 6 0 0 1 12 0M17 11a3 3 0 1 0 0-6M22 20a6 6 0 0 0-5-6', '#e6f2ec', '#1f6a43'],
  ['map', 'Prospecting Map', 'Customers and prospects on a map, with routes for field days.', 29, 'M9 4l-6 2v14l6-2 6 2 6-2V4l-6 2z', '#e6f2ec', '#1f6a43'],
  ['chat', 'Slack & Google Chat', 'DMs and @mentions in Activities next to email.', 19, 'M4 5h16v11H9l-5 4z', '#f1ebf8', '#5b3f8c'],
  ['multi', 'Multi-Location Owner', 'Switch between your locations from the top bar with one login.', 0, 'M3 21V8l9-5 9 5v13M9 21v-6h6v6', '#eef0f4', '#3d4658'],
];
export const DEFAULT_ADDONS = { site: 'active', cos: 'trial', calls: 'active', seq: 'active', prio: 'active', team: 'active', map: 'off', chat: 'off', multi: 'active' };

export const corePrice = (people) => PLAN.base + Math.max(0, people - PLAN.included) * PLAN.perExtra;
export function monthlyTotal(people, states = DEFAULT_ADDONS) {
  return corePrice(people) + ADDONS.filter(([id]) => (states[id] || 'off') === 'active').reduce((a, x) => a + x[3], 0);
}
const addDays = (ymd, n) => { const d = new Date(ymd + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export function trialLeft(started, today) {
  if (!started) return 30;
  const ms = Date.parse(addDays(started, 30) + 'T12:00:00Z') - Date.parse(today + 'T12:00:00Z');
  return Math.max(0, Math.round(ms / 864e5));
}
export function setAddon(saved = {}, f = {}, today) {
  const id = String(f.id || '');
  if (!ADDONS.some(([k]) => k === id)) throw new Error('pick an add-on');
  if (!['active', 'trial', 'off'].includes(f.to)) throw new Error('pick on, trial or off');
  if (id === 'multi' && f.to !== 'active') throw new Error('multi-location is included for owners');
  const states = { ...DEFAULT_ADDONS, ...(saved.states || {}) };
  const trials = { ...(saved.trials || {}) };
  states[id] = f.to;
  if (f.to === 'trial') trials[id] = today; else delete trials[id];
  return { states, trials };
}

export function billingPage({ user, people = 8, saved = {}, today = new Date().toISOString().slice(0, 10), location = 'Northern Kentucky', flash = '' }) {
  const states = { ...DEFAULT_ADDONS, ...(saved.states || {}) };
  const trials = saved.trials || {};
  const total = monthlyTotal(people, states);
  const activeN = Object.values(states).filter((v) => v === 'active').length;
  const trialN = Object.values(states).filter((v) => v === 'trial').length;
  const extra = Math.max(0, people - PLAN.included);
  const nextBill = (() => { const d = new Date(today + 'T12:00:00Z'); d.setUTCMonth(d.getUTCMonth() + 1, 1); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }); })();
  const tile = (l, v, h) => `<div style="background:#fff;border:1px solid #e3e7ee;border-radius:12px;padding:16px 18px;display:flex;flex-direction:column;gap:4px;min-width:0"><div style="font-size:13px;color:var(--mute);font-weight:500">${l}</div><div style="font-size:26px;font-weight:700">${v}</div><div style="font-size:12px;color:var(--mute)">${h}</div></div>`;
  const ST = { active: ['Active', '#e6f2ec', '#1f6a43', '#b9dcc8'], trial: ['Trial', '#fdf3dc', '#7a5600', '#e9cf8a'], off: ['Not added', '#eef0f4', '#5a6478', '#e3e7ee'] };
  const btn = (id, to, label, kind) => `<form method="post" action="/billing/addon" style="margin:0"><input type="hidden" name="id" value="${id}"><input type="hidden" name="to" value="${to}"><button class="btn${kind === 'primary' ? ' primary' : ''}" style="min-height:36px;font-size:13px${kind === 'dark' ? ';background:#16213a;color:#fff;border-color:#16213a' : ''}">${label}</button></form>`;
  const cards = ADDONS.map(([id, name, desc, price, icon, ibg, ifg]) => {
    const st = states[id] || 'off'; const [sl, sbg, sfg, border] = ST[st];
    const status = st === 'trial' ? `Trial · ${trialLeft(trials[id], today)} days left` : sl;
    const action = id === 'multi' ? '<span style="font-size:13px;font-weight:600;color:var(--mute)">Included</span>' : st === 'off' ? btn(id, 'trial', 'Start Free Trial', 'primary') : st === 'trial' ? `<span style="display:flex;gap:6px">${btn(id, 'active', 'Keep It', 'dark')}${btn(id, 'off', 'Turn Off', '')}</span>` : btn(id, 'off', 'Turn Off', '');
    return `<div style="background:#fff;border:1px solid ${border};border-radius:12px;padding:16px 18px;display:flex;flex-direction:column;gap:8px;min-width:0"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px"><span style="width:36px;height:36px;border-radius:10px;background:${ibg};color:${ifg};display:flex;align-items:center;justify-content:center"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${icon}"></path></svg></span><span style="font-size:11px;font-weight:700;padding:3px 9px;border-radius:10px;background:${sbg};color:${sfg}">${esc(status)}</span></div><h3 style="margin:0;font-size:15px">${esc(name)}</h3><p style="margin:0;font-size:13px;color:#3d4658;line-height:1.45;flex:1 1 auto">${esc(desc)}</p><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;border-top:1px solid #eef1f5;padding-top:10px"><span style="font-size:14px;font-weight:700">${price ? '$' + price : 'Free'}<span style="font-size:12px;font-weight:500;color:var(--mute)"> / month</span></span>${action}</div></div>`;
  }).join('');
  const css = '<style>.bl-t{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.bl-a{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.bl-2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px}@media(max-width:900px){.bl-t{grid-template-columns:repeat(2,minmax(0,1fr))}.bl-a{grid-template-columns:minmax(0,1fr)}.bl-2{grid-template-columns:minmax(0,1fr)}}</style>';
  const body = `${css}<div class="wrap" style="max-width:1080px;display:flex;flex-direction:column;gap:22px;padding-top:20px">
<div style="font-size:13px;color:var(--mute)"><a href="/admin" style="color:#1d4f91;text-decoration:none">Admin settings</a> <span aria-hidden="true">›</span> Billing &amp; add-ons</div>
<header style="display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:16px"><div><h1 style="margin:0;font-size:28px">Billing &amp; Add-Ons</h1><p style="margin:4px 0 0;color:var(--mute);font-size:14px">Each location has its own plan and bill. Only owners see this page.</p></div><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span class="pill" style="background:#fdf3dc;color:#7a4e00">Test copy · nothing is charged</span><span role="group" aria-label="Location" style="display:flex;background:#fff;border:1px solid #d5dbe5;border-radius:10px;padding:3px"><span aria-current="true" style="font-size:13px;font-weight:600;display:inline-flex;align-items:center;gap:8px;background:#16213a;color:#fff;border-radius:8px;padding:0 14px;min-height:38px"><span style="width:8px;height:8px;border-radius:4px;background:#4fb3c9"></span>${esc(location)}</span></span></div></header>
${flash ? `<div class="note" style="margin:0">${esc(flash)}</div>` : ''}
<section aria-label="This month" class="bl-t">${tile('This month', '$' + total.toLocaleString('en-US'), `Core + ${activeN} active add-on${activeN === 1 ? '' : 's'}`)}${tile('People', people, `${PLAN.included} included · ${extra} extra`)}${tile('Free trials running', trialN, trialN ? 'Decide before they end' : 'None right now')}${tile('Next bill', nextBill, 'Starts when SalesMax is licensed')}</section>
<section aria-labelledby="plan-h" style="background:#16213a;color:#fff;border-radius:12px;padding:20px 24px;display:flex;flex-wrap:wrap;gap:20px;align-items:center;justify-content:space-between"><div style="flex:1 1 420px"><div style="font-size:12px;font-weight:700;letter-spacing:1px;color:#f2b8bd">YOUR PLAN</div><h2 id="plan-h" style="margin:4px 0 6px;font-size:22px">${esc(PLAN.name)}</h2><div style="font-size:13px;color:#c9d1e0;line-height:1.5">Activities, Customers, Projects, Performance, built-in email, tasks, calendar and the CoreBridge connection. Includes ${PLAN.included} people; ${people} people now.</div></div><div style="text-align:right"><div style="font-size:26px;font-weight:700">$${corePrice(people)}<span style="font-size:13px;font-weight:500;color:#c9d1e0"> / month</span></div><div style="font-size:12px;color:#c9d1e0">$${PLAN.base} base + $${PLAN.perExtra} per extra person</div></div></section>
<section aria-labelledby="addons-h" style="display:flex;flex-direction:column;gap:12px"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap"><h2 id="addons-h" style="margin:0;font-size:18px">Add-Ons</h2><span style="font-size:13px;color:var(--mute)">Try any add-on free for 30 days. Turn it off any time; it stops at the end of the month.</span></div><div class="bl-a">${cards}</div></section>
<div class="bl-2"><section aria-labelledby="pay-h" style="background:#fff;border:1px solid #e3e7ee;border-radius:12px;padding:16px 20px;display:flex;flex-direction:column;gap:10px"><h2 id="pay-h" style="margin:0;font-size:16px">Payment</h2><div style="display:flex;justify-content:space-between;gap:12px;font-size:14px"><span style="color:var(--mute)">Card</span><span style="font-weight:600">None on file yet</span></div><div style="display:flex;justify-content:space-between;gap:12px;font-size:14px"><span style="color:var(--mute)">Next bill</span><span style="font-weight:600">When licensing starts</span></div><div style="display:flex;justify-content:space-between;gap:12px;font-size:14px"><span style="color:var(--mute)">Billing email</span><span style="font-weight:600">${esc(user && user.email ? user.email.replace(/^(.).*(@.*)$/, '$1•••$2') : 'Owner email')}</span></div><p style="margin:0;font-size:12px;color:var(--mute)">Card details will be entered on a secure Stripe page. SalesMax never stores card numbers.</p></section>
<section aria-labelledby="inv-h" style="background:#fff;border:1px solid #e3e7ee;border-radius:12px;padding:16px 20px;display:flex;flex-direction:column;gap:6px"><h2 id="inv-h" style="margin:0 0 4px;font-size:16px">Invoices</h2><div style="font-size:14px;color:var(--mute)">No invoices yet. They will list here each month with a PDF.</div></section></div>
<section aria-labelledby="newloc-h" style="background:#fff;border:1px dashed #b4bfd3;border-radius:12px;padding:16px 20px;display:flex;flex-wrap:wrap;gap:16px;align-items:center;justify-content:space-between"><div style="flex:1 1 480px"><h2 id="newloc-h" style="margin:0;font-size:16px">Add Another Location</h2><div style="font-size:13px;color:var(--mute);margin-top:4px">Gets its own separate data, team, settings and bill. Setup takes about 15 minutes: connect Google Workspace, add the CoreBridge key, choose the job-folder location in Drive, invite the team.</div></div><a class="btn primary" href="/feedback?kind=Question" style="min-height:44px">+ Add a Location</a></section>
</div>`;
  return page({ title: 'Billing & Add-ons', user, tab: '', body });
}

export const HELP = [
  ['Start Your Day', 'Open Activities. Work the To Do list from the top: Missing Next Step, then Past Due, then Due Today. Your scorecard fills in as you go.'],
  ['Add a Project or Prospect', 'Use + New at the top. A prospect and a project are the same record; it just moves forward through the stages.'],
  ['Move Work Along', 'On the Design, Production, Permits and Purchasing boards, drag a card to the next column or use its Move menu.'],
  ['Send a Proof', 'Open the item, add the proof as a Google Drive link, then Send Proof. The customer approves on their order page.'],
  ['When the Customer Says Yes', 'On the project, use Customer Said Yes? to record the deposit, PO or terms. The project moves to In production.'],
  ['Change How SalesMax Works', 'Admin Settings has six tabs. The Workflow Builder keeps changes as a draft until you publish.'],
];
export function helpPage({ user }) {
  const body = `<div class="wrap" style="max-width:760px"><div class="bar" style="padding:14px 0"><h1>Help</h1></div>${HELP.map(([h, t]) => `<section class="panel"><h2 style="margin:0 0 6px;font-size:15px">${esc(h)}</h2><p style="margin:0">${esc(t)}</p></section>`).join('')}<p style="font-size:13px">Still stuck? <a href="/feedback">Send Feedback</a> and the team will help.</p></div>`;
  return page({ title: 'Help', user, tab: '', body });
}
