// Clarity Voice ("Genie") call webhook. Clarity POSTs each completed call record to /hooks/calls with the signing
// secret in the X-Genie-Signing-Key header. Their test request carries a hidden verification value that the owner
// pastes back into Clarity to confirm ownership; SalesMax shows it in Admin › Connected Apps.
import { timingSafeEqual } from 'node:crypto';
import { esc } from './views.mjs';

export function verifySignature(headers = {}, secret = '') {
  const got = Object.entries(headers || {}).find(([k]) => k.toLowerCase() === 'x-genie-signing-key');
  if (!got || !secret) return false;
  const a = Buffer.from(String(got[1])), b = Buffer.from(String(secret));
  return a.length === b.length && timingSafeEqual(a, b);
}

const flat = (o, pre = '', out = {}) => { if (o && typeof o === 'object' && !Array.isArray(o)) { for (const [k, v] of Object.entries(o)) flat(v, pre ? `${pre}.${k}` : k, out); } else out[pre] = o; return out; };
const pick = (f, re) => { const k = Object.keys(f).find((x) => re.test(x) && f[x] != null && f[x] !== ''); return k ? f[k] : null; };
const digits = (s) => String(s || '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');

export function parseCall(raw, now = new Date().toISOString()) {
  let body; try { body = JSON.parse(raw); } catch { body = { text: String(raw).slice(0, 2000) }; }
  if (body && Array.isArray(body.parties) && Array.isArray(body.dialog)) return parseVcon(body, now);
  const f = flat(body);
  const verification = pick(f, /verif|challenge/i);
  return {
    at: String(pick(f, /(end|start|call)?_?(time|date|timestamp)$/i) || now), receivedAt: now,
    direction: String(pick(f, /direction/i) || ''),
    from: digits(pick(f, /(^|\.)(from|caller|ani)([._]?(number|phone))?$/i)), to: digits(pick(f, /(^|\.)(to|callee|dnis|dialed)([._]?(number|phone))?$/i)),
    duration: Number(pick(f, /duration|seconds|length/i)) || 0,
    recording: String(pick(f, /record/i) || ''), summary: String(pick(f, /summary|transcript|notes?/i) || '').slice(0, 4000),
    verification: verification == null ? '' : String(verification), keys: Object.keys(f).slice(0, 60), test: verification != null,
  };
}
export const keepLatest = (list, rec, n = 50) => [rec, ...(list || [])].slice(0, n);

export function clarityExtra({ hookUrl, latest = [], verification = null }) {
  const v = verification && verification.value ? `<div class="note" style="margin:8px 0 0;background:#e8f0fb;color:#1d4f91">Test received ${esc(new Date(verification.at).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }))}. Paste this into Clarity's Confirm box: <code style="user-select:all;font-weight:700">${esc(verification.value)}</code></div>` : '';
  const rows = latest.slice(0, 5).map((c) => `<li style="font-size:12px;padding:3px 0">${esc(c.receivedAt.slice(0, 16).replace('T', ' '))} · ${esc(c.direction || 'call')} ${esc(c.from || '?')} → ${esc(c.to || '?')} · ${Math.round(c.duration / 60) || '<1'} min${c.test ? ' · test' : ''}</li>`).join('');
  return `<div style="margin-top:10px;font-size:13px"><b>Webhook URL for Clarity:</b> <code style="user-select:all">${esc(hookUrl)}</code><br><span style="color:var(--mute);font-size:12px">In Clarity: paste this URL and Save, copy the signing secret it gives you into the box above, then click Test there.</span>${v}${rows ? `<p style="margin:8px 0 2px;font-weight:700">Latest calls received</p><ul style="margin:0;padding-left:18px">${rows}</ul>` : ''}</div>`;
}

