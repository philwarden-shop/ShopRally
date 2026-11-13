import { emailRow, undoBar } from './mailtodo.mjs';
// Activities page: To Do groups, inbox chips and Today's Scorecard (sales).
// Source of truth for scorecard numbers is SalesMax itself (task log + stage history), never the CoreBridge sync.
import { page, esc, infoTip } from './views.mjs';
import { sampleData } from './data.mjs';

export const DAY = 86400000;
export const iso = (d) => new Date(d).toISOString().slice(0, 10);
const addDays = (today, n) => iso(new Date(today + 'T12:00:00Z').getTime() + n * DAY);
const nice = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

// Inbox chips: Main keeps colored chips by design decision (exception to the dropdown rule).
export const KINDS = [
  { key: 'email', label: 'Emails', bg: '#e8f0fb', fg: '#1d4f91' },
  { key: 'proof', label: 'Proofs', bg: '#f3f0fa', fg: '#4a3373' },
  { key: 'quote', label: 'Quote Requests', bg: '#fdf3dc', fg: '#7a4e00' },
  { key: 'call', label: 'Calls', bg: '#e6f2ec', fg: '#1f6a43' },
  { key: 'task', label: 'Tasks', bg: '#eef1f5', fg: '#3d4658' },
];

export const GROUPS = [
  { key: 'missing', label: 'Missing Next Step', tone: '#7a4e00' },
  { key: 'past', label: 'Past Due', tone: '#a8343f' },
  { key: 'today', label: 'Due Today', tone: '#1d4f91' },
  { key: 'soon', label: 'Due Soon', tone: '#3d4658' },
  { key: 'later', label: 'Due Later', tone: '#5a6478' },
];

export function demoTasks(today) {
  if (!sampleData()) return [];
  const t = (id, kind, title, customer, projectId, offset, extra = {}) => ({ id, kind, title, customer, projectId, due: addDays(today, offset), done: false, ...extra });
  return [
    t('t1', 'email', 'Answer the question about wayfinding post mounting', 'Kenton County Library', 'demo-10', -2),
    t('t2', 'quote', 'Price the event banner quote request', 'Kenton County Library', 'demo-3', -1),
    t('t3', 'proof', 'Check the wall graphic proof before it goes out', 'Hartwell Builders', 'demo-11', 0),
    t('t4', 'call', 'Call about install access on Friday', 'Florence Realty Group', 'demo-12', 0),
    t('t5', 'email', 'Send the deposit link', 'Oakline Café', 'demo-4', 0),
    t('t6', 'task', 'Measure the 3 vans', 'Northside HVAC', 'demo-5', 2),
    t('t7', 'quote', 'Send the office signage estimate after the site visit', 'Riverbend Dental', 'demo-1', 4),
    t('t8', 'call', 'Check in before the grand opening', 'Florence Fitness', 'demo-7', 12),
  ];
}

// Projects that are open (not complete/lost) and have no open task are "Missing a next step".
export function missingNextStep(projects, tasks) {
  const open = new Set(tasks.filter((t) => !t.done && t.projectId).map((t) => t.projectId));
  return projects
    .filter((p) => !['complete', 'lost'].includes(p.lane) && !open.has(p.id) && !p.onBoard)
    .map((p) => ({ id: `ns-${p.id}`, kind: 'task', title: 'Add a next step', customer: p.company, projectId: p.id, projectName: p.name, missing: true }));
}

export function groupTodos(tasks, today, { projects = [], filter = '' } = {}) {
  const soonEnd = addDays(today, 7);
  const keep = (t) => !filter || t.kind === filter;
  const open = tasks.filter((t) => !t.done);
  const out = { missing: missingNextStep(projects, tasks).filter(keep), past: [], today: [], soon: [], later: [] };
  for (const t of open.filter(keep)) {
    if (t.due < today) out.past.push(t);
    else if (t.due === today) out.today.push(t);
    else if (t.due <= soonEnd) out.soon.push(t);
    else out.later.push(t);
  }
  for (const k of ['past', 'today', 'soon', 'later']) out[k].sort((a, b) => a.due.localeCompare(b.due) || a.title.localeCompare(b.title));
  return out;
}

export function chipCounts(tasks) {
  const open = tasks.filter((t) => !t.done);
  return KINDS.map((k) => ({ ...k, count: open.filter((t) => t.kind === k.key).length }));
}

// Orders Moved Forward = distinct items moved to a later step today, from SalesMax stage history only.
export function scorecard({ tasks, log = [], today, person, goals = {} }) {
  const doneToday = tasks.filter((t) => t.done && String(t.doneAt || '').startsWith(today));
  const mine = (by) => !person || String(by || '').toLowerCase().startsWith(person);
  const moved = new Set(log.filter((l) => String(l.at || '').startsWith(today) && l.forward !== false && !String(l.to || '').startsWith('hold') && mine(l.by)).map((l) => l.itemId || l.item || l.id));
  return [
    { key: 'tasks', label: 'Tasks Done', value: doneToday.length, goal: goals.goalTasks ?? 8 },
    { key: 'emails', label: 'Emails Answered', value: doneToday.filter((t) => t.kind === 'email').length, goal: 10 },
    { key: 'customers', label: 'Customers Engaged', value: new Set(doneToday.map((t) => t.customer)).size, goal: 6 },
    { key: 'quotes', label: 'Quotes Sent', value: doneToday.filter((t) => t.kind === 'quote').length, goal: goals.goalQuotes ?? 3 },
    { key: 'orders', label: 'Orders Moved Forward', value: moved.size, goal: goals.goalOrders ?? 4 },
  ];
}

