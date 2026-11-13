// Expected ready date (Phil, Nov 12): the LATEST of the velocity forecast and every vended line's expected date.
// A hard due date never shifts; if the expected date lands after it, sales, production and the manager are alerted.
// The customer sees the hard due date when there is one, otherwise the expected date (updates on its own).
import { esc } from './views.mjs';

export function expectedReady({ velocity, vended = [], hardDue = null }) {
  const sources = [{ label: 'Velocity forecast (shop workload)', date: velocity }, ...vended.filter((v) => v.date).map((v) => ({ label: `Vended: ${v.name}`, date: v.date }))].filter((s) => s.date);
  const expected = sources.reduce((a, s) => (s.date > a ? s.date : a), '');
  const late = !!(hardDue && expected && expected > hardDue);
  return { expected, sources, hardDue, late, customerDate: hardDue || expected };
}
const nice = (d) => (d ? new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }) : '');
export function expectedPanel(x, { who = 'the salesperson, production lead and manager' } = {}) {
  if (!x.expected) return '';
  const rows = [...(x.hardDue ? [{ label: 'Hard due date 🔒 (won’t shift)', date: x.hardDue, strong: true }] : []), ...x.sources].map((s) => `<div style="display:flex;justify-content:space-between;gap:12px;font-size:13px;padding:3px 0"><span style="color:var(--mute)">${esc(s.label)}</span><span style="${s.strong ? 'font-weight:700' : ''}${s.date === x.expected && x.late ? ';color:#a8343f;font-weight:700' : ''}">${esc(nice(s.date))}</span></div>`).join('');
  return `<section class="panel" aria-label="Expected ready date"><h2 style="margin:0 0 6px;font-size:15px">Expected Ready · ${esc(nice(x.expected))}</h2>${rows}
<p style="margin:6px 0 0;font-size:12px;color:var(--mute)">Expected = the latest of these. The customer sees ${x.hardDue ? 'the hard due date' : 'the expected date (updates on its own)'}.</p>
${x.late ? `<div role="alert" style="margin-top:8px;background:#fbeaec;color:#7e2630;border-radius:8px;padding:8px 10px;font-size:13px"><b>⚠ Expected ${esc(nice(x.expected))} is after the hard due date, ${esc(nice(x.hardDue))}.</b> Alert sent to ${esc(who)}.</div>` : ''}</section>`;
}
export function lateTasks(list, today) {
  return list.filter((x) => x.late).map((x) => ({ id: `late-${x.projectId}`, kind: 'task', title: `Late risk: ${x.name} expected ${nice(x.expected)}, hard due ${nice(x.hardDue)}`, customer: x.company, projectId: x.projectId, due: today, done: false, label: 'Hard due date' }));
}
