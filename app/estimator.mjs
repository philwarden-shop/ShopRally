// AI Estimator v1: turns site-survey lines (and scope notes) into a draft on the Build estimate screen.
// v1 is the rules engine the AI will feed: each survey line is matched to a ready CoreBridge part for THIS
// location's catalog, sizes are read from the survey (or the text), and the production modifier is added.
// It never guesses a price or a size: CoreBridge prices it, and anything it can't place is listed for a person
// (vended work goes to a vendor RFQ; parts that aren't "ready" in CoreBridge are flagged).
// Next: learn the rules from this location's 2-3 years of order history instead of the hand list below.
import { catalog } from './builder.mjs';

// Ordered: first match wins. `part` is a CoreBridge part id (fs0226 catalog, Nov 10 pull).
// kind: 'make' = we produce it (priced by CoreBridge); 'vendor' = needs a vendor quote first (RFQ).
export const RULES = [
  { re: /channel letter/i, part: 176, kind: 'vendor', why: 'Channel letters are vended.' },
  { re: /(building|exterior|dimensional|lobby|wall)\b.*\b(letters|logo)|\b(letters|logo)\b.*dimensional/i, part: 566, kind: 'vendor', why: 'Dimensional letters and logos are vended.' },
  { re: /monument.*(face|panel)/i, part: 515, kind: 'make', why: 'Monument faces: 3/16" white polycarbonate.' },
  { re: /monument/i, part: 562, kind: 'vendor', why: 'A full monument sign is vended.' },
  { re: /\bada\b|braille|tactile|room id/i, part: null, kind: 'person', why: 'ADA signs (engraved, braille) are not a ready part in CoreBridge yet.' },
  { re: /window.*(perf|graphic|wrap)|perforat/i, part: 137, kind: 'make', why: 'Window graphics: standard 65/35 window perf.' },
  { re: /(window|door).*(vinyl|hours|lettering|decal)|hours.*vinyl/i, part: 222, kind: 'make', why: 'Hours and door lettering: cut calendered vinyl.' },
  { re: /(dock|door|aisle|rack).*(number|letter)/i, part: 222, kind: 'make', why: 'Numbers and lettering: cut calendered vinyl.' },
  { re: /wall (graphic|mural|wrap)|mural/i, part: 320, kind: 'make', why: 'Wall graphics: 3M 480 Envision printed vinyl.' },
  { re: /floor (graphic|decal)/i, part: 425, kind: 'make', why: 'Floor graphics: sidewalk-grade grip film.' },
  { re: /banner/i, part: 45, kind: 'make', why: 'Banner: 13 oz matte.' },
  { re: /yard sign/i, part: 216, kind: 'make', why: 'Yard signs with stakes.' },
  { re: /safety|wayfinding|directional|parking|regulat/i, part: 55, kind: 'make', why: 'Safety and wayfinding: .040 aluminum.' },
  { re: /decal|sticker|label/i, part: 226, kind: 'make', why: 'Printed decal on calendered vinyl.' },
  { re: /(sign|panel)\b/i, part: 89, kind: 'make', why: 'General rigid sign: 3 mm ACM.' },
];

const INSTALL_PART = 469; // Service - (STAFF) Off-Site Installation / Removal
const PRODUCTION_MODS = new Set([233, 235, 244]); // BANNERS / RIGID / VINYL production modifiers

// Read a size in inches from text: "24 x 36", "24x36 in", "8 ft x 3 ft", "40 ft" (width only).
export function parseSize(text = '') {
  const t = String(text).toLowerCase().replace(/[”"]/g, ' in').replace(/[’']/g, ' ft');
  const unit = (n, u) => Math.round(Number(n) * (/^f|^'/.test(u || '') ? 12 : 1) * 100) / 100;
  const two = t.match(/(\d+(?:\.\d+)?)\s*(ft|feet|in|inch(?:es)?)?\s*[x×by]+\s*(\d+(?:\.\d+)?)\s*(ft|feet|in|inch(?:es)?)?/);
  if (two) { const u = two[4] || two[2]; return { w: unit(two[1], two[2] || u), h: unit(two[3], u) }; }
  const one = t.match(/(\d+(?:\.\d+)?)\s*(ft|feet|foot)\b/);
  if (one) return { w: unit(one[1], 'ft'), h: 0 };
  return { w: 0, h: 0 };
}

// Draft one survey line. Returns { from, kind, part, qty, w, h, mods, why, needs[] }.
export function draftLine(line, cat = catalog()) {
  const text = [line.description, line.notes].filter(Boolean).join(' ');
  const rule = RULES.find((r) => r.re.test(text));
  const from = [line.description, line.location ? `(${line.location})` : ''].filter(Boolean).join(' ');
  const qty = Math.max(1, Math.round(Number(line.qty) || 1));
  if (!rule) return { from, kind: 'person', part: null, qty, why: 'No matching part. A person picks it.', needs: ['part'] };
  const part = rule.part ? cat.byId.get(rule.part) || null : null;
  if (rule.part && !part) return { from, kind: 'person', part: null, qty, why: `${rule.why} That part isn't in this location's catalog.`, needs: ['part'] };
  const size = line.w || line.h ? { w: Number(line.w) || 0, h: Number(line.h) || 0 } : parseSize(text);
  const mods = part ? part.mods.filter((m) => PRODUCTION_MODS.has(m.id)).map((m) => ({ id: m.id, option: null })) : [];
  const needs = [];
  if (part?.w && !(size.w > 0)) needs.push('width');
  if (part?.h && !(size.h > 0)) needs.push('height');
  return { from, kind: rule.kind, part, qty, w: part?.w ? size.w : 0, h: part?.h ? size.h : 0, mods, why: rule.why, needs };
}

// Whole survey -> { lines (Build-screen form shape), vendor[], person[], notes[] }.
// Only 'make' lines go on the priced draft; vendor work is listed for an RFQ; the rest for a person.
export function draftFromSurvey(survey, { cat = catalog(), max = 10, install = true } = {}) {
  const drafts = (survey?.lines || []).map((l) => draftLine(l, cat));
  const make = drafts.filter((d) => d.kind === 'make' && d.part);
  const form = { lines: '0' };
  const put = (i, d) => {
    form[`p${i}`] = String(d.part.id); form[`n${i}`] = d.from.slice(0, 120); form[`q${i}`] = String(d.qty);
    if (d.w) form[`w${i}`] = String(d.w);
    if (d.h) form[`h${i}`] = String(d.h);
    for (const m of d.mods) form[`m${i}_${m.id}`] = '1';
  };
  const placed = make.slice(0, max - (install ? 1 : 0));
  placed.forEach((d, i) => put(i, d));
  let n = placed.length;
  const inst = install && survey?.site && cat.byId.get(INSTALL_PART);
  if (inst) { put(n, { part: inst, from: `Installation at ${survey.site}`, qty: 1, mods: [] }); n++; }
  form.lines = String(Math.max(1, n));
  const notes = [];
  for (const d of placed) if (d.needs.length) notes.push(`${d.from}: add the ${d.needs.join(' and ')} (not on the survey).`);
  if (make.length > placed.length) notes.push(`${make.length - placed.length} more item(s) did not fit; add them after this estimate.`);
  if (inst) notes.push('Installation added once for the site. Check the hours with the installer.');
  return {
    form,
    drafts,
    vendor: drafts.filter((d) => d.kind === 'vendor'),
    person: drafts.filter((d) => d.kind === 'person'),
    notes,
  };
}