const addInterval = (ymd, n, unit) => { const d = new Date(ymd + 'T12:00:00Z'); if (unit === 'months') d.setUTCMonth(d.getUTCMonth() + n); else d.setUTCDate(d.getUTCDate() + n * (unit === 'weeks' ? 7 : 1)); return d.toISOString().slice(0, 10); };
// Repeating tasks: finishing one adds the next (counted from the day it was done or the original due date) until the stop rule.
export function nextRepeat(t, at) {
  const r = t.repeat; if (!r) return null;
  if (r.stop === 'after' && (r.left ?? 0) <= 1) return null;
  const from = r.from === 'due' ? t.due : String(at).slice(0, 10);
  const due = addInterval(from, r.every, r.unit);
  if (r.stop === 'date' && r.until && due > r.until) return null;
  return { ...t, id: t.id.replace(/-r\d+$/, '') + '-r' + Date.now().toString(36).slice(-4) + Math.floor(Math.random() * 90 + 10), due, done: false, doneAt: undefined, repeat: { ...r, left: r.stop === 'after' ? (r.left ?? 1) - 1 : r.left } };
}
export function completeTask(tasks, id, at) {
  const t = tasks.find((x) => x.id === id);
  if (!t) throw new Error('that task is not here');
  if (t.done) return tasks;
  const next = nextRepeat(t, at);
  return [...tasks.map((x) => (x.id === id ? { ...x, done: true, doneAt: at } : x)), ...(next ? [next] : [])];
}
export function readRepeat(f) {
  const every = Number(f.repeatEvery);
  if (!f.repeatOn || !(every >= 1)) return null;
  if (every > 365) throw new Error('repeat every 365 or fewer');
  const unit = ['days', 'weeks', 'months'].includes(f.repeatUnit) ? f.repeatUnit : 'weeks';
  const stop = ['never', 'after', 'date'].includes(f.repeatStop) ? f.repeatStop : 'never';
  const r = { every: Math.round(every), unit, from: f.repeatFrom === 'due' ? 'due' : 'done', stop };
  if (stop === 'after') { const n = Number(f.repeatTimes); if (!(n >= 1 && n <= 100)) throw new Error('stop after 1 to 100 times'); r.left = Math.round(n); }
  if (stop === 'date') { if (!/^\d{4}-\d{2}-\d{2}$/.test(String(f.repeatUntil || ''))) throw new Error('pick the stop date'); r.until = f.repeatUntil; }
  return r;
}


export function addTask(tasks, f, { customer = '', id = 'n' + Date.now().toString(36) } = {}) {
  const title = String(f.title || '').trim();
  if (title.length < 2) throw new Error('give the task a title');
  if (!KINDS.some((k) => k.key === f.kind)) throw new Error('pick a kind of task');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(f.due || ''))) throw new Error('pick a due date');
  const repeat = readRepeat(f);
  const notes = String(f.notes || '').trim().slice(0, 1000);
  return [...tasks, { id, kind: f.kind, title: title.slice(0, 140), customer, projectId: String(f.projectId || ''), due: f.due, done: false, ...(notes ? { notes } : {}), ...(repeat ? { repeat } : {}) }];
}

function taskForm(projects, today, nt, team = [], me = '') {
  const open = projects.filter((p) => !['complete', 'lost'].includes(p.lane));
  return `<details ${nt ? 'open' : ''} style="margin-bottom:8px"><summary class="btn" style="display:inline-flex">+ New Task</summary>
<form method="post" action="/activities/tasks/new" class="panel" style="margin-top:8px;display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;align-items:end">
<label style="display:flex;flex-direction:column;font-size:12px;grid-column:1/-1">What needs doing<input name="title" required minlength="2" maxlength="140" style="font:inherit;min-height:36px;border:1px solid #d5dbe5;border-radius:8px;padding:0 8px"></label>
<fieldset style="grid-column:1/-1;border:0;margin:0;padding:0"><legend style="font-size:12px;margin-bottom:4px">Type</legend><div class="tseg">${KINDS.map((k, n) => `<label><input type="radio" name="kind" value="${k.key}" ${n === 0 ? 'checked' : ''}><span>${esc(k.label.replace(/s$/, ''))}</span></label>`).join('')}</div></fieldset><style>.tseg{display:flex;gap:6px;flex-wrap:wrap}.tseg label{position:relative}.tseg input{position:absolute;opacity:0;width:1px;height:1px}.tseg span{display:inline-flex;align-items:center;min-height:34px;padding:0 14px;border:1px solid #d5dbe5;border-radius:17px;font-size:13px;font-weight:600;cursor:pointer;background:#fff}.tseg input:checked+span{background:#fbeaec;border-color:#a8343f;color:#8f2a34}.tseg input:focus-visible+span{outline:2px solid #1d4f91;outline-offset:2px}</style>
<label style="display:flex;flex-direction:column;font-size:12px">Due<input type="date" name="due" value="${esc(today)}" style="font:inherit;min-height:36px;border:1px solid #d5dbe5;border-radius:8px;padding:0 8px"></label>
<label style="display:flex;flex-direction:column;font-size:12px">Project<select name="projectId" style="font:inherit;min-height:36px"><option value="">None</option>${open.map((p) => `<option value="${esc(p.id)}" ${nt && nt.projectId === p.id ? 'selected' : ''}>${esc(p.name)} · ${esc(p.company)}</option>`).join('')}</select></label>
${team.length ? `<label style="display:flex;flex-direction:column;font-size:12px">For<select name="assignee" style="font:inherit;min-height:36px">${team.map((m) => `<option value="${esc(m.key)}" ${m.key === me ? 'selected' : ''}>${esc(m.key === me ? 'Me' : m.name)}</option>`).join('')}</select></label>` : ''}<label style="display:flex;flex-direction:column;font-size:12px;grid-column:1/-1">Notes<textarea name="notes" rows="2" style="font:inherit;border:1px solid #d5dbe5;border-radius:8px;padding:6px 8px"></textarea></label>
<fieldset style="grid-column:1/-1;border:1px solid #e3e7ee;border-radius:10px;padding:8px 10px;margin:0;display:flex;gap:10px;flex-wrap:wrap;align-items:center;font-size:12px"><legend style="font-size:12px;font-weight:700;padding:0 4px">Repeat</legend><label style="display:flex;align-items:center;gap:6px"><input type="checkbox" name="repeatOn" value="1"> Every</label><input name="repeatEvery" type="number" min="1" max="365" value="1" aria-label="Repeat every" style="font:inherit;width:60px;min-height:32px;border:1px solid #d5dbe5;border-radius:6px;padding:0 6px"><select name="repeatUnit" aria-label="Repeat unit" style="font:inherit;min-height:32px"><option value="days">days</option><option value="weeks" selected>weeks</option><option value="months">months</option></select><label style="display:flex;align-items:center;gap:6px">Count from<select name="repeatFrom" style="font:inherit;min-height:32px"><option value="done">The day I mark it done</option><option value="due">The original due date</option></select></label><label style="display:flex;align-items:center;gap:6px">Stop<select name="repeatStop" style="font:inherit;min-height:32px"><option value="never">Never</option><option value="after">After</option><option value="date">On a date</option></select></label><input name="repeatTimes" type="number" min="1" max="100" placeholder="times" aria-label="Stop after how many times" style="font:inherit;width:70px;min-height:32px;border:1px solid #d5dbe5;border-radius:6px;padding:0 6px"><input name="repeatUntil" type="date" aria-label="Stop on date" style="font:inherit;min-height:32px;border:1px solid #d5dbe5;border-radius:6px;padding:0 6px"></fieldset><button class="btn primary">Add Task</button></form></details>`;
}

