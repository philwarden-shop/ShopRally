// Prospect claim rules: a business we've never worked with belongs to one salesperson at a time,
// and only while they are actually working it. Defaults match Admin > Prospect claim rules (Phil, Nov 10).
export const CLAIM_RULES = {
  maxOpen: 25,          // open prospects per salesperson
  maxPerWeek: 10,       // new claims per week (Mon-Sun)
  firstTouchBizDays: 2, // real touch (call, visit, personal email) after claiming
  keepAliveDays: 14,    // a real touch at least this often
  managerAlertDays: 3,  // extra days after a missed keep-alive before the manager is alerted
  progressDays: 45,     // meeting, site visit or quote within this many days of claiming
  extensionDays: 30,    // one manager extension
  reclaimCooldownDays: 90,
};

const DAY = 86400000;
const d = (x) => new Date(typeof x === 'string' && x.length === 10 ? x + 'T12:00:00Z' : x);
const days = (a, b) => Math.floor((d(b) - d(a)) / DAY);
const REAL_TOUCH = new Set(['call', 'visit', 'personal_email', 'meeting', 'site_visit', 'quote']);
const PROGRESS = new Set(['meeting', 'site_visit', 'quote']);

export function addBusinessDays(date, n) {
  const t = d(date);
  let left = n;
  while (left > 0) { t.setUTCDate(t.getUTCDate() + 1); const wd = t.getUTCDay(); if (wd !== 0 && wd !== 6) left--; }
  return t.toISOString().slice(0, 10);
}
const weekStart = (date) => { const t = d(date); const wd = (t.getUTCDay() + 6) % 7; t.setUTCDate(t.getUTCDate() - wd); return t.toISOString().slice(0, 10); };

// claims: [{ business, owner, claimedAt, touches: [{ type, at }], extendedDays, releasedAt, releasedBy }]
// Can `person` claim `business` today? Returns { ok, reason, say }.
export function canClaim({ person, business, claims, today, rules = CLAIM_RULES }) {
  const open = claims.filter((c) => !c.releasedAt);
  const held = open.find((c) => c.business === business);
  if (held) return held.owner === person ? { ok: false, reason: 'already_yours', say: 'This one is already yours.' } : { ok: false, reason: 'taken', say: `${held.owner} is working this one.` };
  const mine = open.filter((c) => c.owner === person);
  if (mine.length >= rules.maxOpen) return { ok: false, reason: 'at_limit', say: `You're at your ${rules.maxOpen}-prospect limit. Close out or release one first.` };
  const ws = weekStart(today);
  const thisWeek = claims.filter((c) => c.owner === person && c.claimedAt >= ws).length;
  if (thisWeek >= rules.maxPerWeek) return { ok: false, reason: 'week_limit', say: `You've made ${rules.maxPerWeek} claims this week. More next Monday.` };
  const mineBefore = claims.filter((c) => c.business === business && c.owner === person && c.releasedAt).sort((a, b) => (a.releasedAt < b.releasedAt ? 1 : -1))[0];
  if (mineBefore && days(mineBefore.releasedAt, today) < rules.reclaimCooldownDays) {
    return { ok: false, reason: 'cooldown', say: `You released this on ${mineBefore.releasedAt}. Someone else gets a turn until ${new Date(d(mineBefore.releasedAt).getTime() + rules.reclaimCooldownDays * DAY).toISOString().slice(0, 10)}.` };
  }
  return { ok: true, reason: 'ok', say: 'Claimed.' };
}

// Where one claim stands today: what's due, and whether it should go back to the pool.
// Returns { state: 'ok'|'due'|'overdue'|'release', action: null|'remind'|'alert_manager'|'release', why, firstTouchBy, nextTouchBy, progressBy }
export function claimStatus(claim, today, rules = CLAIM_RULES) {
  const real = (claim.touches || []).filter((t) => REAL_TOUCH.has(t.type)).sort((a, b) => (a.at < b.at ? -1 : 1));
  const firstTouchBy = addBusinessDays(claim.claimedAt, rules.firstTouchBizDays);
  const progressBy = new Date(d(claim.claimedAt).getTime() + (rules.progressDays + (claim.extendedDays || 0)) * DAY).toISOString().slice(0, 10);
  const madeProgress = real.some((t) => PROGRESS.has(t.type));
  const last = real.length ? real[real.length - 1].at : null;
  const nextTouchBy = last ? new Date(d(last).getTime() + rules.keepAliveDays * DAY).toISOString().slice(0, 10) : firstTouchBy;
  const base = { firstTouchBy, nextTouchBy, progressBy };
  if (!real.length && today > firstTouchBy) return { ...base, state: 'release', action: 'release', why: `No real first touch by ${firstTouchBy}.` };
  if (!madeProgress && today > progressBy) return { ...base, state: 'release', action: 'release', why: `No meeting, site visit or quote by ${progressBy}.` };
  if (last && today > nextTouchBy) {
    const late = days(nextTouchBy, today);
    return { ...base, state: 'overdue', action: late > rules.managerAlertDays ? 'alert_manager' : 'remind', why: `No real touch since ${last}.` };
  }
  if (today === nextTouchBy || (!real.length && today <= firstTouchBy)) return { ...base, state: 'due', action: 'remind', why: real.length ? `Touch due ${nextTouchBy}.` : `First touch due ${firstTouchBy}.` };
  return { ...base, state: 'ok', action: null, why: madeProgress ? 'Moving.' : `Needs a meeting, visit or quote by ${progressBy}.` };
}

// Released businesses go to the next salesperson with room, in turn (round robin, skipping cooldowns).
export function nextOwner({ business, team, claims, today, after = null, rules = CLAIM_RULES }) {
  const order = after ? [...team.slice(team.indexOf(after) + 1), ...team.slice(0, team.indexOf(after) + 1)] : team;
  return order.find((p) => canClaim({ person: p, business, claims, today, rules }).ok) || null;
}