// Clarity sends each finished call as a vCon (IETF conversation record). Real shape (checked Nov 12):
// parties[{tel,name,role}], dialog[{start,duration,originator}], attachments[{type:'tags', body:['key:value',...]}],
// analysis[] typed: transcript_pii_removed, franchise_diarized (summary), resolution (initial_issue, action_items,
// resolution, issue_resolved), csat (1-10), scorecard (percentage_earned + questions), insights, topics, genie_tags.
const J = (b) => { if (b == null) return {}; if (typeof b === 'object') return b; try { return JSON.parse(b); } catch { return { text: String(b) }; } };
const tagMap = (v) => { const t = {}; for (const a of v.attachments || []) if (a && a.type === 'tags' && Array.isArray(J(a.body)) ) for (const s of J(a.body)) { const i = String(s).indexOf(':'); if (i > 0) t[String(s).slice(0, i)] = String(s).slice(i + 1); } return t; };
const nul = (x) => (x == null || x === 'null' || x === 'None' || x === '' ? '' : x);
export function parseVcon(v, now = new Date().toISOString()) {
  const d0 = v.dialog[0] || {};
  const t = tagMap(v);
  const an = Array.isArray(v.analysis) ? v.analysis : [];
  const A = (type) => { const a = an.find((x) => x && x.type === type); return a ? J(a.body) : null; };
  const dir = String(t.mapped_call_type || d0.direction || '').toLowerCase();
  const caller = v.parties[Number(d0.originator) || 0] || v.parties[0] || {};
  const other = v.parties.find((p) => p !== caller) || {};
  const cust = dir === 'outbound' ? other : caller;
  const shop = dir === 'outbound' ? caller : other;
  const diar = A('franchise_diarized') || {}, res = A('resolution') || {}, csat = A('csat'), sc = A('scorecard'), ins = A('insights') || {}, top = A('topics') || {}, tags = A('genie_tags') || {}, tr = A('transcript_pii_removed') || {};
  const talk = Number(nul(t.time_talking) || nul(t.duration)) || 0;
  const toVm = /voicemail/i.test(String(nul(t.agent_names) || ''));
  const answered = !!nul(t.time_answer) && talk > 0 && !toVm;
  const custName = String(cust.name || nul(t.customer_names) || '');
  return {
    id: String(v.uuid || ''), vcon: String(v.uuid || ''), at: String(d0.start || v.created_at || now), receivedAt: now,
    direction: dir, agent: String(nul(t.agent_names) || (shop && shop.name) || ''), ext: String(nul(t.term_sub) || nul(t.orig_sub) || ''),
    customerPhone: digits(cust.tel), customerName: /^\d+$/.test(custName.replace(/\D/g, '')) && custName.replace(/\D/g, '').length >= 10 ? '' : custName,
    shopLine: digits(dir === 'outbound' ? nul(t.orig_from_user) : nul(t.orig_to_user)),
    talk, duration: Number(nul(t.audio_duration) || d0.duration) || talk, answered, voicemail: String(nul(t.voicemail_transcription) || (toVm ? 'Went to voicemail (no transcript yet)' : '')).slice(0, 1500),
    summary: String(diar.summary || '').slice(0, 1500), callType: String(diar.call_type || ''),
    issue: String(res.initial_issue || '').slice(0, 800), resolution: String(res.resolution || '').slice(0, 1000), resolved: res.issue_resolved == null ? null : !!res.issue_resolved,
    actionItems: (Array.isArray(res.action_items) ? res.action_items : []).map(String).slice(0, 10),
    csat: csat && csat.csat != null ? Number(csat.csat) : null,
    score: sc && sc.percentage_earned != null ? Number(sc.percentage_earned) : null,
    scorecard: (sc && Array.isArray(sc.scorecard) ? sc.scorecard : []).slice(0, 15).map((q) => ({ q: String(q.question || '').slice(0, 200), earned: Number(q.points_earned) || 0, max: Number(q.max_points) || 0, note: String(q.comments || q.assessment || '').slice(0, 300) })),
    outcome: String(ins.outcome || ''), sentiment: String(ins.customer_sentiment || ''), competitors: (ins.competitor_mention || []).map(String).slice(0, 5),
    pricingBarrier: !!ins.pricing_barrier, pricingCriticism: !!ins.pricing_criticism, commonIssues: (ins.common_issue || []).map(String).slice(0, 5),
    topics: (top.topics || []).slice(0, 6).map((x) => ({ type: String(x.intent_type || ''), topic: String(x.topic || '').slice(0, 300) })),
    flags: (tags.tags || []).filter((x) => x.applied).map((x) => String(x.tag_key || '')),
    transcript: String(tr.text || '').slice(0, 6000), recording: String(d0.filename || d0.url || ''),
    analysisTypes: [...new Set(an.map((a) => a && a.type).filter(Boolean))], keys: Object.keys(v).slice(0, 20),
    // older fields some screens still read
    from: digits(caller.tel), fromName: String(caller.name || ''), to: digits(other.tel), toName: String(other.name || ''),
    summaryText: '', actions: '', scores: [], verification: '', test: false,
  };
}

