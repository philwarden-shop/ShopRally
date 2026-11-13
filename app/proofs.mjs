// Send proof (staff) and proof approval in the customer's Order Portal (public link, no sign-in).
// Flow: Sales proof review -> "Send proof" -> Awaiting customer approval -> customer approves (-> Production files)
// or asks for changes (-> In design, Design Revision n, notes attached). Nothing is sent to CoreBridge.
import { sign, verify } from './auth.mjs';
import { page, esc } from './views.mjs';
import { stepById } from './workflow.mjs';

// Admin > Customer order page: approval checklist (editable there; these are the defaults).
export const APPROVAL_CHECKS = ['Spelling and phone numbers are correct', 'Sizes and colors are what I want', 'I understand production starts after approval'];
export const MUST_TICK_ALL = true;
const PORTAL_DAYS = 30;

// Demo proof files per item (latest last). Real ones come from the proof uploaded on the item.
export const DEMO_PROOFS = {
  i61: [{ v: 1, file: 'Lobby sign 26in - v1.pdf' }, { v: 2, file: 'Lobby sign 26in - v2.pdf' }, { v: 3, file: 'Lobby sign 26in - v3.pdf' }],
  i11: [{ v: 1, file: 'Wayfinding set (8) - v1.pdf' }],
  i72: [{ v: 1, file: 'Window perf front door - v1.pdf' }],
  i41: [{ v: 1, file: 'Patio menu inserts - v1.pdf' }],
};
export const latestProof = (itemId, sent = {}) => {
  const list = DEMO_PROOFS[itemId] || [{ v: 1, file: 'Proof - v1.pdf' }];
  return sent.v ? list.find((p) => p.v === sent.v) || list[list.length - 1] : list[list.length - 1];
};

// Portal links use their own key, so a portal link can never be used as a staff session.
const portalKey = (key) => `${key}:order-portal`;
export function portalToken(projectId, key, now = Date.now()) {
  return sign({ k: 'portal', p: projectId, exp: now + PORTAL_DAYS * 86400000 }, portalKey(key));
}
export function readPortalToken(token, key, now = Date.now()) {
  const t = verify(token, portalKey(key), now);
  return t && t.k === 'portal' && typeof t.p === 'string' ? t : null;
}

export function canSendProof(item) {
  return ['salesrev', 'proofwait'].includes(item.step);
}

// What the customer's choice does. Pure, so it can be tested.
export function decideProof(item, decision, { checks = [], notes = '' } = {}) {
  if (item.step !== 'proofwait') throw new Error('this proof is not waiting for approval');
  if (decision === 'approve') {
    const ticked = new Set(checks);
    if (MUST_TICK_ALL && !APPROVAL_CHECKS.every((c) => ticked.has(c))) throw new Error('please tick every box before approving');
    return { to: 'files', note: 'Approved by the customer in the Order Portal.' };
  }
  if (decision === 'changes') {
    const n = String(notes || '').trim();
    if (n.length < 3) throw new Error('please tell us what to change');
    return { to: 'indesign', note: `Changes requested: ${n.slice(0, 1000)}` };
  }
  throw new Error('unknown choice');
}

function proofArt(item, proof) {
  // A simple drawn stand-in for the proof file (the real portal shows the uploaded PDF/image).
  return `<svg viewBox="0 0 320 180" role="img" aria-label="Proof preview: ${esc(proof.file)}" style="width:100%;max-width:420px;height:auto;border:1px solid #e3e7ee;border-radius:10px;background:#fff">
    <rect x="20" y="30" width="280" height="110" rx="6" fill="#16213a"/><text x="160" y="82" text-anchor="middle" fill="#fff" font-family="sans-serif" font-size="18" font-weight="700">${esc(String(item.customer || '').slice(0, 26))}</text>
    <text x="160" y="108" text-anchor="middle" fill="#c9d1e0" font-family="sans-serif" font-size="11">${esc(String(item.name).slice(0, 40))}</text>
    <text x="160" y="164" text-anchor="middle" fill="#5a6478" font-family="sans-serif" font-size="10">Proof v${proof.v} · ${esc(proof.file)}</text></svg>`;
}

