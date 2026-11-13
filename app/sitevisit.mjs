// Site Visit (phone): survey a site item by item (item # = estimate line #), with measurements, install notes,
// split/drop that keep numbers matching the estimate, and other needs spotted. Mockup boards SiteVisit + SiteVisitStart.
// Photos, voice notes and the Site Survey PDF go to Google Drive (never AWS), so they wait for the Drive connection.
import { page, esc } from './views.mjs';

const KINDS = ['Width', 'Height', 'Wall', 'Window', 'Door', 'Clearance', 'Other'];

export function seedVisit(p, sample = true) {
  if (sample && /tri-state/i.test(String(p && p.company))) {
    return { visits: 2, finished: null, needs: [{ label: 'LED lighting for the monument sign', src: 'Spotted on visit 1' }], items: [
      { n: '1', name: 'Exterior building sign', summary: 'Channel letters over the main entrance', meas: [{ kind: 'Wall', value: '24 ft x 6 ft', note: 'brick, power on the left' }], notes: 'Lift needed. Parking lot is clear before 7 AM.', dropped: false, why: '' },
      { n: '2', name: 'Parking lot and directional signs', summary: '6 post signs, dock arrows', meas: [{ kind: 'Width', value: '18 in', note: 'match the existing posts' }], notes: '', dropped: false, why: '' },
      { n: '3', name: 'Floor marking tape', summary: 'Dock doors 1–4, forklift lanes', meas: [], notes: '', dropped: false, why: '' },
      { n: '4', name: 'Lobby logo wall (next year)', summary: 'Dimensional logo behind reception', meas: [], notes: '', dropped: true, why: 'Customer moved this to next year.' },
    ] };
  }
  return { visits: 1, finished: null, needs: [], items: [] };
}

const clean = (v, max) => String(v || '').trim().replace(/\s+/g, ' ').slice(0, max);
const find = (v, n) => { const it = v.items.find((x) => x.n === String(n)); if (!it) throw new Error('that item is not on this visit'); return it; };

export function visitAct(v0, f) {
  const v = JSON.parse(JSON.stringify(v0));
  if (v.finished && f.do !== 'reopen') throw new Error('this visit is finished');
  switch (f.do) {
    case 'item': {
      const name = clean(f.name, 80);
      if (name.length < 3) throw new Error('name the item, like “Lobby sign”');
      if (v.items.length >= 40) throw new Error('a visit can have up to 40 items');
      const top = v.items.reduce((m, x) => Math.max(m, parseInt(x.n, 10) || 0), 0);
      v.items.push({ n: String(top + 1), name, summary: clean(f.summary, 120), meas: [], notes: '', dropped: false, why: '' });
      return { v, msg: `Item ${top + 1} added.` };
    }
    case 'meas': {
      const it = find(v, f.n);
      const value = clean(f.value, 40);
      if (!value) throw new Error('enter the measurement');
      it.meas.push({ kind: KINDS.includes(f.kind) ? f.kind : 'Other', value, note: clean(f.note, 120) });
      return { v, msg: `Measurement saved on item ${it.n}.` };
    }
    case 'note': { const it = find(v, f.n); it.notes = String(f.notes || '').trim().slice(0, 1000); return { v, msg: `Install notes saved on item ${it.n}.` }; }
    case 'split': {
      const it = find(v, f.n);
      if (!/^\d+$/.test(it.n)) throw new Error('only whole-number items can be split');
      const at = v.items.indexOf(it);
      const b = { ...it, n: it.n + 'b', name: clean(f.name, 80) || it.name + ' (part 2)', meas: [], notes: '' };
      it.n = it.n + 'a';
      v.items.splice(at + 1, 0, b);
      return { v, msg: `Split into ${it.n} and ${b.n}.` };
    }
    case 'drop': { const it = find(v, f.n); it.dropped = true; it.why = clean(f.why, 160) || 'Not needed now.'; return { v, msg: `Item ${it.n} dropped. The number stays reserved.` }; }
    case 'bring': { const it = find(v, f.n); it.dropped = false; it.why = ''; return { v, msg: `Item ${it.n} is back.` }; }
    case 'need': {
      const label = clean(f.label, 120);
      if (label.length < 3) throw new Error('say what else they need');
      v.needs.push({ label, src: `Spotted on visit ${v.visits}` });
      return { v, msg: 'Saved to the company’s Needs.', need: label };
    }
    case 'visit': v.visits += 1; return { v, msg: `Visit ${v.visits} started.` };
    case 'finish':
      if (!v.items.some((x) => !x.dropped)) throw new Error('add at least one item before finishing');
      v.finished = new Date().toISOString();
      return { v, msg: 'Visit finished. The Site Survey PDF will be made in Drive once Google Drive is connected.' };
    case 'reopen': v.finished = null; return { v, msg: 'Visit reopened.' };
    default: throw new Error('unknown action');
  }
}