// ---- storage: one item per call (sk CALL#<start>#<uuid>), plus the phone index to match customers ----
let DB;
async function cdb() {
  if (globalThis.__SMX_FAKE_DB) return globalThis.__SMX_FAKE_DB;
  if (!DB) { const m = await import('@aws-sdk/client-dynamodb'); DB = { ...m, client: new m.DynamoDBClient({}) }; }
  return DB;
}
const PK = (loc) => ({ S: `LOC#${loc}` });
export async function lookupPhone(phone, { table = process.env.TABLE, loc = 'nky' } = {}) {
  if (!/^\d{10}$/.test(phone || '')) return null;
  const { client, GetItemCommand } = await cdb();
  const out = await client.send(new GetItemCommand({ TableName: table, Key: { pk: PK(loc), sk: { S: `PHONE#${phone}` } } }));
  if (!out.Item) return null;
  const m = JSON.parse(out.Item.data.S);
  if (!m.company && m.accountId != null) {
    try { const cu = await client.send(new GetItemCommand({ TableName: table, Key: { pk: PK(loc), sk: { S: `CB#customers#${m.accountId}` } } })); if (cu.Item) m.company = JSON.parse(cu.Item.data.S).companyName || ''; } catch { /* name only */ }
  }
  return m;
}
export async function saveCall(rec, { table = process.env.TABLE, loc = 'nky' } = {}) {
  const { client, PutItemCommand } = await cdb();
  await client.send(new PutItemCommand({ TableName: table, Item: { pk: PK(loc), sk: { S: `CALL#${rec.at}#${rec.id}` }, location: { S: loc }, data: { S: JSON.stringify(rec) } } }));
}
export async function listCalls({ table = process.env.TABLE, loc = 'nky', max = 600 } = {}) {
  const { client, QueryCommand } = await cdb();
  const out = []; let key;
  do {
    const r = await client.send(new QueryCommand({ TableName: table, KeyConditionExpression: 'pk = :p AND begins_with(sk, :s)', ExpressionAttributeValues: { ':p': PK(loc), ':s': { S: 'CALL#' } }, ScanIndexForward: false, ExclusiveStartKey: key, Limit: 200 }));
    for (const it of r.Items || []) { try { out.push(JSON.parse(it.data.S)); } catch { /* skip */ } }
    key = r.LastEvaluatedKey;
  } while (key && out.length < max);
  return out;
}
// Fill the phone index from the CoreBridge records already imported (runs a little each minute until done).
export async function phoneBackfillStep(state = {}, { table = process.env.TABLE, loc = 'nky', budgetMs = 20000, entries, order = ['contacts', 'customers'], toItem = (e) => ({ sk: `PHONE#${e.phone}`, data: e }), keyOf = (e) => e.phone } = {}) {
  const { client, QueryCommand, BatchWriteItemCommand } = await cdb();
  const st = { entity: order[0], key: null, n: 0, phones: 0, done: false, ...(state || {}) };
  const t0 = Date.now();
  while (!st.done && Date.now() - t0 < budgetMs) {
    const r = await client.send(new QueryCommand({ TableName: table, KeyConditionExpression: 'pk = :p AND begins_with(sk, :s)', ExpressionAttributeValues: { ':p': PK(loc), ':s': { S: `CB#${st.entity}#` } }, ExclusiveStartKey: st.key || undefined, Limit: 500 }));
    const ph = new Map();
    for (const it of r.Items || []) { st.n++; try { for (const e of entries(st.entity, JSON.parse(it.data.S))) ph.set(keyOf(e), e); } catch { /* skip */ } }
    const items = [...ph.values()];
    for (let i = 0; i < items.length; i += 25) {
      let req = { [table]: items.slice(i, i + 25).map((e) => { const it2 = toItem(e); return { PutRequest: { Item: { pk: PK(loc), sk: { S: it2.sk }, location: { S: loc }, data: { S: JSON.stringify(it2.data) } } } }; }) };
      for (let k = 0; k < 5 && req; k++) { const o = await client.send(new BatchWriteItemCommand({ RequestItems: req })); req = o.UnprocessedItems && Object.keys(o.UnprocessedItems).length ? o.UnprocessedItems : null; if (req) await new Promise((x) => setTimeout(x, 300)); }
    }
    st.phones += items.length;
    st.key = r.LastEvaluatedKey || null;
    if (!st.key) { const nx = order[order.indexOf(st.entity) + 1]; if (nx) st.entity = nx; else st.done = true; }
  }
  st.at = new Date().toISOString();
  return st;
}

