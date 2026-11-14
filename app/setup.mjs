// Nightly reconciliation report (payments CoreBridge can't take) + Setup Wizard: Process Expert interview.
import { page, esc } from './views.mjs';
import { sampleData } from './data.mjs';

const money = (n) => '$' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// CoreBridge V2 only takes payments on a brand-new order, so store credit and offline payments on existing
// orders must be keyed in by hand. This report lists them until someone marks them entered.
export function demoPayments(today) {
  if (!sampleData()) return [];
  return [
    { id: 'pay1', date: today, order: '75840', customer: 'Riverbend Dental', kind: 'Store credit', amount: 85, entered: false },
    { id: 'pay2', date: today, order: '75812', customer: 'Oakline Café', kind: 'Check #1182', amount: 1070, entered: false },
    { id: 'pay3', date: today, order: '75799', customer: 'Northside HVAC', kind: 'Cash', amount: 240, entered: true, enteredBy: 'kristin', enteredAt: `${today}T15:00:00Z` },
  ];
}

export function markEntered(list, id, who, at) {
  const p = list.find((x) => x.id === id);
  if (!p) throw new Error('that payment is not here');
  if (p.entered) return list;
  return list.map((x) => (x.id === id ? { ...x, entered: true, enteredBy: who, enteredAt: at } : x));
}

export function reconPage({ user, payments, flash = '' }) {
  const open = payments.filter((p) => !p.entered);
  const done = payments.filter((p) => p.entered);
  const row = (p) => `<tr><td>${esc(p.date)}</td><td>${esc(p.order)}</td><td>${esc(p.customer)}</td><td>${esc(p.kind)}</td><td style="text-align:right">${money(p.amount)}</td><td>${p.entered ? `✓ ${esc(p.enteredBy || '')}` : `<form method="post" action="/reports/reconciliation/${esc(p.id)}" style="margin:0"><button class="btn">Mark Entered in CoreBridge</button></form>`}</td></tr>`;
  const head = '<thead><tr><th>Date</th><th>Order</th><th>Customer</th><th>Payment</th><th style="text-align:right">Amount</th><th></th></tr></thead>';
  const body = `<div class="wrap"><div class="bar" style="padding:14px 0"><h1>Nightly Reconciliation</h1></div>${flash ? `<div class="note" style="margin:0 0 12px;background:#e6f2ec;color:#1f6a43">${esc(flash)}</div>` : ''}
<p style="margin:0 0 12px;color:var(--mute)">CoreBridge can’t take a payment or store credit on an existing order, so these need to be keyed into CoreBridge by hand. Total to enter: <b>${money(open.reduce((a, p) => a + p.amount, 0))}</b>.</p>
<section class="panel"><h2 style="margin:0 0 10px;font-size:15px">To Enter · ${open.length}</h2><table>${head}<tbody>${open.map(row).join('') || '<tr><td colspan="6" style="color:var(--mute)">All caught up.</td></tr>'}</tbody></table></section>
${done.length ? `<section class="panel"><details><summary style="cursor:pointer;font-weight:700">Already Entered · ${done.length}</summary><table>${head}<tbody>${done.map(row).join('')}</tbody></table></details></section>` : ''}</div>`;
  return page({ title: 'Nightly Reconciliation', user, tab: '', body });
}

