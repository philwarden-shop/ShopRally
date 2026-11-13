// Stage time left (mockup pill "Stage time left · 1 day of 4 in In production"). SalesMax records the day a project
// enters each stage (lane-since config) and compares it with the stage target set in Admin › Work.
export const LANE_NAMES = { prospect: 'Prospect', estimate: 'Estimate', progress: 'In production', built: 'Built', complete: 'Complete' };
export const LANE_TARGET_DEFAULTS = { prospect: 14, estimate: 7, progress: 10, built: 3 };
const days = (a, b) => Math.round((new Date(b + 'T12:00:00Z') - new Date(a + 'T12:00:00Z')) / 86400000);
export function trackLanes(since = {}, projects = [], today) {
  let changed = false; const next = { ...since };
  for (const p of projects) { const cur = next[p.id]; if (!cur || cur.lane !== p.lane) { next[p.id] = { lane: p.lane, since: today, from: cur ? cur.lane : null }; changed = true; } }
  return { since: next, changed };
}
export function targetsFrom(adm = {}) {
  const t = { ...LANE_TARGET_DEFAULTS };
  for (const k of Object.keys(t)) { const v = Number(adm[`target_${k}`]); if (Number.isFinite(v) && v > 0) t[k] = v; }
  return t;
}
export function stageLeft(rec, today, targets = LANE_TARGET_DEFAULTS) {
  if (!rec || !targets[rec.lane]) return null;
  const used = Math.max(0, days(rec.since, today)); const target = targets[rec.lane];
  return { lane: rec.lane, used, target, left: target - used, since: rec.since };
}
export function stagePill(s) {
  if (!s) return '';
  const over = s.left < 0; const tight = !over && s.left <= 1;
  const [bg, fg] = over ? ['#fbeaec', '#8f2a34'] : tight ? ['#fdeedf', '#874511'] : ['#e6f2ec', '#1f6a43'];
  const big = over ? `${-s.left} day${s.left === -1 ? '' : 's'} over` : `${s.left} day${s.left === 1 ? '' : 's'}`;
  return `<div style="display:flex;justify-content:center;margin-bottom:-4px"><div title="In this stage since ${s.since}" style="display:flex;align-items:baseline;gap:8px;background:${bg};color:${fg};border-radius:16px;padding:3px 12px"><span style="font-size:12px;font-weight:600">${over ? 'Stage time' : 'Stage time left'}</span><span style="font-size:14px;font-weight:700">${big}</span><span style="font-size:12px">of ${s.target} in ${LANE_NAMES[s.lane] || s.lane}</span></div></div>`;
}