// ---- Calls tab (Phil, Nov 12): admins only for now ----
const fmtTel = (d) => (/^\d{10}$/.test(d || '') ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : d || 'Unknown');
const mmss = (s) => { s = Math.round(Number(s) || 0); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const talkOf = (c) => Number(c.talk ?? c.duration) || 0;
const custPhone = (c) => c.customerPhone || (/^out/i.test(c.direction || '') ? c.to : c.from) || '';
export const isInternal = (c) => /on-?net|internal/i.test(c.direction || '') || (String(custPhone(c)).length > 0 && String(custPhone(c)).length <= 5);
export const isMissed = (c) => (c.answered === false) || talkOf(c) < 5;
const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
export function filterCalls(calls = [], f = {}, now = new Date()) {
  const days = { today: 1, '7d': 7, '30d': 30 }[f.range] || 0;
  const since = days ? new Date(now.getTime() - days * 86400000).toISOString() : '';
  const q = String(f.q || '').toLowerCase().replace(/[^\w ]/g, '');
  const K = {
    missed: isMissed, voicemail: (c) => !!c.voicemail, actions: (c) => (c.actionItems || []).length || !!c.actions, summary: (c) => !!c.summary,
    unresolved: (c) => c.resolved === false, lowscore: (c) => c.score != null && c.score < 60, negative: (c) => /neg/i.test(c.sentiment || ''), nomatch: (c) => !c.match,
  };
  return calls.filter((c) => (!since || String(c.at || c.receivedAt) >= since)
    && (f.dir === 'internal' ? isInternal(c) : !isInternal(c)) && (!f.dir || f.dir === 'internal' || String(c.direction || '').toLowerCase().startsWith(f.dir))
    && (!f.agent || c.agent === f.agent) && (!f.kind || !K[f.kind] || K[f.kind](c))
    && (!q || [c.from, c.to, c.customerPhone, c.customerName, c.fromName, c.toName, c.agent, c.summary, c.issue, c.match && c.match.company, c.match && c.match.name].join(' ').toLowerCase().replace(/[^\w ]/g, '').includes(q)));
}
export function callMetrics(list = []) {
  const talk = list.filter((c) => !isMissed(c));
  const count = (fn) => { const m = {}; for (const c of list) for (const t of [].concat(fn(c) || [])) if (t) m[t] = (m[t] || 0) + 1; return m; };
  const callers = {}; for (const c of list) { const p = custPhone(c); if (p) callers[p] = { n: ((callers[p] || {}).n || 0) + 1, name: (c.match && (c.match.company || c.match.name)) || c.customerName || c.fromName || (callers[p] || {}).name || '' }; }
  const hours = Array(24).fill(0), hoursMissed = Array(24).fill(0);
  for (const c of list) { const h = Number(new Date(c.at || c.receivedAt).toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false })) % 24; if (h >= 0) { hours[h]++; if (isMissed(c)) hoursMissed[h]++; } }
  const agents = {};
  for (const c of list) { const a = c.agent || 'Unassigned'; const g = agents[a] || (agents[a] = { calls: 0, missed: 0, talk: [], score: [], csat: [] }); g.calls++; if (isMissed(c)) g.missed++; else g.talk.push(talkOf(c)); if (c.score != null) g.score.push(c.score); if (c.csat != null) g.csat.push(c.csat); }
  const res = list.filter((c) => c.resolved != null);
  return {
    total: list.length, inbound: list.filter((c) => /^in/i.test(c.direction || '')).length, outbound: list.filter((c) => /^out/i.test(c.direction || '')).length,
    missed: list.length - talk.length, voicemail: list.filter((c) => c.voicemail).length, avgTalk: avg(talk.map(talkOf)) || 0,
    withSummary: list.filter((c) => c.summary).length, withActions: list.filter((c) => (c.actionItems || []).length || c.actions).length, withScores: list.filter((c) => c.score != null || (c.scores || []).length).length,
    avgScore: avg(list.filter((c) => c.score != null).map((c) => c.score)), avgCsat: avg(list.filter((c) => c.csat != null).map((c) => c.csat)),
    resolvedPct: res.length ? Math.round((res.filter((c) => c.resolved).length / res.length) * 100) : null,
    matched: list.filter((c) => c.match).length, openActions: list.reduce((a, c) => a + (c.actionItems || []).length, 0),
    analysisTypes: count((c) => c.analysisTypes), payloadKeys: count((c) => c.keys), outcomes: count((c) => c.outcome), sentiments: count((c) => c.sentiment),
    issues: count((c) => c.commonIssues), unique: Object.keys(callers).length,
    topCallers: Object.entries(callers).sort((a, b) => b[1].n - a[1].n).slice(0, 6), hours, hoursMissed,
    agents: Object.entries(agents).map(([name, g]) => ({ name, calls: g.calls, missed: g.missed, talk: avg(g.talk), score: avg(g.score), csat: avg(g.csat) })).sort((a, b) => b.calls - a.calls),
  };
}
const scoreColor = (s) => (s == null ? '#5a6478' : s >= 80 ? '#1f6a43' : s >= 60 ? '#7a5600' : '#a8343f');
export function callsPage({ page, user, calls = [], f = {}, now = new Date(), backfill = null }) {
  const list = filterCalls(calls, f, now);
  const m = callMetrics(list);
  const tile = (label, val, sub = '', color = 'inherit') => `<div class="panel" style="padding:12px;margin:0"><div style="font-size:12px;color:var(--mute)">${label}</div><div style="font-size:24px;font-weight:800;color:${color}">${val}</div>${sub ? `<div style="font-size:12px;color:var(--mute)">${sub}</div>` : ''}</div>`;
  const pct = (n) => (m.total ? Math.round((n / m.total) * 100) + '%' : '0%');
  const r1 = (x) => (x == null ? '—' : String(Math.round(x * 10) / 10));
  const tiles = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:14px">
${tile('Calls', m.total, `${m.inbound} in · ${m.outbound} out`)}${tile('Missed', m.missed, `${pct(m.missed)} · ${m.voicemail} voicemail`, '#a8343f')}${tile('Avg Talk Time', mmss(m.avgTalk), 'answered calls')}${tile('Avg Call Score', m.avgScore == null ? '—' : Math.round(m.avgScore), 'Clarity scorecard, out of 100', scoreColor(m.avgScore))}${tile('Avg Customer Satisfaction', r1(m.avgCsat), 'Clarity estimate, 1 to 10')}${tile('Resolved on the Call', m.resolvedPct == null ? '—' : m.resolvedPct + '%', '')}${tile('Open Action Items', m.openActions, `from ${m.withActions} calls`, '#7a5600')}${tile('Matched to a Customer', pct(m.matched), `${m.unique} unique numbers`)}</div>`;
  const sel = (name, opts) => `<select name="${name}" aria-label="${name}" data-autosubmit style="font:inherit;min-height:36px;border:1px solid #d5dbe5;border-radius:8px">${opts.map(([v, l]) => `<option value="${esc(v)}" ${String(f[name] || '') === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  const agentsAll = [...new Set(calls.map((c) => c.agent).filter(Boolean))].sort();
  const filters = `<form method="get" action="/calls" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:14px">${sel('range', [['', 'All Time'], ['today', 'Last 24 Hours'], ['7d', 'Last 7 Days'], ['30d', 'Last 30 Days']])}${sel('dir', [['', 'In and Out'], ['in', 'Inbound'], ['out', 'Outbound'], ['internal', 'Internal (Team to Team)']])}${sel('agent', [['', 'Everyone'], ...agentsAll.map((a) => [a, a])])}${sel('kind', [['', 'All Calls'], ['missed', 'Missed'], ['voicemail', 'Voicemail'], ['actions', 'Has Action Items'], ['unresolved', 'Not Resolved'], ['lowscore', 'Score Under 60'], ['negative', 'Unhappy Customer'], ['nomatch', 'Not a Customer Yet']])}<input name="q" value="${esc(f.q || '')}" placeholder="Phone, name, company or words in the summary" style="font:inherit;min-height:36px;border:1px solid #d5dbe5;border-radius:8px;padding:0 8px;flex:1;min-width:200px"><noscript><button class="btn primary">Filter</button></noscript><a href="/calls" class="btn">Clear</a></form>`;
  const maxH = Math.max(1, ...m.hours);
  const hours = `<div style="display:flex;align-items:flex-end;gap:2px;height:84px">${m.hours.slice(7, 20).map((n, i) => `<div title="${(i + 7) % 12 || 12}${i + 7 < 12 ? 'am' : 'pm'}: ${n} calls, ${m.hoursMissed[i + 7]} missed" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px"><div style="width:100%;background:${m.hoursMissed[i + 7] >= 2 ? '#a8343f' : '#1d4f91'};border-radius:3px 3px 0 0;height:${Math.round((n / maxH) * 64)}px"></div><span style="font-size:10px;color:var(--mute)">${(i + 7) % 12 || 12}</span></div>`).join('')}</div><div style="font-size:11px;color:var(--mute);margin-top:4px">Red = 2 or more missed calls that hour</div>`;
  const kv = (o, empty = 'None yet') => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, n]) => `<li style="font-size:12px">${esc(k)} · ${n}</li>`).join('') || `<li style="font-size:12px;color:var(--mute)">${empty}</li>`;
  const agentRows = m.agents.map((a) => `<tr><td><a href="/calls?agent=${encodeURIComponent(a.name)}">${esc(a.name)}</a></td><td>${a.calls}</td><td>${a.missed}</td><td>${a.talk == null ? '—' : mmss(a.talk)}</td><td style="color:${scoreColor(a.score)};font-weight:700">${a.score == null ? '—' : Math.round(a.score)}</td><td>${r1(a.csat)}</td></tr>`).join('');
  const side = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px;margin-bottom:14px">
