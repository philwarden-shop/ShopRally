// Workflow Builder: each step's owner and target days, edited as a draft until Publish. Process Expert tips.
// Plus proofing: round limit and customer reminders after N days (Admin > Work).
import { page, esc } from './views.mjs';

export function baseline(steps, targets) {
  return steps.filter((s) => s.board !== 'none').map((s) => ({ id: s.id, name: s.name, board: s.board, owner: s.owner, days: targets[s.id] ?? null }));
}

export function editDraft(draft, f) {
  return draft.map((s) => {
    const out = { ...s };
    if (`owner_${s.id}` in f) { const o = String(f[`owner_${s.id}`]).trim(); if (o.length < 2) throw new Error(`“${s.name}” needs an owner`); out.owner = o.slice(0, 60); }
    if (`days_${s.id}` in f && String(f[`days_${s.id}`]).trim() !== '') {
      const d = Number(f[`days_${s.id}`]);
      if (!Number.isInteger(d) || d < 0 || d > 60) throw new Error(`“${s.name}” target must be 0 to 60 days`);
      out.days = d;
    }
    return out;
  });
}

export function diff(a, b) { return b.filter((s, i) => JSON.stringify(s) !== JSON.stringify(a[i])).map((s) => s.id); }

export function expertTips(draft) {
  const t = [];
  const by = Object.fromEntries(draft.map((s) => [s.id, s]));
  if ((by.proofwait?.days ?? 0) > 3) t.push('Customers waiting more than 3 days on a proof usually need a nudge. Your proof reminder will go out before then.');
  if (by.salesrev && /automatic/i.test(by.salesrev.owner)) t.push('Sales proof review is set to Automatic. Most shops keep a person here so nothing odd reaches the customer.');
  if ((by.qc?.days ?? 0) > 1) t.push('Quality control longer than a day tends to delay hand-off. Consider 1 day.');
  if (!t.length) t.push('This workflow follows FASTSIGNS best practice. Change any owner or target and I’ll flag anything that looks risky.');
  return t;
}

export function builderPage({ user, published, draft, flash = '', error = '', reply = '', rules = [], test = false }) {
  const changed = new Set(diff(published, draft));
  const rows = draft.map((s) => `<tr style="${changed.has(s.id) ? 'background:#fdf3dc' : ''}"><td><b>${esc(s.name)}</b><br><small style="color:var(--mute)">${esc(s.board)} board</small></td>
<td><label for="o-${s.id}" style="position:absolute;left:-9999px">Owner of ${esc(s.name)}</label><input id="o-${s.id}" name="owner_${s.id}" value="${esc(s.owner)}" style="font:inherit;min-height:34px;border:1px solid #d5dbe5;border-radius:6px;padding:0 8px;width:100%"></td>
<td><label for="d-${s.id}" style="position:absolute;left:-9999px">Target days for ${esc(s.name)}</label><input id="d-${s.id}" name="days_${s.id}" type="number" min="0" max="60" value="${s.days ?? ''}" style="font:inherit;min-height:34px;border:1px solid #d5dbe5;border-radius:6px;padding:0 8px;width:80px"></td></tr>`).join('');
  const body = `<div class="wrap"><div class="bar" style="padding:14px 0"><h1>Workflow Builder</h1><span class="pill" style="margin-left:8px;background:${changed.size ? '#fdf3dc' : '#e6f2ec'};color:${changed.size ? '#7a4e00' : '#1f6a43'}">${changed.size ? `Draft · ${changed.size} unpublished change${changed.size === 1 ? '' : 's'}` : 'Published'}</span><span style="flex:1"></span><a class="btn" href="/admin/workflow?test=rush#wf-test">Test with an Order</a><a class="btn" href="#wf-history">History</a></div>
<p style="margin:-6px 0 12px;font-size:13px;color:var(--mute)">Northern Kentucky · ${changed.size ? 'draft with unpublished changes' : 'published version in use'}</p>
${flash ? `<div class="note" style="margin:0 0 12px;background:#e6f2ec;color:#1f6a43">${esc(flash)}</div>` : ''}${error ? `<div class="note" role="alert" style="margin:0 0 12px;background:#fbeaec;color:#8f2a34">${esc(error)}</div>` : ''}
<div style="display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:14px;align-items:start" class="wfb">
<form method="post" action="/admin/workflow" class="panel"><table><thead><tr><th>Step</th><th>Owner</th><th>Target days</th></tr></thead><tbody>${rows}</tbody></table>
<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><button class="btn" name="do" value="save">Save Draft</button><button class="btn primary" name="do" value="publish" ${changed.size ? '' : 'disabled'}>Publish Changes</button><button class="btn" name="do" value="discard" ${changed.size ? '' : 'disabled'}>Discard Draft</button></div>
<p style="font-size:12px;color:var(--mute);margin:8px 0 0">Changes stay a draft until you publish. Nobody sees them before then.</p>${partsLegend()}</form>
<aside class="panel" style="background:#f3f0fa;border-color:#d9cff0;color:#4a3373"><h2 style="margin:0 0 8px;font-size:15px">✦ Process Expert</h2><p style="margin:0 0 8px;font-size:12px">Say what you want. It asks the right questions, checks for gaps, and changes the draft.</p>${expertTips(draft).map((t) => `<p style="margin:0 0 8px;font-size:13px">${esc(t)}</p>`).join('')}${reply ? `<p role="status" style="margin:0 0 8px;font-size:13px;background:#fff;border-radius:8px;padding:8px">${esc(reply)}</p>` : ''}<form method="post" action="/admin/workflow" style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px"><input type="hidden" name="do" value="chat"><label for="wfchat" style="font-size:12px">Tell me what to change</label><input id="wfchat" name="say" placeholder="Give quality control 1 day" style="font:inherit;min-height:38px;border:1px solid #d9cff0;border-radius:8px;padding:0 10px"><button class="btn" style="align-self:flex-start">Send</button></form><p style="margin:0 0 10px"><a class="pill" href="/admin/workflow?test=rush#wf-test">Walk me through a rush job</a></p><a class="btn" href="/setup/workflow">Start Over With Interview</a><p style="margin:10px 0 0;font-size:12px">Nothing goes live until you click Publish Changes. Every change can be undone.</p></aside></div>
${flowMap(draft)}${test ? testPanel(draft) : ''}${rulesSection(rules)}${historySection(published, draft)}
<style>@media (max-width:900px){.wfb{grid-template-columns:1fr !important}}</style></div>`;
  return page({ title: 'Workflow Builder', user, tab: '', body });
}

