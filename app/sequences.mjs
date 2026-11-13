// Automated follow-up sequences (Phil, Nov 12). Prebuilt, OFF by default; admins switch them on and edit every step.
// A step is an email draft or a task. Steps land in the salesperson's To Do (kind "Sequence"); nothing is sent from the
// test copy or in parallel mode. Each sequence stops as soon as its stop rule is met.
import { esc } from './views.mjs';

export const MERGE = ['first_name', 'company', 'order_number', 'order_page', 'pay_link', 'expected_date', 'handoff', 'salesperson', 'shop_name', 'shop_phone'];

export const DEFAULT_SEQUENCES = [
  {
    id: 'welcome', name: 'New Customer Welcome', on: false,
    trigger: 'A new customer places their first order', stop: 'Stops if the customer is marked Do Not Contact',
    steps: [
      { day: 0, kind: 'email', subject: 'Welcome to {{shop_name}}', body: 'Hi {{first_name}},\n\nThanks for choosing {{shop_name}} for order {{order_number}}. Here is what happens next: we send a proof for your OK, then the job goes into production. You can check status, approve proofs and pay any time from your order page.\n\nIf anything comes up, reply here or call me at {{shop_phone}}.\n\n{{salesperson}}' },
      { day: 3, kind: 'task', subject: 'Check in with {{first_name}} at {{company}}', body: 'Quick call: any questions about the proof or timing? Note anything new they mention.' },
      { day: 30, kind: 'email', subject: 'How is everything working out?', body: 'Hi {{first_name}},\n\nNow that your signs have been up for a few weeks, how are they working for you? If there is anything you would change, or other spots that could use signage, just reply and I will put some ideas together.\n\n{{salesperson}}' },
    ],
  },
  {
    id: 'nextsteps', name: 'New Order, Next Steps', on: false,
    trigger: 'An order is created', stop: 'Stops when the order is Complete',
    steps: [
      { day: 0, kind: 'email', subject: 'Order {{order_number}}: what happens next', body: 'Hi {{first_name}},\n\nThanks for your order. Here is how it goes from here:\n\n1. Proof: we send a proof to your order page. Please review it and click Approve, or tell us what to change.\n2. Deposit: production starts once the deposit is paid ({{pay_link}}).\n3. Production: once approved and paid, your order is expected to be ready by {{expected_date}}.\n4. Hand-off: {{handoff}}. We will confirm the day and time before then.\n\nWhat we need from you:\n- Your logo or artwork files (vector files like .ai, .eps or .pdf work best)\n- Your proof approval\n- The deposit\n- For installs: who can let us in and any site rules. For shipping: the address and your carrier account if you use one.\n\nEverything is in one place on your order page: {{order_page}}\n\n{{salesperson}}' },
      { day: 2, kind: 'task', subject: 'Check {{company}} sent everything for {{order_number}}', body: 'Files, proof approval, deposit, and site or shipping details. Follow up on anything missing.' },
    ],
  },
  {
    id: 'payment', name: 'New Order, Missing Payment Reminder', on: false,
    trigger: 'An order is approved but the deposit or payment has not come in', stop: 'Stops the moment the payment is received',
    steps: [
      { day: 1, kind: 'email', subject: 'Deposit for order {{order_number}}', body: 'Hi {{first_name}},\n\nThanks for approving order {{order_number}}. We start production as soon as the deposit comes in. You can pay by card or eCheck here: {{pay_link}}\n\n{{salesperson}}' },
      { day: 3, kind: 'email', subject: 'Reminder: order {{order_number}} is waiting on the deposit', body: 'Hi {{first_name}},\n\nJust a reminder that order {{order_number}} is on hold until the deposit is paid, so your dates may move if it waits much longer. Pay link: {{pay_link}}\n\nQuestions about the amount? Reply or call {{shop_phone}}.\n\n{{salesperson}}' },
      { day: 5, kind: 'task', subject: 'Call {{first_name}} about the deposit for {{order_number}}', body: 'No payment after two emails. Call to confirm they got the pay link and whether a PO or terms are needed.' },
      { day: 7, kind: 'task', subject: 'Manager: order {{order_number}} still has no deposit', body: 'Seven days without payment. Decide whether to keep the order on hold or release the production slot.' },
    ],
  },
];

export function withDefaults(saved) {
  const byId = Object.fromEntries((Array.isArray(saved) ? saved : []).map((s) => [s.id, s]));
  return DEFAULT_SEQUENCES.map((d) => (byId[d.id] ? { ...d, ...byId[d.id] } : { ...d, steps: d.steps.map((x) => ({ ...x })) }));
}

export const fill = (tpl, vars = {}) => String(tpl || '').replace(/\{\{(\w+)\}\}/g, (m, k) => (vars[k] != null && vars[k] !== '' ? String(vars[k]) : m));