// Hand-off tasks appear by themselves once every item on a project is built.
export const HANDOFF_TASK = { Install: 'Confirm the install date with the customer', Ship: 'Book shipping (XPS, or ATS for LTL freight)', Pickup: 'Send the ready-for-pickup email', Deliver: 'Schedule the delivery' };
export function autoHandoffTasks(items, projects, today) {
  const byP = {};
  for (const i of items) (byP[i.projectId] = byP[i.projectId] || []).push(i);
  const out = [];
  for (const [pid, its] of Object.entries(byP)) {
    if (!its.every((i) => ['built', 'done'].includes(i.step)) || its.every((i) => i.step === 'done')) continue;
    const dest = (its.find((i) => i.handoff) || {}).handoff || 'Pickup';
    const p = projects.find((x) => x.id === pid) || {};
    out.push({ id: `auto-${pid}`, kind: 'task', title: HANDOFF_TASK[dest] || HANDOFF_TASK.Pickup, customer: p.company || '', projectId: pid, due: today, done: false, auto: true });
  }
  return out;
}
export function mergeAuto(tasks, autos) {
  const have = new Set(tasks.map((t) => t.id));
  return [...tasks, ...autos.filter((a) => !have.has(a.id))];
}

export function snoozeTask(tasks, id, days, today) {
  const n = Number(days);
  if (![1, 3, 7].includes(n)) throw new Error('snooze for 1, 3 or 7 days');
  const t = tasks.find((x) => x.id === id);
  if (!t) throw new Error('that task is not here');
  const base = t.due > today ? t.due : today;
  const due = new Date(new Date(base + 'T12:00:00Z').getTime() + n * DAY).toISOString().slice(0, 10);
  return tasks.map((x) => (x.id === id ? { ...x, due, snoozed: (x.snoozed || 0) + 1 } : x));
}

const CSS = `
.aw{max-width:1320px;margin:0 auto;padding:20px 24px 40px;display:flex;flex-direction:column;gap:20px}.aw>.note{margin:0}
.vh{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.date{margin:0;color:#3d4658;font-size:14px}
.sch{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:-6px}.sch h2{margin:0;font-size:16px}.sch span{font-size:12px;color:var(--mute);display:inline-flex;gap:8px;align-items:center}
.prev{font-size:11px;font-weight:600;color:#5b3f8c;background:#f3f0fa;border-radius:10px;padding:2px 8px}.prev:hover{text-decoration:none}
.score{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px}
.tile{background:#fff;border:1px solid var(--line);border-radius:12px;padding:18px 20px;display:flex;flex-direction:column;gap:6px;min-width:0}.tile .l{font-size:13px;color:var(--mute);font-weight:500}.tile .v{font-size:30px;font-weight:700;line-height:1.1}.tile .h{font-size:12px;color:var(--mute)}
.meter{height:6px;background:#eef1f5;border-radius:3px;overflow:hidden}.meter i{display:block;height:6px;background:#1f6a43}
.focus{background:var(--navy);color:#fff;border-radius:12px;padding:20px 24px;display:flex;flex-direction:column;gap:14px}.focus h2{margin:0;font-size:16px}.focus .u{font-size:12px;color:#b9c3d6}
.focus ol{margin:0;padding:0;list-style:none;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}@media (max-width:900px){.focus ol{grid-template-columns:1fr}}
.focus li{background:#24324f;border-radius:10px;padding:14px 16px;display:flex;flex-direction:column;gap:6px;min-width:0}.focus .r{font-size:12px;color:#f2b8bd;font-weight:600}.focus a{color:#fff;font-size:15px;font-weight:600}.focus .w{font-size:13px;color:#c9d1e0}
.act{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:20px;align-items:start}
@media (max-width:900px){.act{grid-template-columns:1fr}}
.todo{background:#fff;border:1px solid var(--line);border-radius:12px;overflow:hidden}
.tt{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.tt h2{margin:0;font-size:16px}
.todo .hd{display:flex;flex-direction:column;gap:10px;padding:14px 20px 12px;border-bottom:1px solid var(--line)}
.chips{display:flex;gap:6px;flex-wrap:wrap;margin-left:auto;justify-content:flex-end;align-items:center}.chip{font-size:12px;font-weight:600;border-radius:14px;padding:0 12px;min-height:30px;display:inline-flex;align-items:center;gap:6px;border:1px solid transparent}
.chip::before{content:'';width:8px;height:8px;border-radius:4px;background:currentColor;opacity:.85}.chip.nodot::before{display:none}
.chip.on{background:var(--navy)!important;color:#fff!important}.chip:hover{text-decoration:none}
.grp{display:flex;align-items:center;gap:8px;padding:0 20px 0 18px;min-height:38px;background:#f8f9fb;border-bottom:1px solid #eef1f5;font-size:13px;font-weight:700}
.grp::before{content:'';width:8px;height:8px;border-radius:4px;background:currentColor}.grp .n{font-size:12px;font-weight:500;color:var(--mute)}
.task{display:flex;gap:10px;align-items:center;padding:10px 20px 10px 12px;border-bottom:1px solid #eef1f5;background:#fff}
.task .k{font-size:11px;font-weight:700;border-radius:10px;padding:3px 9px;white-space:nowrap;order:5}.task .t{flex:1 1 auto;min-width:0}.task .t b{font-size:14px;font-weight:600;color:var(--ink)}.task .t small{display:block;color:#1d4f91;font-size:12px;font-weight:500;margin-top:2px}
.task .due{order:6;flex:0 0 72px;text-align:right;font-size:13px;font-weight:600}
.task form{margin:0}.task .ck{width:36px;height:36px;flex:0 0 36px;display:flex;align-items:center;justify-content:center;background:transparent;border:0;cursor:pointer;padding:0}
.task .ck span{width:18px;height:18px;border:2px solid #9aa6bd;border-radius:4px;display:block}.task .ck:hover span{border-color:var(--red)}
.task .sz{order:7}.task .sz select{font:inherit;font-size:12px;min-height:32px;border:1px solid #d5dbe5;border-radius:8px 0 0 8px}.task .sz .btn{min-height:32px;border-radius:0 8px 8px 0;border-left:0}
.empty{font-size:12px;color:var(--mute);padding:10px 20px;border-bottom:1px solid #eef1f5}
.newt{padding:10px 20px;border-bottom:1px solid #eef1f5}
aside .panel{padding:0;overflow:hidden}aside .panel>h2{margin:0!important;padding:14px 18px;border-bottom:1px solid var(--line);font-size:16px!important}aside .panel>ul,aside .panel>p,aside .panel>div{padding:10px 18px}
.party{position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:50}.party i{position:absolute;top:-12px;width:8px;height:14px;border-radius:2px;animation:fall 2.6s ease-in forwards}
@keyframes fall{to{transform:translateY(105vh) rotate(540deg);opacity:.2}}
@media (prefers-reduced-motion:reduce){.party{display:none}}
`;