// Chat with the Process Expert: plain sentences become draft changes. Rule-based and predictable; it always says what it changed.
export function findStep(draft, text) {
  const t = ` ${String(text).toLowerCase()} `;
  let best = null, score = 0;
  for (const s of draft) {
    const name = s.name.toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
    if (t.includes(` ${name} `)) { const sc = 1000 + name.length; if (sc > score) { best = s; score = sc; } continue; }
    const words = name.split(' ').filter((w) => w.length > 3);
    const hit = words.filter((w) => t.includes(w)).length;
    if ((hit >= 2 || (hit && hit === words.length)) && hit * 10 > score) { best = s; score = hit * 10; }
  }
  return best;
}
export function interpret(draft, text) {
  const raw = String(text || '').trim();
  if (/\brush\b/i.test(raw)) { const rw = rushWalk(draft); return { changes: {}, reply: `A rush job goes to the top of every board and takes about ${rw.total} business days on this draft (vs. ${rw.normal} normally). Use Test with an Order to see each step.` }; }
  if (raw.length < 3) return { changes: {}, reply: 'Tell me what to change, like “Give quality control 1 day” or “The production lead owns quality control.”' };
  const step = findStep(draft, raw);
  if (!step) return { changes: {}, reply: `I couldn’t tell which step you mean. The steps are: ${draft.map((s) => s.name).join(', ')}.` };
  const days = raw.match(/(\d{1,2})\s*(?:business\s*)?days?/i);
  const own = raw.match(/(?:^|\b)(?:the\s+)?([a-z][a-z ]{1,40}?)\s+(?:owns|should own|handles|is responsible for)\b/i) || raw.match(/\b(?:owned by|owner (?:is|to)|assign(?:ed)? to|give it to)\s+(?:the\s+)?([a-z][a-z ]{1,40})/i);
  const changes = {};
  const said = [];
  if (days) { changes[`days_${step.id}`] = days[1]; said.push(`target for ${step.name} is now ${days[1]} day${days[1] === '1' ? '' : 's'}`); }
  if (own) { const o = own[1].trim().replace(/\s+(step|stage)$/i, ''); const cap = o.charAt(0).toUpperCase() + o.slice(1); changes[`owner_${step.id}`] = cap; said.push(`${cap} now owns ${step.name}`); }
  if (!said.length) return { changes: {}, reply: `I found ${step.name}. Do you want to change who owns it or how many days it should take?` };
  return { changes, reply: `Done in your draft: ${said.join(', and ')}. Publish when you’re ready.` };
}