export function mergeSequenceForm(seqs, id, f) {
  const list = withDefaults(seqs);
  const i = list.findIndex((s) => s.id === id);
  if (i < 0) throw new Error('that sequence does not exist');
  const s = { ...list[i] };
  if (f.do === 'toggle') s.on = f.on === '1';
  else if (f.do === 'reset') return list.map((x, n) => (n === i ? { ...DEFAULT_SEQUENCES.find((d) => d.id === id), on: x.on } : x));
  else {
    const steps = [];
    for (let n = 0; n < 12; n++) {
      if (f[`subject${n}`] === undefined) continue;
      if (f[`remove${n}`] === 'on') continue;
      const day = Number(f[`day${n}`]);
      if (!Number.isInteger(day) || day < 0 || day > 365) throw new Error(`step ${n + 1}: the day must be 0 to 365`);
      const subject = String(f[`subject${n}`] || '').trim();
      if (subject.length < 3) throw new Error(`step ${n + 1}: add a subject`);
      steps.push({ day, kind: f[`kind${n}`] === 'task' ? 'task' : 'email', subject: subject.slice(0, 160), body: String(f[`body${n}`] || '').slice(0, 4000) });
    }
    if (f.add === 'email' || f.add === 'task') steps.push({ day: (steps.length ? steps[steps.length - 1].day : 0) + 2, kind: f.add, subject: f.add === 'email' ? 'Following up' : 'Follow up with {{first_name}}', body: '' });
    if (!steps.length) throw new Error('a sequence needs at least one step');
    s.steps = steps.sort((a, b) => a.day - b.day);
  }
  return list.map((x, n) => (n === i ? s : x));
}

export function dueSteps(seq, { start, today, stopped = false, doneIdx = [] }) {
  if (!seq.on || stopped) return [];
  const days = Math.floor((new Date(today + 'T12:00:00Z') - new Date(start + 'T12:00:00Z')) / 86400000);
  return seq.steps.map((st, n) => ({ ...st, n })).filter((st) => st.day <= days && !doneIdx.includes(st.n));
}

export function sequencesPage({ page, user, seqs, flash = '' }) {
  const list = withDefaults(seqs);
  const inp = 'font:inherit;min-height:36px;border:1px solid #d5dbe5;border-radius:8px;padding:0 8px';
  const cards = list.map((s) => {
    const steps = s.steps.map((st, n) => `<div style="border:1px solid #e3e7ee;border-radius:10px;padding:10px;display:grid;grid-template-columns:90px 110px 1fr;gap:8px;align-items:end">
<label style="display:flex;flex-direction:column;font-size:12px">Day<input name="day${n}" type="number" min="0" max="365" value="${st.day}" style="${inp}"></label>
<label style="display:flex;flex-direction:column;font-size:12px">Type<select name="kind${n}" style="${inp}"><option value="email" ${st.kind === 'email' ? 'selected' : ''}>Email</option><option value="task" ${st.kind === 'task' ? 'selected' : ''}>Task</option></select></label>
<label style="display:flex;flex-direction:column;font-size:12px">${st.kind === 'email' ? 'Subject' : 'Task'}<input name="subject${n}" value="${esc(st.subject)}" style="${inp}"></label>
<label style="display:flex;flex-direction:column;font-size:12px;grid-column:1/-1">${st.kind === 'email' ? 'Message' : 'Notes'}<textarea name="body${n}" rows="${st.kind === 'email' ? 5 : 2}" style="font:inherit;border:1px solid #d5dbe5;border-radius:8px;padding:8px">${esc(st.body)}</textarea></label>
<label style="display:flex;gap:6px;align-items:center;font-size:12px;color:var(--mute)"><input type="checkbox" name="remove${n}"> Remove this step</label></div>`).join('');
    return `<section class="panel" aria-label="${esc(s.name)}" id="seq-${esc(s.id)}"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><h2 style="margin:0;font-size:15px">${esc(s.name)}</h2><span class="pill" style="background:${s.on ? '#e6f2ec' : '#eef1f5'};color:${s.on ? '#1f6a43' : '#3d4658'}">${s.on ? 'On' : 'Off'}</span>
<form method="post" action="/admin/sequences" style="margin:0 0 0 auto"><input type="hidden" name="id" value="${esc(s.id)}"><input type="hidden" name="do" value="toggle"><input type="hidden" name="on" value="${s.on ? '0' : '1'}"><button class="btn${s.on ? '' : ' primary'}">${s.on ? 'Turn Off' : 'Turn On'}</button></form></div>
<p style="margin:6px 0 10px;font-size:13px;color:var(--mute)"><b>Starts:</b> ${esc(s.trigger)}. <b>Stops:</b> ${esc(s.stop)}. ${s.steps.length} steps over ${s.steps[s.steps.length - 1].day} days.</p>
<details><summary style="cursor:pointer;font-weight:700">Edit Steps</summary><form method="post" action="/admin/sequences" style="display:flex;flex-direction:column;gap:8px;margin-top:8px"><input type="hidden" name="id" value="${esc(s.id)}">${steps}
<p style="margin:0;font-size:12px;color:var(--mute)">Merge fields: ${MERGE.map((m) => `{{${m}}}`).join(' ')}</p>
<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary">Save Steps</button><button class="btn" name="add" value="email">+ Add Email Step</button><button class="btn" name="add" value="task">+ Add Task Step</button><button class="btn" name="do" value="reset">Reset to Prebuilt</button></div></form></details></section>`;
  }).join('');
  const body = `<div class="wrap" style="max-width:900px"><div class="bar" style="padding:14px 0"><h1>Sequences</h1></div>${flash ? `<div class="note" style="margin:0 0 12px;background:#e6f2ec;color:#1f6a43">${esc(flash)}</div>` : ''}
<p style="margin:0 0 12px;font-size:13px">Automatic follow-ups. Each step shows up in the salesperson's To Do as a ready-to-send email or a task, on the right day. Off until an admin turns it on. Nothing is sent from the test copy or in Parallel Mode.</p>${cards}</div>`;
  return page({ title: 'Sequences', user, tab: '', body });
}