<section class="panel" style="margin:0;overflow-x:auto"><h2 style="margin:0 0 8px;font-size:14px">By Team Member</h2><table><thead><tr><th>Name</th><th>Calls</th><th>Missed</th><th>Avg Talk</th><th>Score</th><th>CSAT</th></tr></thead><tbody>${agentRows || '<tr><td colspan="6" style="color:var(--mute)">None yet</td></tr>'}</tbody></table></section>
<section class="panel" style="margin:0"><h2 style="margin:0 0 8px;font-size:14px">Busiest Hours</h2>${hours}</section>
<section class="panel" style="margin:0"><h2 style="margin:0 0 8px;font-size:14px">Top Callers</h2><ol style="margin:0;padding-left:18px">${m.topCallers.map(([t, x]) => `<li style="font-size:13px">${esc(x.name || fmtTel(t))} · ${x.n}</li>`).join('') || '<li style="font-size:12px;color:var(--mute)">None yet</li>'}</ol></section>
<section class="panel" style="margin:0"><h2 style="margin:0 0 8px;font-size:14px">Outcomes and Mood</h2><ul style="margin:0 0 6px;padding-left:18px">${kv(m.outcomes)}</ul><ul style="margin:0;padding-left:18px">${kv(m.sentiments)}</ul></section>
<section class="panel" style="margin:0"><h2 style="margin:0 0 8px;font-size:14px">Common Issues</h2><ul style="margin:0;padding-left:18px">${kv(m.issues)}</ul></section>
<section class="panel" style="margin:0"><h2 style="margin:0 0 8px;font-size:14px">What Clarity Sends</h2><p style="margin:0 0 4px;font-size:12px;color:var(--mute)">Parts of the call record, and how many calls had each:</p><ul style="margin:0;padding-left:18px">${kv(m.analysisTypes)}</ul></section></div>`;
  const who = (c) => { const p = custPhone(c); const nm = c.match ? `${c.match.accountId != null ? `<a href="/customers/imported/${esc(c.match.accountId)}">${esc(c.match.company || c.match.name || 'Customer')}</a>` : esc(c.match.company || '')}${c.match.company && c.match.name ? '<br>' : ''}${c.match.name ? `<span style="font-size:12px">${esc(c.match.name)}</span>` : ''}` : esc(c.customerName || (/^out/i.test(c.direction || '') ? c.toName : c.fromName) || ''); return `${nm || '<span style="color:var(--mute)">Not a customer yet</span>'}<br><span style="color:var(--mute);font-size:12px">${esc(fmtTel(p))}</span>`; };
  const detail = (c) => {
    const sec = (t, h) => (h ? `<div style="margin:0 0 10px"><b style="font-size:12px;color:var(--mute)">${t}</b><div>${h}</div></div>` : '');
    const ul = (xs) => (xs && xs.length ? `<ul style="margin:2px 0;padding-left:18px">${xs.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '');
    const scq = (c.scorecard || []).map((q) => `<tr><td>${esc(q.q)}<br><span style="color:var(--mute)">${esc(q.note)}</span></td><td style="white-space:nowrap;font-weight:700">${q.earned} / ${q.max}</td></tr>`).join('');
    return `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;font-size:13px;padding:8px 0">
<div>${sec('Summary', esc(c.summary || ''))}${sec('Why They Called', esc(c.issue || ''))}${sec('How It Ended', esc(c.resolution || '') + (c.resolved == null ? '' : c.resolved ? ' <span class="pill" style="background:#e6f2ec;color:#1f6a43">Resolved</span>' : ' <span class="pill" style="background:#fbeaec;color:#6e1f27">Not Resolved</span>'))}${sec('Action Items', ul(c.actionItems) || esc(c.actions || ''))}${sec('Voicemail', esc(c.voicemail || ''))}</div>
<div>${sec('Topics', ul((c.topics || []).map((x) => `${x.type}: ${x.topic}`)))}${sec('Insights', [c.outcome && `Outcome: ${c.outcome}`, c.sentiment && `Customer mood: ${c.sentiment}`, c.competitors && c.competitors.length && `Competitors mentioned: ${c.competitors.join(', ')}`, c.pricingBarrier && 'Price was a barrier', c.pricingCriticism && 'Customer pushed back on price', (c.flags || []).length && `Flags: ${c.flags.join(', ')}`].filter(Boolean).map(esc).join('<br>'))}${scq ? sec(`Scorecard · ${c.score}/100`, `<table style="font-size:12px">${scq}</table>`) : ''}</div>
${c.transcript ? `<details style="grid-column:1/-1"><summary style="cursor:pointer;font-weight:700">Transcript</summary><div style="white-space:pre-wrap;font-size:12px;max-height:280px;overflow:auto;background:#f6f8fb;border-radius:8px;padding:8px">${esc(c.transcript)}</div><p style="margin:4px 0 0;font-size:11px;color:var(--mute)">Clarity removes personal details (shown as ****). The recording stays in Clarity.</p></details>` : ''}</div>`;
  };
  const rows = list.slice(0, 300).map((c) => `<tr><td style="white-space:nowrap">${esc(new Date(c.at || c.receivedAt).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }))}</td><td><span class="pill" style="background:${/^in/i.test(c.direction || '') ? '#e8f0fb' : '#eef1f5'};color:${/^in/i.test(c.direction || '') ? '#1d4f91' : '#3d4658'}">${esc((c.direction || '—').replace(/^./, (x) => x.toUpperCase()))}</span></td><td>${who(c)}</td><td>${esc(c.agent || '')}</td><td>${mmss(talkOf(c))}${isMissed(c) ? ' <span class="pill" style="background:#fbeaec;color:#6e1f27">Missed</span>' : ''}${c.voicemail ? ' <span class="pill" style="background:#fdf3dc;color:#6b4500">Voicemail</span>' : ''}</td><td style="font-weight:700;color:${scoreColor(c.score)}">${c.score == null ? '—' : c.score}</td><td>${c.csat == null ? '—' : c.csat}</td>
<td style="min-width:260px">${c.summary || c.issue || c.actions || c.voicemail ? `<details><summary style="cursor:pointer">${esc(String(c.summary || c.issue || c.voicemail || c.actions).slice(0, 90))}${String(c.summary || '').length > 90 ? '…' : ''}${(c.actionItems || []).length ? ` <span class="pill" style="background:#fdf3dc;color:#6b4500">${c.actionItems.length} to do</span>` : ''}</summary>${detail(c)}</details>` : `<span style="color:var(--mute)">${c.keys && c.keys.includes('vcon') && !c.id ? 'Received before SalesMax could read this format' : 'No summary'}</span>`}</td></tr>`).join('');
  const bf = backfill && !backfill.done ? `<div class="note" style="margin:0 0 12px;background:#e8f0fb;color:#1d4f91">Building the phone list from CoreBridge so calls match customers: ${Number(backfill.n || 0).toLocaleString('en-US')} records checked so far.</div>` : '';
  const body = `<div class="wrap"><div class="bar" style="padding:14px 0"><h1>Calls</h1><span class="pill" style="background:#eef1f5;color:#3d4658">Admins Only</span></div>
<p style="margin:0 0 12px;font-size:13px">Every call Clarity Voice sends to SalesMax, with Clarity's summary, action items, scorecard and customer satisfaction estimate. Admins only for now, while we decide where the sales team should see it.</p>${bf}${calls.length ? tiles + filters + side : `<section class="panel" style="margin:0 0 12px;display:flex;flex-direction:column;gap:6px"><h2 style="margin:0;font-size:15px">No Calls Yet</h2><p style="margin:0;font-size:13px;color:#3d4658">As soon as Clarity Voice sends a finished call, it shows here with its summary, scorecard and customer satisfaction, and lands on the customer's record. The totals and charts appear with the first call.</p><a href="/admin/connections#clarity" style="font-size:13px;font-weight:600">Check the Clarity Voice connection →</a></section>`}
<section class="panel" style="margin:0;overflow-x:auto"><h2 style="margin:0 0 8px;font-size:14px">Call List · ${list.length}</h2><table><thead><tr><th>When</th><th>Direction</th><th>Customer</th><th>Team Member</th><th>Length</th><th>Score</th><th>CSAT</th><th>Summary</th></tr></thead><tbody>${rows || '<tr><td colspan="8" style="color:var(--mute)">No calls match these filters.</td></tr>'}</tbody></table></section></div>`;
  return page({ title: 'Calls', user, tab: 'Calls', body });
}