// Proofing rules from Admin > Work.
export function proofRound(item, limit = 3) {
  const round = (Number(item.revision) || 0) + 1;
  return { round, limit, over: round > limit };
}
export function proofReminders(items, now, days = 2) {
  return items.filter((i) => i.step === 'proofwait' && i.movedAt && (now - new Date(i.movedAt)) / 86400000 >= days)
    .map((i) => ({ ...i, waited: Math.floor((now - new Date(i.movedAt)) / 86400000) }));
}
export function proofPanel(reminders, items, limit) {
  const over = items.filter((i) => ['indesign', 'proofqc', 'salesrev', 'proofwait'].includes(i.step) && proofRound(i, limit).over);
  if (!reminders.length && !over.length) return '';
  return `<section class="panel" aria-label="Proofs"><h2 style="margin:0 0 6px;font-size:15px">Proofs Needing a Nudge · ${reminders.length + over.length}</h2><ul style="list-style:none;margin:0;padding:0;font-size:13px">
${reminders.map((r) => `<li style="padding:5px 0;border-top:1px solid #eef1f5"><a href="/items/${esc(r.id)}/send-proof">${esc(r.name)}</a> · waiting ${r.waited} days · reminder ready</li>`).join('')}
${over.map((o) => `<li style="padding:5px 0;border-top:1px solid #eef1f5"><a href="/projects/${esc(o.projectId)}?mode=demo">${esc(o.name)}</a> · round ${proofRound(o, limit).round} of ${limit} included · tell the salesperson</li>`).join('')}</ul></section>`;
}