export const QUESTIONS = [
  { q: 'First, how do most jobs start? Walk-ins, phone and email requests, or a salesperson out in the field?', why: 'this sets who owns a new lead.', a: ['Mostly calls and email', 'Field sales', 'A mix of all three'], step: 'New request' },
  { q: 'Do you visit the site before quoting?', why: 'if yes, I add a site survey step with photos and measurements.', a: ['Always', 'Only for installs', 'Rarely'], step: 'Site survey' },
  { q: 'What do you need before work starts: a signed estimate, a deposit, a PO?', why: 'this is the gate between Estimate and In production.', a: ['Approval + 50% deposit', 'Approval + PO for accounts', 'Both, depending on the customer'], step: 'Approved & paid?' },
  { q: 'Who makes the proof, and does a salesperson check it before the customer sees it?', why: 'this decides whether there is a Sales proof review step.', a: ['Designer, then salesperson checks', 'Designer sends it directly', 'Depends on the job'], step: 'Proofing' },
  { q: 'Do you make everything in-house, or buy some products from vendors?', why: 'vended items get a purchasing step and vendor quote requests.', a: ['All in-house', 'Some vended', 'Mostly vended'], step: 'In-house or vended?' },
  { q: 'Does anything need a city permit?', why: 'permits can hold up fabrication, so they get their own board.', a: ['Yes, exterior signs', 'Rarely', 'No'], step: 'Permits' },
  { q: 'Who checks the finished work before pickup or install?', why: 'this sets the Quality control step and who signs off.', a: ['The salesperson (or their QC delegate)', 'Production lead', 'Whoever built it'], step: 'Quality control' },
  { q: 'Last one: when is a job finished? At pickup or install, or when it’s paid in full?', why: 'this decides when an order closes.', a: ['Delivered and paid', 'Delivered', 'Paid'], step: 'Complete & collect' },
];

export function answer(answers, i, text) {
  const n = Number(i);
  if (!Number.isInteger(n) || n < 0 || n >= QUESTIONS.length) throw new Error('that question does not exist');
  const t = String(text || '').trim();
  if (!t) throw new Error('pick an answer or type one');
  const next = [...(answers || [])];
  next[n] = t.slice(0, 300);
  return next;
}

// The interview ends with a short walk-through of 3 sample jobs and any gaps it found.
export function reviewGaps(answers) {
  const g = [];
  if (/yes/i.test(answers[5] || '')) g.push('If the city rejects a permit, it goes back to the salesperson with a task.');
  if (/directly/i.test(answers[3] || '')) g.push('Proofs go straight to customers, so I added an automatic spell check before they send.');
  g.push('Best practice added: a 3-round proof limit and a reminder if a customer hasn’t answered a proof in 2 days.');
  return g;
}