export const PROOF_OPTS = [
  ['remind', 'Remind daily at 9 AM', 'until approved or changes are requested', true],
  ['calltask', 'After 3 reminders, add a call task', 'for the salesperson', true],
  ['checklist', 'Approval checklist', 'customer confirms spelling, sizes and colors', true],
  ['record', 'Record who approved', 'name, date and time saved to the Activity log', true],
  ['watermark', 'Watermark the proof', '“PROOF – NOT FOR PRODUCTION”', true],
  ['password', 'Password-protect the link', 'for sensitive projects', false],
];
export function readProofOpts(f = {}) {
  const extra = String(f.cc || '').trim();
  if (extra && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(extra)) throw new Error('the extra approver email does not look right');
  return { approval: ['everyone', 'any', 'order'].includes(f.approval) ? f.approval : 'everyone', cc: extra, subject: String(f.subject || '').trim().slice(0, 200), ...Object.fromEntries(PROOF_OPTS.map(([k]) => [k, k === 'record' ? true : f[k] === 'on'])) };
}
export function sendProofPage({ user, item, project, contact, proof, portalUrl, flash, saved = null }) {
  const st = stepById(item.step);
  const resend = item.step === 'proofwait';
  const first = (contact.name || '').split(' ')[0] || 'there';
  const me = String((user && user.name) || '').split(' ')[0] || 'The FASTSIGNS team';
  const v = proof.v;
  const TPL = {
    ready: `Hi ${first},\n\nYour proof for ${item.name} is ready. Please review it and approve or mark any changes here: [Review your proof]\n\nThanks,\n${me}`,
    revised: `Hi ${first},\n\nYour updated proof (v${v}) for ${item.name} is ready with the changes you asked for. Please review it and approve or mark any changes here: [Review your proof]\n\nThanks,\n${me}`,
    rush: `Hi ${first},\n\nYour proof for ${item.name} is ready. To keep your date, we need your approval today if possible: [Review your proof]\n\nThanks,\n${me}`,
  };
  const o = saved || {};
  const optOn = (k, d) => (saved ? !!o[k] : d);
  const inp = 'font:inherit;font-size:13px;border:1px solid #d5dbe5;border-radius:8px;padding:0 10px;min-height:36px';
  const body = `<div class="wrap"><div class="bar" style="padding:14px 0"><a href="/projects/${esc(project.id)}?mode=demo">← ${esc(project.name)}</a></div>
  ${flash ? `<div class="note" style="background:#e6f2ec;color:#1f6a43">${esc(flash)}</div>` : ''}
  <div class="panel" style="max-width:860px;padding:0;overflow:hidden"><div style="display:flex;align-items:baseline;gap:8px;background:#16213a;color:#fff;padding:10px 14px"><h1 style="margin:0;font-size:16px">${resend ? 'Send the Proof Again' : 'Send Proof'}</h1><span style="font-size:12px;color:#c9d1e0">${esc(item.ref || '')} · ${esc(project.company || project.name || '')}</span></div>
  <div style="padding:14px;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr);gap:16px;align-items:start">
    <div style="display:flex;flex-direction:column;gap:8px">${proofArt(item, proof)}<div style="font-size:12px;color:var(--mute)">${esc(item.name)} · v${esc(String(v))} · now: ${esc(st?.name || '')}</div></div>
    <form method="post" action="/items/${esc(item.id)}/send-proof" style="display:flex;flex-direction:column;gap:10px">
      ${['salesrev', 'proofwait'].includes(item.step) ? '<div style="display:flex;gap:8px;align-items:center;background:#e6f2ec;border-radius:8px;padding:6px 10px;font-size:12px;color:#1f6a43"><b>Proof review passed</b> · spelling, sizes, bleed, colors</div>' : ''}
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;border-bottom:1px solid #eef1f5;padding-bottom:8px"><span style="font-size:12px;color:var(--mute);width:28px">To</span><span style="display:inline-flex;align-items:center;background:#f0f2f6;border-radius:14px;padding:0 10px;min-height:28px;font-size:12px;font-weight:600" title="${esc(contact.email || '')}">${esc(contact.name || contact.email || 'Customer')}</span><input type="hidden" name="to" value="${esc(contact.email || '')}"><label style="display:flex;align-items:center;gap:4px;font-size:12px">+ Add<input name="cc" type="email" value="${esc(o.cc || '')}" placeholder="another approver" style="${inp};min-height:28px;width:170px"></label><label style="margin-left:auto;display:flex;align-items:center;gap:4px;font-size:11px;color:var(--mute)">Approval<select name="approval" style="${inp};min-height:28px">${[['everyone', 'Everyone'], ['any', 'Any one'], ['order', 'In order']].map(([k, l]) => `<option value="${k}" ${(o.approval || 'everyone') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><span style="font-size:12px;font-weight:700;color:#3d4658">Email</span><label style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--mute)">Template<select id="sp-tpl" style="${inp};min-height:28px"><option value="ready">Proof ready</option><option value="revised" ${v > 1 ? 'selected' : ''}>Revised proof</option><option value="rush">Rush proof</option></select></label></div>
      <label style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)" for="sp-sub">Subject</label><input id="sp-sub" name="subject" value="${esc(o.subject || `Your proof is ready: ${project.company ? project.company + ' ' : ''}${item.name} (v${v})`)}" style="${inp}">
      <label style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)" for="sp-msg">Message</label><textarea id="sp-msg" name="message" rows="7" style="font:inherit;font-size:13px;border:1px solid #d5dbe5;border-radius:8px;padding:8px 10px;line-height:1.45">${esc(v > 1 ? TPL.revised : TPL.ready)}</textarea>
      <div style="font-size:11px;color:var(--mute)">The button opens ${esc(project.company || 'the customer')}’s secure order page.</div>
      <details style="border:1px solid #e3e7ee;border-radius:8px"><summary style="cursor:pointer;padding:8px 10px;font-size:12px;font-weight:700;color:#3d4658">Follow-Up and Approval Options</summary><div style="padding:2px 12px 10px;display:flex;flex-direction:column;gap:8px">${PROOF_OPTS.map(([k, l, h, d]) => `<label style="display:flex;align-items:flex-start;gap:8px;font-size:12px"><input type="checkbox" name="${k}" ${optOn(k, d) ? 'checked' : ''} ${k === 'record' ? 'disabled checked' : ''} style="width:15px;height:15px;margin-top:1px;accent-color:#a8343f"><span><b>${esc(l)}</b> <span style="color:var(--mute)">${esc(h)}</span></span></label>`).join('')}<span style="font-size:11px;color:var(--mute)">Reminders and call tasks start once customer email sending is turned on.</span></div></details>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;border-top:1px solid #eef1f5;padding-top:10px"><a href="${esc(portalUrl)}" target="_blank" rel="noopener" style="font-size:13px;font-weight:600">Preview what ${esc(first)} sees</a><button class="btn primary">${resend ? 'Send Again' : 'Send Proof'}</button></div>
      <p style="font-size:12px;color:var(--mute);margin:0">Test copy: no email is sent.</p>
    </form>
  </div></div></div>
  <script type="application/json" id="sp-tpl-data">${JSON.stringify(TPL).replace(/</g, '\\u003c')}</script>`;
  return page({ title: 'Send Proof', user, tab: 'Design', mode: 'demo', body });
}

// The customer's page. Plain, mobile-first, no staff navigation.
export function portalPage({ project, items, token, flash, error, extras = '', side = '', proofLinks = {} }) {
  const waiting = items.filter((i) => i.step === 'proofwait');
  const others = items.filter((i) => i.step !== 'proofwait');
  const card = (it) => {
    const proof = latestProof(it.id);
    const checks = APPROVAL_CHECKS.map((c, n) => `<label style="display:flex;gap:10px;align-items:flex-start;min-height:36px;font-size:15px"><input type="checkbox" name="check${n}" value="${esc(c)}" style="width:20px;height:20px;margin-top:2px;accent-color:#a8343f"> <span>${esc(c)}</span></label>`).join('');
    return `<section style="border:1px solid #e3e7ee;border-radius:12px;padding:16px;background:#fff;display:flex;flex-direction:column;gap:12px">
      <h2 data-free style="margin:0;font-size:18px">${esc(it.name)}</h2>
      <div style="font-size:13px;color:#5a6478">Proof version ${(proofLinks[it.id] && proofLinks[it.id].v) || proof.v}${it.revision ? ` · revision ${it.revision}` : ''}</div>
      ${proofArt(it, proof)}${proofLinks[it.id] ? `<a href="${esc(proofLinks[it.id].link)}" target="_blank" rel="noopener" style="font-weight:700">Open the Full Proof</a>` : ''}
      <form method="post" action="/p/${esc(token)}/items/${esc(it.id)}" style="display:flex;flex-direction:column;gap:6px">
        <input type="hidden" name="decision" value="approve">
        <div style="font-weight:700;font-size:14px;margin-top:4px">Before you approve</div>${checks}
        <button style="font:inherit;font-weight:700;font-size:16px;min-height:48px;border:0;border-radius:10px;background:#1f6a43;color:#fff;cursor:pointer;margin-top:6px">Approve This Proof</button>
      </form>
      <details><summary style="cursor:pointer;font-weight:600;min-height:40px;display:flex;align-items:center">Ask for Changes Instead</summary>
        <form method="post" action="/p/${esc(token)}/items/${esc(it.id)}" style="display:flex;flex-direction:column;gap:8px;margin-top:6px">
          <input type="hidden" name="decision" value="changes">
          <label for="n-${esc(it.id)}" style="font-size:14px">What should we change?</label>
          <textarea id="n-${esc(it.id)}" name="notes" rows="4" required minlength="3" style="font:inherit;font-size:15px;border:1px solid #d5dbe5;border-radius:8px;padding:8px"></textarea>
          <button style="font:inherit;font-weight:700;min-height:44px;border:1px solid #a8343f;border-radius:10px;background:#fff;color:#a8343f;cursor:pointer">Send My Changes</button>
        </form></details>
    </section>`;
  };
  const status = (it) => {
    const label = { files: 'Approved, in production prep', indesign: 'Our designers are working on it', queue: 'Waiting for a designer', salesrev: 'Being checked before we send it', proofqc: 'Being checked before we send it' }[it.step] || stepById(it.step)?.name || it.step;
    return `<li style="padding:10px 0;border-top:1px solid #eef1f5;display:flex;justify-content:space-between;gap:10px"><span>${esc(it.name)}</span><span style="color:#5a6478;text-align:right">${esc(label)}</span></li>`;
  };
  // Order progress like the mockup: Estimate → Proofs → Production → Ready → Complete.
  const STEPS_P = [['Approved', () => true], ['Proofs', (i) => !['prep', 'queue', 'indesign', 'proofqc', 'salesrev', 'proofwait'].includes(i.step)], ['Production', (i) => ['built', 'done'].includes(i.step)], ['Ready', (i) => ['built', 'done'].includes(i.step)], ['Complete', (i) => i.step === 'done']];
  const doneN = STEPS_P.filter(([, f]) => items.length && items.every(f)).length;
  const prog = STEPS_P.map(([label], n) => { const done = n < doneN; const cur = n === doneN; return `<li><span class="b" style="background:${done ? '#1f6a43' : cur ? '#16213a' : '#e3e7ee'}"></span><span style="font-weight:${cur ? 700 : 500};color:${done ? '#1f6a43' : cur ? '#1b2436' : '#5a6478'}">${label}</span></li>`; }).join('');
  const sp = project.salesperson || '';
  const due = project.due ? new Date(project.due + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' }) : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your order · FASTSIGNS of Northern Kentucky</title>
  <style>body{margin:0;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f4f6f9;color:#1b2436}main{max-width:1120px;margin:0 auto;padding:22px 16px 40px;display:flex;flex-direction:column;gap:16px}.pg{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:16px;align-items:start}.pg>div{display:flex;flex-direction:column;gap:16px;min-width:0}.pg>aside{display:flex;flex-direction:column;gap:16px;min-width:0;position:sticky;top:12px}.sum{background:#fff;border:1px solid #e3e7ee;border-radius:12px;padding:14px 16px;display:flex;flex-direction:column;gap:8px}.sum dl{display:grid;grid-template-columns:auto 1fr;gap:6px 12px;margin:0;font-size:14px}.sum dt{color:#5a6478}.sum dd{margin:0;font-weight:600;text-align:right}@media(max-width:880px){.pg{grid-template-columns:minmax(0,1fr)}.pg>aside{position:static}}a{color:#1d4f91}
  .ph{background:#fff;border-bottom:1px solid #e3e7ee}.ph>div{max-width:1000px;margin:0 auto;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}.brand{display:flex;align-items:center;gap:14px}.brand b{font-weight:800;font-style:italic;font-size:20px;color:#16213a}.brand span{font-size:13px;color:#5a6478;border-left:1px solid #e3e7ee;padding-left:14px}.q{font-size:13px;color:#3d4658}.sec{display:inline-flex;align-items:center;gap:6px;color:#1f6a43;font-weight:600;font-size:13px}
  .prog{list-style:none;margin:0;padding:0;display:flex;gap:4px}.prog li{display:flex;flex-direction:column;align-items:center;gap:4px;flex:1 1 0;text-align:center;font-size:11px}.prog .b{width:100%;height:6px;border-radius:3px}</style></head>
  <body><header class="ph"><div><div class="brand"><b>FASTSIGNS®</b><span>FASTSIGNS of Northern Kentucky</span></div><div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap"><span class="q">Questions? ${sp ? `<b>${esc(sp)}</b> · ` : ''}<a href="tel:+18595550100" style="font-weight:600">(859) 555-0100</a></span><span class="sec"><svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path></svg>Secure link${project.contact ? ' for ' + esc(project.contact) : ''}</span></div></div></header>
  <main><div><h1 data-free style="margin:0;font-size:24px">${esc(project.company)}${project.orderId ? ' · Order ' + esc(project.orderId) : ''}</h1><p style="margin:4px 0 0;font-size:14px;color:#5a6478">${esc(project.name)}${due ? ' · due ' + esc(due) : ''}</p></div>
  <ol class="prog" aria-label="Order progress">${prog}</ol>
  <div class="pg"><div>
  ${flash ? `<div role="status" style="background:#e6f2ec;color:#1f6a43;border-radius:10px;padding:12px">${esc(flash)}</div>` : ''}
  ${error ? `<div role="alert" style="background:#fbeaec;color:#8f2a34;border-radius:10px;padding:12px">${esc(error)}</div>` : ''}
  ${waiting.length ? `<h2 style="margin:4px 0 0;font-size:16px">${waiting.length === 1 ? 'A Proof Is' : `${waiting.length} Proofs Are`} Waiting for You</h2>${waiting.map(card).join('')}` : '<div style="background:#fff;border:1px solid #e3e7ee;border-radius:12px;padding:16px">No proofs are waiting for you right now. We will email you when the next one is ready.</div>'}
  ${extras}
  ${others.length ? `<section style="background:#fff;border:1px solid #e3e7ee;border-radius:12px;padding:6px 16px"><h2 style="font-size:15px;margin:10px 0">Everything on This Order</h2><ul style="list-style:none;margin:0;padding:0">${others.map(status).join('')}</ul></section>` : ''}
  </div><aside aria-label="Order summary"><section class="sum"><h2 style="margin:0;font-size:15px">Order Summary</h2><dl>${project.orderId ? `<dt>Order</dt><dd>${esc(project.orderId)}</dd>` : ''}<dt>Status</dt><dd>${esc((STEPS_P[Math.min(doneN, STEPS_P.length - 1)] || [''])[0])}</dd>${due ? `<dt>Due</dt><dd>${esc(due)}</dd>` : ''}${project.contact ? `<dt>Ordered by</dt><dd>${esc(project.contact)}</dd>` : ''}${Number(project.total) ? `<dt>Order total</dt><dd>$${Number(project.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</dd>` : ''}</dl>${sp ? `<div style="font-size:13px;color:#3d4658;border-top:1px solid #eef1f5;padding-top:8px">Questions? <b>${esc(sp)}</b> · <a href="tel:+18595550100">(859) 555-0100</a></div>` : ''}</section>${side}</aside></div>
  <p style="font-size:12px;color:#5a6478;text-align:center">Questions? Call (859) 555-0100 or reply to the proof email.</p></main></body></html>`;
}