const SV_CSS = `.sv{max-width:520px;margin:0 auto;padding:14px 14px 40px;display:flex;flex-direction:column;gap:12px}.svh{background:var(--navy);color:#fff;border-radius:14px;padding:12px 16px}.svh small{display:block;font-size:12px;font-weight:700;letter-spacing:1.5px;color:#c9d1e0}.svc{background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:8px}.svc.drop{opacity:.7;background:#f6f7fa}.svn{display:inline-flex;align-items:center;justify-content:center;min-width:30px;height:30px;border-radius:15px;background:#1d4f91;color:#fff;font-weight:700;font-size:14px}.svl{font-size:11px;font-weight:700;letter-spacing:1px;color:var(--mute);margin-top:4px}.svi{font:inherit;font-size:16px;min-height:44px;border:1px solid #d5dbe5;border-radius:10px;padding:0 10px;width:100%;box-sizing:border-box}.svb{font:inherit;font-size:15px;font-weight:700;min-height:44px;border-radius:10px;border:1px solid #d5dbe5;background:#fff;color:var(--ink);padding:0 12px;cursor:pointer}.svb.p{background:#a8343f;border-color:#a8343f;color:#fff}.svrow{display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end}.svrow>*{flex:1;min-width:110px}.svm{font-size:14px;padding:4px 0;border-top:1px solid #eef1f5}.svd summary{cursor:pointer;font-weight:700;font-size:14px;min-height:36px;display:flex;align-items:center}`;

export function visitPage({ user, p, v, flash = '' }) {
  const act = (n, d, inner, label, cls = 'svb') => `<form method="post" action="/projects/${esc(p.id)}/visit" style="margin:0"><input type="hidden" name="do" value="${d}">${n != null ? `<input type="hidden" name="n" value="${esc(n)}">` : ''}${inner}<button class="${cls}">${label}</button></form>`;
  const lock = !!v.finished;
  const card = (it) => it.dropped
    ? `<section class="svc drop" aria-label="Item ${esc(it.n)}"><div style="display:flex;gap:8px;align-items:center"><span class="svn" style="background:#9aa6bd">${esc(it.n)}</span><b>${esc(it.name)}</b></div><p style="margin:0;font-size:13px">${esc(it.why)} The number stays reserved so the other lines keep matching the estimate. Saved to Needs for next year.</p>${lock ? '' : act(it.n, 'bring', '', 'Bring Back')}</section>`
    : `<section class="svc" aria-label="Item ${esc(it.n)}"><div style="display:flex;gap:8px;align-items:center"><span class="svn">${esc(it.n)}</span><b style="font-size:16px">${esc(it.name)}</b></div>${it.summary ? `<div style="font-size:13px;color:var(--mute)">${esc(it.summary)}</div>` : ''}
<div class="svl">MEASUREMENTS</div>${it.meas.map((m) => `<div class="svm"><b>${esc(m.kind)}</b> · ${esc(m.value)}${m.note ? ` <span style="color:var(--mute)">· ${esc(m.note)}</span>` : ''}</div>`).join('') || '<div class="svm" style="color:var(--mute)">None yet.</div>'}
${lock ? '' : `<details class="svd"><summary>+ Measurement</summary>${act(it.n, 'meas', `<div class="svrow"><label style="font-size:12px">Type<select name="kind" class="svi">${KINDS.map((k) => `<option>${k}</option>`).join('')}</select></label><label style="font-size:12px">Size<input name="value" class="svi" placeholder="24 ft x 6 ft" required></label></div><label style="font-size:12px;display:block;margin:6px 0">Note<input name="note" class="svi" placeholder="brick, power on the left"></label>`, 'Save Measurement')}</details>`}
<div class="svl">INSTALL NOTES</div>${lock ? `<div style="font-size:14px">${esc(it.notes) || '<span style="color:var(--mute)">None.</span>'}</div>` : act(it.n, 'note', `<textarea name="notes" rows="2" class="svi" style="padding:8px 10px;min-height:60px">${esc(it.notes)}</textarea>`, 'Save Notes')}
<div class="svl">PHOTOS</div><div style="font-size:13px;color:var(--mute)">+ Photo saves straight to the prospect’s Drive folder once Google Drive is connected.</div>
${lock ? '' : `<div class="svrow" style="margin-top:4px">${act(it.n, 'split', '<input type="hidden" name="name" value="">', 'Split')}${act(it.n, 'drop', '<input type="hidden" name="why" value="">', 'Drop')}</div>`}</section>`;
  const live = v.items.filter((x) => !x.dropped).length;
  const body = `<div class="sv"><header class="svh"><small>SITE SURVEY · VISIT ${v.visits}${lock ? ' · FINISHED' : ''}</small><h1 style="margin:2px 0 0;font-size:20px">${esc(p.company)}</h1><div style="font-size:13px;color:#c9d1e0">${esc(p.name)}${p.salesperson ? ` · ${esc(p.salesperson)}` : ''}</div></header>
${flash ? `<div class="note" role="status" style="margin:0;background:#e6f2ec;color:#1f6a43">${esc(flash)}</div>` : ''}
${lock ? '' : `<div class="svrow">${act(null, 'visit', '', '+ Visit')}<a class="svb" href="/projects/${esc(p.id)}?mode=demo" style="display:flex;align-items:center;justify-content:center">Open Project</a></div>`}
<div style="display:flex;justify-content:space-between;align-items:baseline"><h2 style="margin:0;font-size:16px">Items · ${live}</h2><span style="font-size:12px;color:var(--mute)">Item # = estimate line #</span></div>
${v.items.map(card).join('') || '<div class="svc">No items yet. Add the first sign area you look at.</div>'}
${lock ? '' : `<details class="svc svd"><summary>+ Item</summary>${act(null, 'item', '<label style="font-size:12px;display:block">Item<input name="name" class="svi" required placeholder="Lobby sign"></label><label style="font-size:12px;display:block;margin:6px 0">What it is<input name="summary" class="svi" placeholder="Dimensional letters behind the desk"></label>', 'Add Item', 'svb p')}</details>`}
<p style="margin:0;font-size:12px;color:var(--mute)">Item numbers lock once the estimate is created. Splitting makes 2a and 2b; dropping keeps the number empty.</p>
<section class="svc" aria-label="Other needs spotted"><h2 style="margin:0;font-size:16px">Other Needs Spotted</h2><span style="font-size:12px;color:var(--mute)">Saved to the company</span>${v.needs.map((n) => `<div class="svm"><b>${esc(n.label)}</b> <span style="color:var(--mute)">· ${esc(n.src)}</span></div>`).join('') || '<div class="svm" style="color:var(--mute)">Nothing yet.</div>'}
${lock ? '' : act(null, 'need', '<label style="font-size:12px;display:block;margin-bottom:6px">What else they need<input name="label" class="svi" placeholder="LED lighting for the monument sign" required></label>', '+ Add Need')}</section>
${lock ? act(null, 'reopen', '', 'Reopen Visit') : act(null, 'finish', '', 'Finish Visit', 'svb p')}
<p style="margin:0;font-size:12px;color:var(--mute)">Finishing makes the Site Survey PDF and saves it with all photos to the prospect’s Drive folder. In this test copy that waits for the Google Drive connection; the items and measurements are saved now.</p></div><style>${SV_CSS}</style>`;
  return page({ title: 'Site Visit', user, tab: 'Field', body });
}