function confetti() {
  const colors = ['#a8343f', '#1d4f91', '#f2b84b', '#1f6a43', '#4a3373', '#4fb3c9'];
  let s = '';
  for (let n = 0; n < 60; n++) s += `<i style="left:${(n * 37) % 100}%;background:${colors[n % colors.length]};animation-delay:${((n * 53) % 90) / 100}s"></i>`;
  return `<div class="party" aria-hidden="true">${s}</div>`;
}

export function activitiesPage({ user, tasks, projects = [], log = [], today, filter = '', isSales = true, party = false, flash = '', side = '', goals = {}, celebrations = true, newTask = null, team = [], me = '', emailBar = '', coord = '', waiting = [], undo = '', cal = 'day' }) {
  const kinds = Object.fromEntries(KINDS.map((k) => [k.key, k]));
  const f = kinds[filter] ? filter : '';
  const g = groupTodos(tasks, today, { projects, filter: f });
  const chips = todoChips(chipCounts(tasks), f, tasks.filter((t) => !t.done).length);
  const projName = Object.fromEntries(projects.map((p) => [p.id, p.name]));
  const row = (t) => {
    const k = kinds[t.kind] || kinds.task;
    const when = t.missing ? 'No open task' : (t.due < today ? `Was due ${nice(t.due)}` : t.due === today ? 'Today' : nice(t.due));
    const cslug = String(t.customer || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (t.mail && t.view) return emailRow(t, { today });
    if (t.seq) return `<div class="task" style="flex-wrap:wrap"><span class="k" style="background:#e6f2ec;color:#1f6a43">Sequence</span><span class="t"><a href="/projects/${esc(t.projectId)}?mode=demo"><b>${esc(t.title)}</b></a><small>${esc(t.seqName)} · ${esc(t.customer)} · ${t.stepKind === 'email' ? 'Email ready to review and send' : 'Task'}</small>${t.stepKind === 'email' ? `<details style="margin-top:4px"><summary style="cursor:pointer;font-size:12px;font-weight:700">Preview Email</summary><div style="white-space:pre-line;font-size:13px;border-left:3px solid #e3e7ee;padding:6px 10px;margin-top:4px">${esc(t.body)}</div></details>` : ''}</span><span style="display:flex;gap:6px;flex-wrap:wrap">${t.stepKind === 'email' ? `<a class="btn" href="/customers/${esc(String(t.customer || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))}?tab=email#compose">Open Email</a>` : ''}<form method="post" action="/sequences/done" style="margin:0"><input type="hidden" name="key" value="${esc(t.seqKey)}"><input type="hidden" name="n" value="${esc(t.seqStep)}"><button class="btn">${t.stepKind === 'email' ? 'Mark Sent' : 'Done'}</button></form></span></div>`;
    if (t.mail) {
      const f = (to, label) => `<form method="post" action="/email/${esc(t.mailId)}/${to}" style="margin:0"><input type="hidden" name="back" value="/activities"><button class="btn">${label}</button></form>`;
      return `<div class="task" style="flex-wrap:wrap"><span class="k" style="background:${k.bg};color:${k.fg}">Email</span><span class="t"><a href="/customers/${esc(cslug)}?tab=email"><b>${esc(t.title)}</b></a><small>${esc(t.customer)} · ${esc(t.due === today ? 'Today' : nice(t.due))}</small></span><span style="display:flex;gap:6px;flex-wrap:wrap"><a class="btn" href="/customers/${esc(cslug)}?tab=email&reply=${esc(t.mailId)}#compose">Reply</a><a class="btn" href="/customers/${esc(cslug)}?tab=email&fwd=${esc(t.mailId)}#compose">Forward</a>${f('archive', 'Archive')}${f('spam', 'Mark as Spam')}</span></div>`;
    }
    return todoRow(t, { today, projName });
  };
  const groupsData = GROUPS.map((gr) => ({ key: gr.key, label: gr.label, count: g[gr.key].length, open: ['missing', 'past', 'today'].includes(gr.key) || !!f, html: g[gr.key].map(row).join('') }));
  const openAll = [...g.past, ...g.today].filter((t) => !t.mail);
  const focusList = openAll.slice(0, 3).map((t) => ({ title: t.title, why: `${t.customer || ''}${t.customer ? ' \u00b7 ' : ''}${t.due < today ? 'past due ' + nice(t.due) : 'due today'}`, href: t.projectId ? `/projects/${t.projectId}?mode=demo` : '/activities' }));
  const sc = scorecard({ tasks, log, today, goals });
  const tiles = sc.map((s) => `<div class="tile"><span class="l">${esc(s.label)}</span><span class="v" style="color:${s.value >= s.goal ? '#1f6a43' : 'var(--ink)'}">${s.value}</span><div class="meter" aria-hidden="true"><i style="width:${Math.min(100, Math.round((s.value / s.goal) * 100))}%"></i></div><span class="h">Goal ${s.goal}</span></div>`).join('');
  const hit = sc.every((s) => s.value >= s.goal);
  const dateTxt0 = new Date(today + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });
  const top = actTop({ dateTxt: dateTxt0, sc, tasks, today, celebrations, f, focus: isSales ? focusList : [], tipHtml: infoTip('Everything you need to do to grow your book of business: tasks, emails, calls and messages in one list.', 'About Activities') });
  const scoreHtml = isSales ? top.score : '';
  const focusHtml = top.focusHtml;
  const waitHtml = isSales ? `<section class="panel" aria-label="Waiting on customers"><h2>Waiting on Customers</h2>${waiting.length ? `<ul style="list-style:none;margin:0;padding:0">${waiting.map((w) => `<li style="padding:6px 0;border-top:1px solid #eef1f5;font-size:13px"><b>${esc(w.title)}</b><small style="display:block;color:var(--mute)">${esc(w.customer)} · sent ${esc(nice(w.due))}</small></li>`).join('')}</ul>` : '<p style="margin:0;font-size:13px;color:var(--mute)">No one owes you a reply.</p>'}</section>` : '';
  const dateTxt = new Date(today + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });
  const body = `<div class="aw">${top.head}${flash ? `<div class="note" style="background:#e6f2ec;color:#1f6a43;display:flex;gap:12px;align-items:center;flex-wrap:wrap">${esc(flash)}${undo ? undoBar(undo, '/activities') : ''}</div>` : ''}
${hit && isSales && celebrations ? '<div class="note" style="background:#e6f2ec;color:#1f6a43;font-weight:700">Every goal hit today. 🎉</div>' : ''}${scoreHtml}${coord ? coord.replace('margin:0 0 14px', 'margin:0') : ''}${focusHtml}
<div class="act">${todoPanel({ chipsHtml: chips, emailBar, newTaskHtml: `<div class="newt">${taskForm(projects, today, newTask, team, me).replace('style="margin-bottom:8px"', '')}</div>`, groups: groupsData })}
<aside style="display:flex;flex-direction:column;gap:22px;min-width:0">${isSales ? calPanel({ today, cal, tasks, isSales, nowHour: (() => { const p = new Date().toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: 'numeric', hour12: false }).split(':'); return Number(p[0]) + Number(p[1]) / 60; })() }) + waitCard(waiting, today) : ''}${side}</aside></div></div>${party ? confetti() : ''}<style>${CSS}</style>`;
  return page({ title: 'Activities', user, tab: 'Activities', body, badges: { Activities: tasks.filter((t) => !t.done).length } });
}

