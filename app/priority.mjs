// Strategic priority (mockup): 6 criteria scored 1-5 on the customer; score = total / 30 × 100; High ≥ 75, Med ≥ 50, else Low.
// A person can pin a level with a reason. Shown on the customer page and on every project card for that customer.
import { esc } from './views.mjs';
export const CRITERIA = [
  ['Scale', 'How big is the organization, facility or operation?'],
  ['Repeatability', 'Will they have recurring needs?'],
  ['Expandability', 'Could this lead to more work in other departments or sites?'],
  ['Multi-location', 'Do they run several facilities, branches or markets?'],
  ['Change activity', 'Are they growing, moving, renovating, rebranding or hiring?'],
  ['Access', 'Can we reach the people who decide?'],
];
export const levelOf = (n) => (n >= 75 ? 'High' : n >= 50 ? 'Med' : 'Low');
export function priorityOf(prof = {}) {
  const s = (prof.prio && Array.isArray(prof.prio.s)) ? prof.prio.s.map(Number) : null;
  if (!s || s.length !== 6 || s.some((x) => !(x >= 1 && x <= 5))) return null;
  const score = Math.round((s.reduce((a, b) => a + b, 0) / 30) * 100);
  const auto = levelOf(score);
  const level = prof.prio.override || auto;
  return { score, auto, level, pinned: !!prof.prio.override, note: prof.prio.note || '' };
}
export function mergePriority(prof = {}, f = {}) {
  const s = CRITERIA.map((_, n) => Number(f[`c${n}`]));
  if (s.some((x) => !(Number.isInteger(x) && x >= 1 && x <= 5))) throw new Error('score each question 1 to 5');
  const override = ['High', 'Med', 'Low'].includes(f.override) ? f.override : '';
  const note = String(f.note || '').trim().slice(0, 200);
  if (override && note.length < 3) throw new Error('say why you are pinning the priority');
  return { ...prof, prio: { s, override, note } };
}
export const PRIO_COLORS = { High: ['#fbeaec', '#8f2a34', '#e3a3aa'], Med: ['#fdf3dc', '#7a5600', '#e9cf8a'], Low: ['#eef0f4', '#3d4658', '#d5dbe5'] };
export function priorityCard(cid, prof = {}) {
  const p = priorityOf(prof);
  const s = (prof.prio && prof.prio.s) || [3, 3, 3, 3, 3, 3];
  const [bg, fg] = PRIO_COLORS[p ? p.level : 'Low'];
  return `<section class="rcard" aria-label="Strategic priority"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><h2>Strategic Priority</h2><span class="pill" style="background:${bg};color:${fg}">${p ? `${p.level} · ${p.score}${p.pinned ? ' · pinned' : ''}` : 'Not scored'}</span></div>
<details><summary style="cursor:pointer;font-size:13px;font-weight:600;color:#1d4f91">${p ? 'Change the Score' : 'Score This Customer'}</summary><form method="post" action="/customers/${esc(cid)}/priority" style="display:flex;flex-direction:column;gap:8px;margin-top:8px">${CRITERIA.map(([n, q], i) => `<label style="display:flex;justify-content:space-between;gap:8px;align-items:center;font-size:12px"><span><b>${n}</b><br><span style="color:var(--mute)">${q}</span></span><select name="c${i}" style="font:inherit;min-height:32px">${[1, 2, 3, 4, 5].map((v) => `<option ${Number(s[i]) === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label>`).join('')}
<label style="font-size:12px;display:flex;flex-direction:column;gap:4px">Pin the level (optional)<select name="override" style="font:inherit;min-height:32px"><option value="">Use the score</option>${['High', 'Med', 'Low'].map((l) => `<option ${prof.prio && prof.prio.override === l ? 'selected' : ''}>${l}</option>`).join('')}</select></label><label style="font-size:12px;display:flex;flex-direction:column;gap:4px">Why (needed when pinned)<input name="note" value="${esc((prof.prio && prof.prio.note) || '')}" style="font:inherit;min-height:32px;border:1px solid #d5dbe5;border-radius:6px;padding:0 6px"></label><button class="btn primary">Save Priority</button></form></details>${p && p.note ? `<div style="font-size:12px;color:var(--mute)">Pinned: ${esc(p.note)}</div>` : ''}</section>`;
}