export function startPage({ user, q = '', results = [], today = [] }) {
  const row = (r) => `<a class="svc" style="text-decoration:none;color:inherit;flex-direction:row;align-items:center;gap:10px" href="/projects/${esc(r.id)}/visit"><div style="flex:1"><b>${esc(r.company)}</b><div style="font-size:13px;color:var(--mute)">${esc(r.name)}${r.where ? ` · ${esc(r.where)}` : ''}</div></div><span style="font-weight:700;color:#a8343f">Start →</span></a>`;
  const body = `<div class="sv"><header class="svh"><small>NEW SITE VISIT</small><h1 style="margin:2px 0 0;font-size:20px">Where Are You?</h1></header>
<form method="get" action="/field/start" role="search" style="margin:0"><label style="position:absolute;left:-9999px" for="svq">Search customers and prospects</label><input id="svq" type="search" name="q" value="${esc(q)}" class="svi" placeholder="Search customers and prospects"></form>
${today.length && !q ? `<h2 style="margin:4px 0 0;font-size:14px">On Your List Today</h2>${today.map(row).join('')}` : ''}
${q ? (results.map(row).join('') || '<div class="svc">No matches. Try part of the company name.</div>') : ''}
<a class="svb" href="/projects/new${q ? `?company=${encodeURIComponent(q)}` : ''}" style="display:flex;align-items:center;justify-content:center">+ New project and start visit</a>
<section class="svc"><h2 style="margin:0;font-size:16px">Someone New?</h2><p style="margin:0;font-size:13px">Start with just a company name. SalesMax makes the prospect, and its Drive folder once Google Drive is connected.</p><a class="svb p" href="/projects/new" style="display:flex;align-items:center;justify-content:center">+ New customer and visit</a></section>
<p style="margin:0;font-size:12px;color:var(--mute)">Every visit belongs to a project, so photos and the Site Survey land in the right Drive folder.</p></div><style>${SV_CSS}</style>`;
  return page({ title: 'New Site Visit', user, tab: 'Field', body });
}