// Mockup sweep (WorkflowBuilder board): business rules, parts legend, flow map, test walk, rule adding.
export const BUSINESS_RULES = ['Items move on their own; the order is Built when every item is Built.', 'Hard due dates can’t be moved without a manager.', 'Rush items go to the top of every board.', 'Service lines go to Built at Planning.', 'A step can’t be skipped unless the rule says so (e.g. no design needed).'];
export const PARTS = [['Step', 'A column on a board'], ['Decision', 'Yes / no path'], ['Wait for customer', 'Approval, files, payment'], ['Automatic check', 'Runs on its own'], ['Hold', 'Pause from any step'], ['Sub-flow', 'e.g. Permits'], ['Finish', 'Ends the workflow']];
const DECISIONS = { queue: ['Needs design?', 'No: print-ready → Production files'], wip: ['In-house or vended?', 'Vended → Vended product'], files: ['Approved?', 'Changes → back to In design'] };
export function addRule(rules, text) {
  const t = String(text || '').trim().replace(/\s+/g, ' ');
  if (t.length < 5) throw new Error('Write the rule in a short sentence');
  if (t.length > 200) throw new Error('Keep the rule under 200 characters');
  const list = Array.isArray(rules) ? rules : [];
  if (list.length >= 20) throw new Error('You can add up to 20 rules');
  if ([...BUSINESS_RULES, ...list].some((r) => r.toLowerCase() === t.toLowerCase())) throw new Error('That rule is already on the list');
  return [...list, t];
}
function stageOf(id) { return ({ prep: 'Planning', queue: 'Design', indesign: 'Design', proofqc: 'Design', salesrev: 'Design', proofwait: 'Design', files: 'Design', wip: 'Produce', vended: 'Produce', qc: 'QC', built: 'Built' })[id] || 'Other'; }
export function flowMap(draft) {
  const stages = [];
  for (const s of draft) { const st = s.stage || stageOf(s.id); let g = stages.find((x) => x.name === st); if (!g) { g = { name: st, steps: [] }; stages.push(g); } g.steps.push(s); }
  const box = (s) => `${DECISIONS[s.id] ? `<div class="wfm-d" title="${esc(DECISIONS[s.id][1])}"><span>${esc(DECISIONS[s.id][0])}</span></div>` : ''}<div class="wfm-s${/customer/i.test(s.owner) ? ' wfm-w' : /automatic/i.test(s.owner) ? ' wfm-a' : ''}"><b>${esc(s.name)}</b><small>${esc(s.owner)}${s.days != null ? ` · ${s.days} day${s.days === 1 ? '' : 's'}` : ''}</small></div>`;
  return `<section class="panel" aria-label="Workflow map" id="wf-map" style="margin-top:14px"><h2 style="margin:0 0 8px;font-size:15px">Workflow Map</h2><div class="wfm">${stages.map((g, i) => `<div class="wfm-c"><div class="wfm-h">${i + 1} ${esc(g.name.toUpperCase())}</div>${g.steps.map(box).join('<div class="wfm-ar" aria-hidden="true">↓</div>')}</div>`).join('')}<div class="wfm-c"><div class="wfm-h">${stages.length + 1} FINISH</div><div class="wfm-s wfm-f"><b>Complete &amp; collect</b><small>Ends the workflow</small></div></div></div>
<p style="margin:8px 0 0;font-size:12px;color:var(--mute)">Diamonds are yes / no paths. Purple dashed boxes wait for the customer. <b>On hold</b> can pause any step.</p></section>
<style>.wfm{display:flex;gap:10px;overflow-x:auto;padding-bottom:6px}.wfm-c{min-width:150px;flex:1;background:#f6f7fa;border-radius:8px;padding:8px;display:flex;flex-direction:column;align-items:stretch}.wfm-h{font-size:11px;font-weight:700;letter-spacing:.06em;color:var(--mute);margin-bottom:6px}.wfm-s{background:#fff;border:1px solid #c5ccd8;border-radius:4px;padding:6px 8px;font-size:12px;display:flex;flex-direction:column}.wfm-s small{color:var(--mute)}.wfm-w{border:1px dashed #7a5bb0;background:#f3f0fa}.wfm-a{border-color:#1d4f91;background:#e8f0fb}.wfm-f{border-color:#1f6a43;background:#e6f2ec;border-radius:10px}.wfm-d{align-self:center;margin:4px 0 8px;background:#fdf3dc;border:1px solid #c88a12;border-radius:6px;padding:4px 8px;font-size:11px;font-weight:600;color:#7a4e00}.wfm-ar{text-align:center;color:var(--mute);font-size:12px}</style>`;
}
export function rushWalk(draft) {
  const path = draft.filter((s) => s.id !== 'vended');
  const lines = path.map((s) => ({ name: s.name, owner: s.owner, days: s.days == null ? 0 : Math.ceil(s.days / 2) }));
  return { lines, total: lines.reduce((n, l) => n + l.days, 0), normal: path.reduce((n, s) => n + (s.days || 0), 0) };
}
export function testPanel(draft) {
  const w = rushWalk(draft);
  return `<section class="panel" aria-label="Test with an order" id="wf-test" style="margin-top:14px"><h2 style="margin:0 0 6px;font-size:15px">Test with an Order: Rush Job</h2><p style="margin:0 0 8px;font-size:13px">A sample rush order for a lobby sign, made in-house, walked through this draft. Rush items go to the top of every board, so each target is cut in half.</p><ol style="margin:0;padding-left:20px;font-size:13px">${w.lines.map((l) => `<li style="padding:3px 0"><b>${esc(l.name)}</b> · ${esc(l.owner)} · ${l.days} day${l.days === 1 ? '' : 's'}</li>`).join('')}</ol><p style="margin:8px 0 0;font-size:13px"><b>About ${w.total} business days</b> as a rush, vs. ${w.normal} normally. Nothing was saved and no order was touched.</p></section>`;
}
export function rulesSection(custom = []) {
  return `<section class="panel" aria-label="Business rules" id="wf-rules" style="margin-top:14px"><h2 style="margin:0 0 6px;font-size:15px">Business Rules</h2><ul style="margin:0 0 8px;padding-left:18px;font-size:13px">${[...BUSINESS_RULES, ...custom].map((r) => `<li style="padding:3px 0">${esc(r)}</li>`).join('')}</ul>
<form method="post" action="/admin/workflow" style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end"><input type="hidden" name="do" value="addrule"><label style="display:flex;flex-direction:column;font-size:12px;flex:1;min-width:220px">New rule<input name="rule" maxlength="200" placeholder="Banners over 10 feet need a manager’s OK" style="font:inherit;min-height:36px;border:1px solid #d5dbe5;border-radius:8px;padding:0 8px"></label><button class="btn">+ Add Rule</button></form>
<p style="margin:8px 0 0;font-size:12px"><a href="#ship-rules">Hand-off &amp; Shipping rules ↓</a></p></section>`;
}
export function partsLegend() {
  return `<details style="margin-top:10px"><summary style="cursor:pointer;font-size:13px;font-weight:600">Prefer to Drag? Show the Parts</summary><h3 style="margin:8px 0 4px;font-size:13px">Drag Onto the Map</h3><ul style="list-style:none;margin:0;padding:0;font-size:12px">${PARTS.map(([l, h]) => `<li style="padding:3px 0"><b>${esc(l)}</b> · ${esc(h)}</li>`).join('')}</ul><p style="margin:6px 0 0;font-size:12px;color:var(--mute)">In this test copy, change steps in the table or tell the Process Expert. The parts show what each shape on the map means.</p></details>`;
}
export function historySection(published, draft) {
  const ch = diff(published, draft);
  const names = draft.filter((s) => ch.includes(s.id)).map((s) => s.name);
  return `<section class="panel" aria-label="History" id="wf-history" style="margin-top:14px"><h2 style="margin:0 0 6px;font-size:15px">History</h2><p style="margin:0;font-size:13px">${names.length ? `This draft changes ${names.length} step${names.length === 1 ? '' : 's'} from the published version: ${esc(names.join(', '))}. Discard Draft undoes all of them.` : 'The draft matches the published version. Nothing is waiting to publish.'} Orders already past a step keep the version they started with.</p></section>`;
}