// Which records are in which sequence, and the To Do items due today. state: { "<seq>|<projectId>": { start, done: [n] } }.
export function sequenceTodos({ seqs, projects = [], state = {}, today, unpaid = new Set(), prefix = '', vars = {}, startOf = {} }) {
  const list = withDefaults(seqs).filter((s) => s.on);
  const next = { ...state };
  const todos = [];
  const orders = projects.filter((p) => ['progress', 'built', 'complete'].includes(p.lane));
  const firstOrder = (p) => orders.filter((o) => o.company === p.company).length === 1;
  for (const s of list) {
    for (const p of orders) {
      const inSeq = s.id === 'welcome' ? firstOrder(p) : s.id === 'nextsteps' ? true : s.id === 'payment' ? unpaid.has(p.id) && p.lane !== 'complete' : false;
      const key = `${s.id}|${p.id}`;
      if (!inSeq && !next[key]) continue;
      if (!next[key]) { if (p.lane === 'complete' && s.id !== 'welcome') continue; next[key] = { start: startOf[p.id] && startOf[p.id] <= today ? startOf[p.id] : today, done: [] }; }
      const stopped = (s.id === 'nextsteps' && p.lane === 'complete') || (s.id === 'payment' && !unpaid.has(p.id));
      const v = { first_name: String(p.contact || '').split(' ')[0], company: p.company, order_number: prefix && p.orderId ? `${prefix}-${p.orderId}` : (p.orderId || p.name), salesperson: p.salesperson || '', ...vars };
      for (const st of dueSteps(s, { start: next[key].start, today, stopped, doneIdx: next[key].done || [] })) {
        todos.push({ id: `seq-${s.id}-${p.id}-${st.n}`, seqKey: key, seqStep: st.n, seq: true, seqName: s.name, kind: 'task', title: fill(st.subject, v), body: fill(st.body, v), stepKind: st.kind, customer: p.company, projectId: p.id, due: today, done: false });
      }
    }
  }
  return { todos, state: next };
}
export function markStepDone(state, key, n) {
  const cur = state[key] || { start: new Date().toISOString().slice(0, 10), done: [] };
  return { ...state, [key]: { ...cur, done: [...new Set([...(cur.done || []), Number(n)])] } };
}

// Customer › Activity: where each running sequence is for this customer's projects.
export function sequenceProgress({ seqs, state = {}, projects = [], today }) {
  const byId = Object.fromEntries(withDefaults(seqs).map((s) => [s.id, s]));
  const out = [];
  for (const [key, st] of Object.entries(state || {})) {
    const [sid, pid] = key.split('|');
    const s = byId[sid]; const p = projects.find((x) => x.id === pid);
    if (!s || !p) continue;
    const done = (st.done || []).length;
    const next = s.steps.map((x, n) => ({ ...x, n })).find((x) => !(st.done || []).includes(x.n));
    const nextDate = next ? new Date(new Date(st.start + 'T12:00:00Z').getTime() + next.day * 86400000).toISOString().slice(0, 10) : '';
    out.push({ name: s.name, on: s.on, project: p.name, projectId: p.id, start: st.start, done, total: s.steps.length, next: next ? fill(next.subject, { first_name: String(p.contact || '').split(' ')[0], company: p.company, order_number: p.orderId || p.name }) : '', nextDate, due: nextDate && nextDate <= today });
  }
  return out;
}
export function sequenceProgressHtml(list = []) {
  if (!list.length) return '';
  return `<section class="panel" aria-label="Sequences"><h2 style="margin:0 0 8px;font-size:15px">Sequences</h2><ul style="list-style:none;margin:0;padding:0">${list.map((x) => `<li style="padding:8px 0;border-top:1px solid #eef1f5;font-size:13px"><span class="pill" style="background:#e6f2ec;color:#1f6a43">Sequence</span> <b>${esc(x.name)}</b> · <a href="/projects/${esc(x.projectId)}?mode=demo">${esc(x.project)}</a><div style="color:var(--mute);font-size:12px;margin-top:2px">Started ${esc(x.start)} · ${x.done} of ${x.total} steps done${x.next ? ` · Next: ${esc(x.next)} (${x.due ? 'due now, on Activities' : esc(x.nextDate)})` : ' · Finished'}${x.on ? '' : ' · Sequence is turned off'}</div></li>`).join('')}</ul></section>`;
}