// Ported from Main.dc.html (date line, Today's Scorecard, Focus Now). Inline styles copied from the mockup.
function actTop({ dateTxt, sc, tasks = [], today, celebrations = true, f = '', focus = [], tipHtml = '' }) {
  const done = tasks.filter((t) => t.done && String(t.doneAt || '').startsWith(today));
  const wk = new Date(new Date(today + 'T12:00:00Z').getTime() - 6 * 864e5).toISOString().slice(0, 10);
  const doneWk = tasks.filter((t) => t.done && String(t.doneAt || '').slice(0, 10) >= wk);
  const n = (k) => done.filter((t) => t.kind === k).length;
  const plural = (c, w) => `${c} ${w}${c === 1 ? '' : 's'}`;
  const qc = [...new Set(done.filter((t) => t.kind === 'quote').map((t) => t.customer).filter(Boolean))];
  const HINT = {
    tasks: (s) => `Goal ${s.goal}`,
    emails: (s) => `Goal ${s.goal}`,
    customers: () => [n('call') ? plural(n('call'), 'call') : '', n('email') ? plural(n('email'), 'email') : '', n('visit') ? plural(n('visit'), 'visit') : ''].filter(Boolean).join(' · ') || 'Nobody yet today',
    quotes: () => (qc.length ? qc.slice(0, 2).join(', ') + (qc.length > 2 ? ` +${qc.length - 2}` : '') : 'None sent yet today'),
    orders: (s) => `Goal ${s.goal}`,
  };
  const COLOR = { tasks: '#1f6a43', emails: '#1d4f91', customers: '#5b3f8c', quotes: '#874511', orders: '#1f6a43' };
  const tiles = sc.map((s) => `<div style="background:#ffffff;border:1px solid #e3e7ee;border-radius:12px;padding:18px 20px;display:flex;flex-direction:column;gap:6px;min-width:0"><div style="font-size:13px;color:#5a6478;font-weight:500">${esc(s.label)}</div><div style="font-size:30px;font-weight:700;color:${COLOR[s.key] || '#1b2436'}">${esc(s.value)}</div><div style="font-size:12px;color:#5a6478">${esc((HINT[s.key] || (() => ''))(s))}</div></div>`).join('');
  const week = `This week: ${plural(doneWk.length, 'task')} · ${plural(doneWk.filter((t) => t.kind === 'quote').length, 'quote')}`;
  const head = `<header style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px"><div><h1 style="position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap">Activities</h1><div style="display:flex;align-items:center;gap:4px"><p style="margin:0;color:#3d4658;font-size:14px">${esc(dateTxt)}</p>${tipHtml}</div></div></header>`;
  const score = `<div style="display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:-6px"><h2 style="margin:0;font-size:16px;font-weight:700">Today’s Scorecard</h2><span style="font-size:12px;color:#5a6478;display:inline-flex;align-items:center;gap:8px">${esc(week)}${celebrations ? `<a href="/activities?party=1${f ? '&f=' + esc(f) : ''}" style="font-size:11px;font-weight:600;color:#5b3f8c;background:#f3f0fa;border-radius:10px;padding:2px 8px;text-decoration:none">Preview 🎉</a>` : ''}</span></div>
<section aria-label="Today's Scorecard" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px">${tiles}</section>`;
  const RANK = ['Do first', 'Then', 'Next'];
  const focusHtml = focus.length ? `<section aria-label="Focus now" style="background:#16213a;color:#ffffff;border-radius:12px;padding:20px 24px;display:flex;flex-direction:column;gap:14px"><div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap"><h2 style="margin:0;font-size:16px;font-weight:700;display:flex;align-items:center;gap:8px;color:#fff"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f2b8bd" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"></circle><circle cx="12" cy="12" r="4"></circle></svg>Focus Now</h2><span style="font-size:12px;color:#b9c3d6;display:flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:4px;background:#6fd39b"></span>Updated just now · re-ranks as you finish work and new messages or order changes come in</span></div>
<ol class="fcs" style="margin:0;padding:0;list-style:none;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px">${focus.slice(0, 3).map((x, i) => `<li style="background:#24324f;border-radius:10px;padding:14px 16px;display:flex;flex-direction:column;gap:6px;min-width:0"><div style="font-size:12px;color:#f2b8bd;font-weight:600">${RANK[i]}</div><a href="${esc(x.href)}" style="font-size:15px;font-weight:600;color:#ffffff;text-decoration:none">${esc(x.title)}</a><div style="font-size:13px;color:#c9d1e0">${esc(x.why)}</div></li>`).join('')}</ol></section>` : '';
  return { head, score, focusHtml };
}

