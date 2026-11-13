// Send Feedback (account menu): slide-in panel like the mockup, your earlier suggestions with status,
// and the owner's Feedback Inbox in Admin to set status (Under review / Planned / Shipped / Not planned).
import { page, esc } from './views.mjs';

export const FB_KINDS = [
  ['Idea', 'What would make SalesMax better for you?', 'When I finish a site visit, I would like it to text the customer a quick thank-you.'],
  ['Something Is Broken', 'What happened, and what did you expect?', 'I clicked ... and expected ... but ...'],
  ['Question', 'What do you want to know?', 'How do I ...?'],
];
const OLD = { 'Something is broken': 'Something Is Broken', Confusing: 'Question', Praise: 'Idea' };
export const FB_STATUS = { review: ['Under review', '#eef0f4', '#3d4658'], planned: ['Planned', '#e8f0fb', '#1d4f91'], shipped: ['Shipped', '#e6f2ec', '#1f6a43'], no: ['Not planned', '#fdf3dc', '#7a4e00'] };

export const safePath = (p) => { const s = String(p || ''); return /^\/[\w\-/.?=&%#]*$/.test(s) && !s.startsWith('//') && !s.startsWith('/feedback') ? s.slice(0, 200) : ''; };

export function addFeedback(list, f, { who, at, id = 'f' + Date.now().toString(36) }) {
  const kind = OLD[f.kind] || f.kind;
  if (!FB_KINDS.some(([k]) => k === kind)) throw new Error('pick what kind of feedback this is');
  const text = String(f.text || '').trim();
  if (text.length < 3) throw new Error('tell us a little more');
  return [{ id, kind, text: text.slice(0, 2000), page: f.withPage === 'off' ? '' : safePath(f.page), who, at, status: 'review' }, ...(list || [])].slice(0, 500);
}

export function setFeedbackStatus(list, f, { at }) {
  if (!FB_STATUS[f.status]) throw new Error('pick a status');
  let hit = false;
  const out = (list || []).map((x) => { if ((x.id || x.at) !== f.id) return x; hit = true; return { ...x, status: f.status, note: String(f.note ?? x.note ?? '').trim().slice(0, 300), statusAt: at }; });
  if (!hit) throw new Error('that suggestion is not here');
  return out;
}

const when = (iso) => new Date(iso).toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric' });
const pill = (st) => { const [l, bg, fg] = FB_STATUS[st || 'review'] || FB_STATUS.review; return `<span style="font-size:11px;font-weight:700;padding:3px 9px;border-radius:10px;background:${bg};color:${fg};white-space:nowrap">${l}</span>`; };
const firstLine = (t) => { const s = String(t).split(/\n/)[0]; return s.length > 70 ? s.slice(0, 67) + '…' : s; };

export function feedbackPage({ user, mine = [], flash = '', from = '', kind = 'Idea' }) {
  const back = safePath(from) || '/activities';
  const k0 = FB_KINDS.find(([k]) => k === kind) || FB_KINDS[0];
  const css = `<style>.fbk input{position:absolute;opacity:0;width:1px;height:1px}.fbk label{font-size:14px;font-weight:600;border:1px solid #d5dbe5;background:#fff;border-radius:8px;padding:0 14px;min-height:40px;display:inline-flex;align-items:center;cursor:pointer}.fbk input:checked+label{border-color:#a8343f;background:#fbeaec}.fbk input:focus-visible+label{outline:3px solid #1d4f91;outline-offset:2px}</style>`;
  const kinds = FB_KINDS.map(([k], n) => `<span><input type="radio" name="kind" id="fbk${n}" value="${esc(k)}" ${k === k0[0] ? 'checked' : ''} data-p="${esc(FB_KINDS[n][1])}" data-s="${esc(FB_KINDS[n][2])}"><label for="fbk${n}">${esc(k)}</label></span>`).join('');
  const minesHtml = mine.length ? mine.slice(0, 10).map((m) => `<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;border:1px solid #e3e7ee;border-radius:10px;padding:10px 12px"><span><span style="display:block;font-size:14px;font-weight:600">${esc(firstLine(m.text))}</span><span style="font-size:12px;color:var(--mute)">${esc(m.kind)} · Sent ${esc(when(m.at))}${m.note ? ' · ' + esc(m.note) : ''}</span></span>${pill(m.status)}</div>`).join('') : '<div style="font-size:13px;color:var(--mute)">Nothing yet. Your suggestions and their status show here.</div>';
  const body = `${css}<div style="display:flex;justify-content:flex-end;min-height:calc(100vh - 60px);background:#5c6475">
<a href="${esc(back)}" aria-label="Close and go back" style="flex:1 1 auto;min-width:0;background:rgba(22,33,58,.55);display:block"></a>
<section role="dialog" aria-labelledby="fb-title" style="flex:0 1 520px;min-width:0;background:#fff;display:flex;flex-direction:column;box-shadow:-8px 0 24px rgba(22,33,58,.25)">
<div style="display:flex;justify-content:space-between;align-items:center;padding:20px 24px;border-bottom:1px solid #e3e7ee"><div><h1 id="fb-title" style="margin:0;font-size:20px">Send Feedback</h1><div style="font-size:12px;color:var(--mute);margin-top:2px">Goes straight to the SalesMax team</div></div><a href="${esc(back)}" aria-label="Close" style="display:flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:8px;color:#3d4658;font-size:22px;text-decoration:none">×</a></div>
${flash ? `<div class="note" style="margin:12px 24px 0;background:#e6f2ec;color:#1f6a43">${esc(flash)}</div>` : ''}
<form method="post" action="/feedback" id="fbform" style="flex:1 1 auto;padding:20px 24px;display:flex;flex-direction:column;gap:18px"><input type="hidden" name="page" value="${esc(safePath(from))}">
<fieldset style="border:0;margin:0;padding:0"><legend style="font-size:13px;font-weight:600;padding:0;margin-bottom:8px">What Kind?</legend><div class="fbk" style="display:flex;flex-wrap:wrap;gap:8px">${kinds}</div></fieldset>
<label style="display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:600"><span id="fbp">${esc(k0[1])}</span><textarea name="text" rows="6" required minlength="3" maxlength="2000" placeholder="${esc(k0[2])}" style="font:inherit;font-size:14px;font-weight:400;border:1px solid #d5dbe5;border-radius:8px;padding:10px 12px;resize:vertical"></textarea></label>
${safePath(from) ? `<label style="display:flex;align-items:flex-start;gap:10px;font-size:14px;min-height:44px"><input type="checkbox" name="withPage" value="on" checked style="width:18px;height:18px;margin-top:2px;accent-color:#a8343f" data-toggle-disable="#fbform [name=page]"><span><span style="font-weight:600;display:block">Include the page you were on</span><span style="font-size:13px;color:var(--mute)">Page: ${esc(safePath(from))}. No customer details are sent.</span></span></label>` : ''}
<div style="background:#f3f0fa;border-radius:10px;padding:12px 14px;font-size:13px;color:#3d4658;line-height:1.5"><b style="color:#4a3373">What happens next:</b> the SalesMax team reads every note, groups it with similar requests and ranks it. A person approves every change before it ships, and the status below updates when it does.</div>
<section aria-labelledby="mine-h" style="display:flex;flex-direction:column;gap:8px"><h2 id="mine-h" style="margin:0;font-size:14px">Your Earlier Suggestions</h2>${minesHtml}</section>
</form>
<div style="display:flex;justify-content:flex-end;gap:10px;padding:16px 24px;border-top:1px solid #e3e7ee"><a class="btn" href="${esc(back)}" style="min-height:44px">Cancel</a><button class="btn primary" form="fbform" style="min-height:44px;padding:0 22px">Send</button></div>
</section></div>
`;
  return page({ title: 'Send Feedback', user, tab: '', body });
}

export function feedbackInbox({ user, list = [], status = '', flash = '' }) {
  const counts = Object.fromEntries(Object.keys(FB_STATUS).map((k) => [k, list.filter((x) => (x.status || 'review') === k).length]));
  const shown = list.filter((x) => !status || (x.status || 'review') === status);
  const chips = [['', `All (${list.length})`], ...Object.entries(FB_STATUS).map(([k, [l]]) => [k, `${l} (${counts[k]})`])].map(([k, l]) => `<a href="/admin/feedback${k ? '?status=' + k : ''}" aria-current="${status === k}" style="font-size:13px;font-weight:600;border-radius:16px;padding:6px 12px;text-decoration:none;border:1px solid ${status === k ? '#16213a' : '#d5dbe5'};background:${status === k ? '#16213a' : '#fff'};color:${status === k ? '#fff' : 'var(--ink)'}">${esc(l)}</a>`).join('');
  const rows = shown.slice(0, 200).map((x) => { const id = x.id || x.at; return `<div class="panel" style="display:flex;flex-direction:column;gap:8px"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><b>${esc(OLD[x.kind] || x.kind)}</b><span style="font-size:12px;color:var(--mute)">${esc(x.who || '')} · ${esc(when(x.at))}${x.page ? ' · from ' + esc(x.page) : ''}</span><span style="margin-left:auto">${pill(x.status)}</span></div><div style="white-space:pre-wrap;font-size:14px">${esc(x.text)}</div><form method="post" action="/admin/feedback" style="display:flex;gap:8px;flex-wrap:wrap;align-items:end"><input type="hidden" name="id" value="${esc(id)}"><label style="display:flex;flex-direction:column;font-size:12px">Status<select name="status" style="font:inherit;min-height:36px">${Object.entries(FB_STATUS).map(([k, [l]]) => `<option value="${k}" ${(x.status || 'review') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label><label style="display:flex;flex-direction:column;font-size:12px;flex:1 1 240px">Note the person sees<input name="note" value="${esc(x.note || '')}" maxlength="300" placeholder="e.g. December release" style="font:inherit;min-height:36px;border:1px solid #d5dbe5;border-radius:8px;padding:0 8px"></label><button class="btn">Save Status</button></form></div>`; }).join('');
  const body = `<div class="wrap" style="max-width:860px"><div class="bar" style="padding:14px 0"><h1>Feedback Inbox</h1></div>${flash ? `<div class="note" style="margin:0 0 12px">${esc(flash)}</div>` : ''}<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">${chips}</div>${rows || '<div class="panel" style="color:var(--mute)">No feedback here yet.</div>'}</div>`;
  return page({ title: 'Feedback Inbox', user, tab: '', body });
}