export function setupPage({ user, answers = [], at = 0, flash = '' }) {
  const i = Math.max(0, Math.min(Number(at) || 0, QUESTIONS.length));
  const done = answers.filter(Boolean).length >= QUESTIONS.length && i >= QUESTIONS.length;
  const chat = ['<div class="msg them">Hi! I’m your Process Expert. I’ll ask a few plain questions about how jobs move through your shop, then build your workflow from your answers. You can change anything later just by telling me.</div>'];
  QUESTIONS.slice(0, i).forEach((x, n) => { chat.push(`<div class="msg them">${esc(x.q)}<small>Why I’m asking: ${esc(x.why)}</small></div>`); if (answers[n]) chat.push(`<div class="msg me">${esc(answers[n])}</div>`); });
  if (!done && i < QUESTIONS.length) chat.push(`<div class="msg them">${esc(QUESTIONS[i].q)}<small>Why I’m asking: ${esc(QUESTIONS[i].why)}</small></div>`);
  if (done) reviewGaps(answers).forEach((g) => chat.push(`<div class="msg them" style="background:#fdf3dc">${esc(g)}</div>`));
  const flow = QUESTIONS.map((x, n) => (answers[n] ? `<li><a href="/setup/workflow?at=${n}" title="Change this answer" style="color:inherit;text-decoration:none;display:flex;flex-direction:column"><b>${n + 1}. ${esc(x.step)}</b><span>${esc(answers[n])}</span></a></li>` : '')).join('');
  const input = done ? '' : `<form method="post" action="/setup/workflow" style="display:flex;flex-direction:column;gap:8px"><input type="hidden" name="i" value="${i}">
<div style="display:flex;gap:8px;flex-wrap:wrap">${QUESTIONS[i].a.map((a) => `<button data-free name="text" value="${esc(a)}" class="btn" style="border-radius:16px;color:#1d4f91;background:#eef4fc;border-color:#c9daf2">${esc(a)}</button>`).join('')}</div>
<div style="display:flex;gap:8px"><label for="ans" style="position:absolute;left:-9999px">Your answer</label><input id="ans" name="custom" placeholder="Or type your answer in your own words…" style="flex:1;font:inherit;min-height:42px;border:1px solid #d5dbe5;border-radius:10px;padding:0 10px"><button class="btn primary" name="send" value="1">Send</button></div>
<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--mute)"><span>Not sure? Say so. I’ll use what most FASTSIGNS shops do, and you can change it later.</span>${i > 0 ? `<a href="/setup/workflow?at=${i - 1}">Go Back One Question</a>` : ''}</div></form>`;
  const body = `<style>.msg{max-width:85%;border-radius:12px;padding:10px 12px;font-size:14px;line-height:1.5}.msg small{display:block;margin-top:6px;font-size:12px;color:var(--mute)}.them{align-self:flex-start;background:#f4f6f9}.me{align-self:flex-end;background:#e8f0fb}
.flow{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}.flow li{border:1px solid var(--line);border-radius:10px;padding:8px 10px;display:flex;flex-direction:column;font-size:13px}.flow span{color:var(--mute);font-size:12px}
.su{max-width:1180px;margin:0 auto;padding:16px 20px;display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:16px;align-items:start}@media (max-width:900px){.su{grid-template-columns:1fr}}</style>
<div class="su"><div style="grid-column:1/-1;display:flex;justify-content:flex-end"><form method="post" action="/setup/workflow/skip"><button class="btn">Skip and Start From the Standard FASTSIGNS Workflow</button></form></div><section class="panel" aria-label="Setup interview"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap"><h1 style="font-size:18px">Let’s Map How Your Shop Works · With Your Process Expert</h1><span style="font-size:13px;color:var(--mute)">Question ${Math.min(i + 1, QUESTIONS.length)} of ${QUESTIONS.length} · about 10 minutes</span></div>
<div aria-hidden="true" style="height:6px;background:#eef1f5;border-radius:3px;margin:8px 0 12px"><div style="height:6px;width:${Math.round((Math.min(i, QUESTIONS.length) / QUESTIONS.length) * 100)}%;background:#a8343f;border-radius:3px"></div></div>
${flash ? `<div class="note" style="margin:0 0 10px;background:#fbeaec;color:#8f2a34">${esc(flash)}</div>` : ''}<div role="log" aria-live="polite" style="display:flex;flex-direction:column;gap:10px;margin-bottom:12px">${chat.join('')}</div>${input}</section>
<aside class="panel" aria-label="Your workflow so far"><h2 style="margin:0 0 6px;font-size:16px">Your Workflow So Far</h2><p style="margin:0 0 8px;font-size:12px;color:var(--mute)">This fills in as you answer. Click a step to change it.</p><ol class="flow">${flow || '<li><span>Fills in as you answer.</span></li>'}</ol>
${done ? '<form method="post" action="/setup/workflow/build" style="margin-top:12px"><button class="btn primary" style="width:100%;justify-content:center;min-height:44px">Looks Right · Build My Workflow</button></form>' : `<p style="font-size:12px;color:var(--mute);margin:10px 0 0">${QUESTIONS.length - i} more question${QUESTIONS.length - i === 1 ? '' : 's'}, then you’ll see the full map and can keep changing it by chatting.</p>`}</aside></div>`;
  return page({ title: 'Set Up Your Workflow', user, tab: '', body });
}

// Turn interview answers into workflow draft changes (owner and target-day fields the Workflow Builder understands).
export function answersToChanges(answers, draft) {
  const has = (id) => draft.some((s) => s.id === id);
  const ch = {};
  const a = (n) => String(answers[n] || '').toLowerCase();
  if (has('salesrev')) ch.owner_salesrev = /directly/.test(a(3)) ? 'Skipped (designer sends directly)' : 'Salesperson';
  if (has('qc')) ch.owner_qc = /production lead/.test(a(6)) ? 'Production lead' : /salesperson/.test(a(6)) ? 'Salesperson' : /whoever/.test(a(6)) ? 'Whoever built it' : (draft.find((s) => s.id === 'qc') || {}).owner;
  if (has('vended')) ch.days_vended = /mostly/.test(a(4)) ? '14' : /all in-house/.test(a(4)) ? '0' : '10';
  if (has('proofwait')) ch.days_proofwait = '2';
  for (const k of Object.keys(ch)) if (ch[k] == null) delete ch[k];
  return ch;
}