const TODO_CSS = `.mrow>summary::-webkit-details-marker{display:none}.mrow[open]>summary{background:#f8f9fb}.mrow>summary:hover{background:#f8f9fb}.aw{max-width:1400px!important;margin:0 auto!important;padding:24px 32px 48px!important;display:flex!important;flex-direction:column!important;gap:22px!important}.act{display:grid!important;grid-template-columns:minmax(0,1.5fr) minmax(320px,1fr)!important;gap:16px!important;align-items:start!important}@media (max-width:980px){.act{grid-template-columns:1fr!important}}
.tdg>summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:8px;padding:0 20px 0 14px;min-height:38px;background:#f8f9fb;border-bottom:1px solid #eef1f5}.tdg>summary::-webkit-details-marker{display:none}.tdg>summary .chv{transition:transform .15s;transform:rotate(-90deg)}.tdg[open]>summary .chv{transform:none}.tdg>summary .shw{margin-left:auto;font-size:11px;color:#5a6478}.tdg[open]>summary .shw{display:none}
.trow{border-bottom:1px solid #eef1f5;display:flex;align-items:flex-start;gap:4px;padding:0 20px 0 12px}.trow:hover{background:#fafbfc}.trow .acts{display:none;gap:6px;align-items:center;padding:8px 0}.trow:hover .acts,.trow:focus-within .acts,.trow.miss .acts{display:flex}
.tck{display:flex;align-items:center;justify-content:center;width:36px;height:48px;flex:0 0 36px;background:transparent;border:0;padding:0;cursor:pointer}.tck span{width:16px;height:16px;border:2px solid #9aa6bd;border-radius:3px;display:block;background:#fff}.tck:hover span{border-color:#a8343f}`;
const CHEV_D = '<svg class="chv" aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5a6478" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"></path></svg>';
const KDOT = { email: '#1d4f91', proof: '#5b3f8c', quote: '#c88a12', call: '#1f6a43', task: '#5a6478' };
const GDOT = { missing: '#c88a12', past: '#a8343f', today: '#c88a12', soon: '#1d4f91', later: '#9aa6bd' };
const GTONE = { missing: '#8a5a00', past: '#a8343f' };
function todoChips(chipList, f, total) {
  const pill = (href, label, on, dot) => `<a href="${href}" aria-pressed="${on}" style="font-size:12px;font-weight:600;display:inline-flex;align-items:center;gap:6px;background:${on ? '#16213a' : '#eef1f5'};color:${on ? '#ffffff' : '#1b2436'};border-radius:14px;padding:0 12px;min-height:30px;text-decoration:none">${dot ? `<span aria-hidden="true" style="width:8px;height:8px;border-radius:4px;background:${on ? '#ffffff' : dot}"></span>` : ''}${esc(label)}</a>`;
  return pill('/activities', `All ${total}`, !f, '') + chipList.map((k) => pill(`/activities?f=${k.key}`, `${k.label} ${k.count}`, f === k.key, KDOT[k.key] || '#5a6478')).join('') + pill('/email', 'Archive & Spam', false, '#9aa6bd');
}
function todoRow(t, { today, projName = {} }) {
  const missing = !!t.missing;
  const due = missing ? 'No date' : t.due < today ? nice(t.due) : t.due === today ? 'Today' : nice(t.due);
  const dueColor = missing ? '#5a6478' : t.due < today ? '#a8343f' : '#1b2436';
  const cslug = String(t.customer || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const proj = projName[t.projectId] || t.projectName || '';
  const lead = missing ? '<span style="width:36px;height:48px;flex:0 0 36px"></span>' : `<form method="post" action="/activities/tasks/${esc(t.id)}/done" style="margin:0"><button class="tck" data-free aria-label="Mark done: ${esc(t.title)}" title="Mark done"><span></span></button></form>`;
  const acts = missing ? `<a class="btn" href="/activities?new=1&project=${esc(t.projectId)}">Add Next Step</a>` : `<form method="post" action="/activities/tasks/${esc(t.id)}/snooze" style="display:flex;gap:4px;margin:0"><label for="sz-${esc(t.id)}" style="position:absolute;left:-9999px">Snooze ${esc(t.title)}</label><select id="sz-${esc(t.id)}" name="days" style="font:inherit;font-size:12px;min-height:30px"><option value="1">1 day</option><option value="3">3 days</option><option value="7">1 week</option></select><button class="btn" style="min-height:30px">Snooze</button></form>`;
  const title = missing ? `Add the next step for ${t.projectName || 'this project'}` : t.title;
  return `<div class="trow${missing ? ' miss' : ''}">${lead}<div style="flex:1 1 auto;min-width:0;padding:12px 0;display:flex;gap:12px;align-items:flex-start"><span style="flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:4px"><a href="/projects/${esc(t.projectId)}?mode=demo" style="font-size:14px;font-weight:600;color:#1b2436;text-decoration:none">${esc(title)}</a><span style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:12px;color:#5a6478">${t.customer ? `<a href="/customers/${esc(cslug)}" style="color:#1d4f91;font-weight:500;text-decoration:none">${esc(t.customer)}</a>` : ''}${t.customer && proj ? '<span aria-hidden="true">·</span>' : ''}${proj ? `<a href="/projects/${esc(t.projectId)}?mode=demo" style="color:#1d4f91;font-weight:500;text-decoration:none">${esc(proj)}</a>` : ''}${t.repeat ? '<span style="color:#5b3f8c;font-weight:600">↻ Repeats</span>' : ''}</span>${t.reason ? `<span style="font-size:12px;color:#3d4658;background:#f3f0fa;border-radius:6px;padding:6px 10px;margin-top:2px"><span style="font-weight:700;color:#5b3f8c">Reason to reach out: </span>${esc(t.reason)}</span>` : ''}</span><span class="acts">${acts}</span><span style="flex:0 0 64px;font-size:13px;color:${dueColor};font-weight:600;text-align:right">${esc(due)}</span></div></div>`;
}
function todoPanel({ chipsHtml, emailBar = '', newTaskHtml = '', groups }) {
  const grp = (gr) => `<details class="tdg"${gr.open ? ' open' : ''}><summary>${CHEV_D}<span style="width:8px;height:8px;border-radius:4px;background:${GDOT[gr.key] || '#9aa6bd'}"></span><h3 style="margin:0;font-size:13px;font-weight:700;color:${GTONE[gr.key] || '#1b2436'}">${esc(gr.label)}</h3><span style="font-size:12px;color:#5a6478">${gr.count}</span><span class="shw">Show</span></summary>${gr.html || '<div style="padding:12px 20px 12px 52px;font-size:13px;color:#5a6478;border-bottom:1px solid #eef1f5">Nothing here. Nice.</div>'}</details>`;
  return `<section aria-label="To Do" style="background:#ffffff;border:1px solid #e3e7ee;border-radius:12px;box-sizing:border-box;min-width:0;overflow:hidden"><div style="display:flex;flex-direction:column;gap:10px;padding:14px 20px 12px;border-bottom:1px solid #e3e7ee"><div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap"><h2 style="margin:0;font-size:16px;font-weight:700">To Do</h2><div role="group" aria-label="Show" style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;justify-content:flex-end;margin-left:auto">${chipsHtml}</div></div>${emailBar}${newTaskHtml}</div>${groups.map(grp).join('')}</section><style>${TODO_CSS}</style>`;
}

function calPanel({ today, cal = 'day', tasks = [], events = [], isSales = true, nowHour = null }) {
  const H0 = 8, H1 = 17, PX = 44;
  const dd = (d) => new Date(d + 'T12:00:00Z');
  const wd = (d, o) => dd(d).toLocaleDateString('en-US', { timeZone: 'UTC', ...o });
  const addD = (d, n) => new Date(dd(d).getTime() + n * 864e5).toISOString().slice(0, 10);
  const isWeek = cal === 'week';
  const sub = isWeek ? `This week · ${nice(today)}–${nice(addD(today, 6))}` : `Today · ${wd(today, { weekday: 'short', month: 'short', day: 'numeric' })}`;
  const tab = (k, l) => `<a href="/activities?cal=${k}#cal" aria-pressed="${cal === k}" style="font-size:12px;font-weight:600;background:${cal === k ? '#ffffff' : 'transparent'};color:${cal === k ? '#1b2436' : '#5a6478'};border-radius:6px;padding:0 9px;min-height:30px;display:inline-flex;align-items:center;text-decoration:none;${cal === k ? 'box-shadow:0 1px 2px rgba(22,33,58,.12)' : ''}">${l}</a>`;
  const pin = '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"></path><circle cx="12" cy="10" r="2.5"></circle></svg>';
  const head = `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid #e3e7ee"><div style="min-width:0;flex:1 1 auto"><h2 style="margin:0;font-size:16px;font-weight:700">Calendar</h2><div style="font-size:12px;color:#5a6478;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(sub)}</div></div><div style="display:flex;gap:6px;align-items:center;flex:0 0 auto"><div role="group" aria-label="Calendar view" style="display:flex;background:#f0f2f6;border-radius:8px;padding:3px">${tab('day', 'Day')}${tab('week', 'Week')}</div>${isSales ? `<a href="/customers?view=prospects#route" title="Plan visits around your schedule" style="display:inline-flex;align-items:center;gap:5px;height:34px;padding:0 8px;border:1px solid #d5dbe5;background:#ffffff;border-radius:8px;font-size:12px;font-weight:600;color:#1b2436;text-decoration:none;box-sizing:border-box;white-space:nowrap">${pin}Plan visits</a>` : ''}<a href="/activities?new=1" aria-label="Add event" title="Add a task or event" style="width:34px;height:34px;border:1px solid #d5dbe5;background:#ffffff;border-radius:8px;font-size:18px;line-height:1;display:inline-flex;align-items:center;justify-content:center;color:#1b2436;text-decoration:none;box-sizing:border-box">+</a></div></div>`;
  let bodyHtml;
  if (!isWeek) {
    const hours = Array.from({ length: H1 - H0 + 1 }, (_, i) => H0 + i).map((h) => `<div style="position:absolute;left:0;right:0;top:${(h - H0) * PX}px;border-top:1px solid #eef1f5"><span style="position:absolute;left:-50px;top:-8px;width:42px;text-align:right;font-size:11px;color:#5a6478">${h > 12 ? h - 12 : h} ${h >= 12 ? 'PM' : 'AM'}</span></div>`).join('');
    const evs = events.map((e) => { const top = Math.max(0, (e.start - H0) * PX), h = Math.max(22, (e.end - e.start) * PX - 4); return `<div style="position:absolute;left:4px;right:4px;top:${top}px;height:${h}px;box-sizing:border-box;background:${e.bg || '#e8f0fb'};border:1px solid ${e.border || '#1d4f91'};border-left:4px solid ${e.border || '#1d4f91'};border-radius:6px;padding:4px 8px;overflow:hidden"><div style="font-size:12px;font-weight:700;color:#1b2436;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(e.title)}</div><div style="font-size:11px;color:#3d4658;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(e.meta || '')}</div></div>`; }).join('');
    const now = nowHour != null && nowHour >= H0 && nowHour <= H1 ? `<div aria-hidden="true" style="position:absolute;left:-6px;right:0;top:${(nowHour - H0) * PX}px;border-top:2px solid #a8343f"><span style="position:absolute;left:-4px;top:-6px;width:10px;height:10px;border-radius:5px;background:#a8343f"></span></div>` : '';
    const empty = events.length ? '' : `<div style="position:absolute;left:4px;right:4px;top:${PX}px;font-size:12px;color:#5a6478;background:#f8f9fb;border:1px dashed #d5dbe5;border-radius:6px;padding:8px 10px">No meetings on your calendar today.</div>`;
    bodyHtml = `<div style="position:relative;height:${(H1 - H0) * PX}px;margin:12px 14px 14px 58px">${hours}${empty}${evs}${now}</div>`;
  } else {
    const days = Array.from({ length: 7 }, (_, i) => addD(today, i)).filter((d) => ![0, 6].includes(dd(d).getUTCDay()) || tasks.some((t) => !t.done && t.due === d));
    bodyHtml = `<div style="padding:6px 18px 14px;display:flex;flex-direction:column">${days.map((d) => { const its = tasks.filter((t) => !t.done && t.due === d); return `<div style="padding:10px 0;border-bottom:1px solid #eef1f5"><div style="font-size:12px;font-weight:700;color:${d === today ? '#a8343f' : '#1b2436'}">${esc(wd(d, { weekday: 'long', month: 'short', day: 'numeric' }))}${d === today ? ' · Today' : ''}</div>${its.map((t) => `<div style="display:flex;gap:10px;font-size:13px;margin-top:4px"><span style="width:64px;color:#5a6478;flex:0 0 64px">Due</span><a href="/projects/${esc(t.projectId)}?mode=demo" style="font-weight:600;color:#1b2436;text-decoration:none">${esc(t.title)}</a></div>`).join('') || '<div style="font-size:13px;color:#5a6478;margin-top:4px">Nothing scheduled</div>'}</div>`; }).join('')}</div>`;
  }
  const visits = isSales ? `<a href="/customers?view=prospects#route" style="display:flex;align-items:center;gap:10px;margin:0 14px 12px;padding:10px 12px;background:#e6f2ec;border-radius:10px;text-decoration:none;color:#1b2436"><span style="color:#1f6a43;display:inline-flex">${pin}</span><span style="flex:1 1 auto;font-size:12px;line-height:1.4"><b>Out in the field today?</b> Keep-warm customers and new businesses near your stops, by city.</span><span style="font-size:12px;font-weight:700;color:#1f6a43;white-space:nowrap">Plan visits →</span></a>` : '';
  return `<section id="cal" aria-label="Calendar" style="background:#ffffff;border:1px solid #e3e7ee;border-radius:12px">${head}${bodyHtml}${visits}<div style="padding:10px 18px;border-top:1px solid #eef1f5;font-size:12px;color:#5a6478">From your Google Calendar once it is connected · meetings booked through your booking link appear here automatically</div></section>`;
}
function waitCard(waiting = [], today) {
  const days = (d) => { const n = Math.max(0, Math.round((new Date(today + 'T12:00:00Z') - new Date(d + 'T12:00:00Z')) / 864e5)); return n === 0 ? 'today' : `${n} day${n === 1 ? '' : 's'}`; };
  return `<section aria-label="Waiting on customers" style="background:#ffffff;border:1px solid #e3e7ee;border-radius:12px"><div style="padding:14px 18px;border-bottom:1px solid #e3e7ee"><h2 style="margin:0;font-size:16px;font-weight:700">Waiting on Customers</h2></div>${waiting.map((w) => `<div style="display:flex;justify-content:space-between;gap:12px;padding:12px 18px;border-bottom:1px solid #eef1f5"><div style="min-width:0"><div style="font-size:14px;font-weight:600">${esc(w.title)}</div><div style="font-size:12px;color:#5a6478">${esc(w.customer || '')}</div></div><span style="font-size:12px;color:#5a6478;white-space:nowrap">${esc(w.due ? days(w.due) : '')}</span></div>`).join('') || '<div style="padding:12px 18px;font-size:13px;color:#5a6478">No one owes you a reply.</div>'}</section>`;
}
