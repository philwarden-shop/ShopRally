// Field app (phone-first) for salespeople and installers: today's site visits and installs, a short checklist,
// and completion photos that go to the job folder in Google Drive (never stored on AWS).
import { page, esc } from './views.mjs';
import { sampleData } from './data.mjs';

export const CHECKS = {
  visit: ['Met the contact', 'Measured every sign area', 'Took site photos', 'Noted power and mounting surface'],
  install: ['Arrived and checked in', 'Installed and level', 'Cleaned up', 'Customer walked through and happy', 'Completion photos added'],
};

export function demoJobs(today) {
  if (!sampleData()) return [];
  return [
    { id: 'f1', kind: 'visit', time: '9:30 AM', title: 'Site visit 2 · wall graphics', company: 'Tri-State Logistics', address: '2200 Global Way, Hebron, KY', projectId: 'demo-2', order: '' },
    { id: 'f2', kind: 'install', time: '1:00 PM', title: 'Install · lobby sign', company: 'Riverbend Dental', address: '120 Main St, Florence, KY', projectId: 'demo-6', order: '75812' },
  ].map((j) => ({ ...j, date: today }));
}

export function tick(state, job, f) {
  const list = CHECKS[job.kind] || [];
  const done = list.filter((_, n) => f[`c${n}`] === 'on');
  const notes = String(f.notes || '').trim().slice(0, 1000);
  return { ...state, [job.id]: { done, notes, complete: done.length === list.length } };
}

export function driveLink(job) {
  const q = job.order ? `Order ${job.order}` : job.company;
  return `https://drive.google.com/drive/search?q=${encodeURIComponent(q)}`;
}

// Look Up rows: { name, meta, phone, address, href }
export function lookupRows(rows = []) {
  return rows.map((r) => `<div class="fcard" style="gap:6px"><b style="font-size:15px">${esc(r.name)}</b><span style="font-size:13px;color:var(--mute)">${esc(r.meta || '')}</span><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">${r.phone ? `<a class="fbtn" style="font-size:14px;min-height:44px" href="tel:${esc(String(r.phone).replace(/[^\d+]/g, ''))}">Call</a>` : '<span class="fbtn" style="font-size:14px;min-height:44px;color:var(--mute)">No Phone</span>'}${r.address ? `<a class="fbtn" style="font-size:14px;min-height:44px" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(r.address)}" target="_blank" rel="noopener">Directions</a>` : '<span class="fbtn" style="font-size:14px;min-height:44px;color:var(--mute)">No Address</span>'}<a class="fbtn" style="font-size:14px;min-height:44px" href="${esc(r.href)}">Open</a></div></div>`).join('');
}

export function fieldPage({ user, jobs, state = {}, flash = '', kind = '', flags = {}, look = null }) {
  const shown = kind === 'look' ? [] : kind ? jobs.filter((j) => j.kind === kind) : jobs;
  const doneN = jobs.filter((j) => (state[j.id] || {}).complete).length;
  const card = (j) => {
    const s = state[j.id] || { done: [], notes: '' };
    const list = CHECKS[j.kind] || [];
    const got = list.filter((c) => s.done.includes(c)).length;
    const kc = j.kind === 'install' ? ['#e6f2ec', '#1f6a43', 'Install'] : ['#e8f0fb', '#1d4f91', 'Site Survey'];
    return `<section class="fcard${s.complete ? ' fdone' : ''}">
<div class="fh"><span class="ft">${esc(j.time)}</span><span class="fk" style="background:${kc[0]};color:${kc[1]}">${kc[2]}</span>${s.complete ? '<span class="fk" style="background:#1f6a43;color:#fff">Done</span>' : `<span class="fp">${got}/${list.length}</span>`}</div>
<b class="fti">${esc(j.title)}</b><div style="font-size:14px;color:#3d4658">${esc(j.company)}</div>${flags[j.company] ? `<div style="font-size:13px;color:#5c3a0c;background:#fff8ec;border-radius:8px;padding:6px 8px">⚑ ${esc(flags[j.company])}</div>` : ''}
<a class="fbig" href="https://maps.google.com/?q=${encodeURIComponent(j.address)}">📍 ${esc(j.address)}</a>${j.kind === 'visit' && j.projectId ? `<a class="fbtn p" href="/projects/${esc(j.projectId)}/visit">Start Site Visit</a>` : ''}
<form method="post" action="/field/${esc(j.id)}" style="display:flex;flex-direction:column;gap:2px">${list.map((c, n) => `<label class="fck"><input type="checkbox" name="c${n}" ${s.done.includes(c) ? 'checked' : ''}> ${esc(c)}</label>`).join('')}
<label style="display:flex;flex-direction:column;font-size:13px;gap:4px;margin-top:6px">Notes<textarea name="notes" rows="2" style="font:inherit;font-size:16px;border:1px solid #d5dbe5;border-radius:10px;padding:10px">${esc(s.notes)}</textarea></label>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px"><button class="fbtn p">${j.kind === 'install' ? 'Save · Mark Installed' : 'Save'}</button><a class="fbtn" href="${esc(driveLink(j))}" target="_blank" rel="noopener">Add Photos in Google Drive</a></div></form></section>`;
  };
  const seg = [['', 'Today'], ['visit', 'Survey'], ['install', 'Install'], ['look', 'Look Up']].map(([k2, l]) => `<a href="/field${k2 ? '?kind=' + k2 : ''}" class="${kind === k2 ? 'on' : ''}">${l}</a>`).join('');
  const FCSS = `.fw{max-width:480px;margin:0 auto;padding:16px 16px 40px;display:flex;flex-direction:column;gap:14px}.fseg{display:grid;grid-template-columns:repeat(4,1fr);background:#fff;border:1px solid var(--line);border-radius:12px;padding:4px;gap:4px}.fseg a{min-height:44px;display:flex;align-items:center;justify-content:center;border-radius:8px;font-weight:600;color:var(--ink)}.fseg a.on{background:var(--navy);color:#fff}.fseg a:hover{text-decoration:none}
.fcard{background:#fff;border:1px solid var(--line);border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:8px}.fdone{opacity:.75}.fh{display:flex;align-items:center;gap:8px}.ft{font-size:15px;font-weight:700}.fk{font-size:12px;font-weight:700;padding:3px 10px;border-radius:10px}.fp{margin-left:auto;font-size:13px;font-weight:700;color:var(--mute)}.fti{font-size:18px;line-height:1.3}
.fbig{display:flex;align-items:center;min-height:48px;border:1px solid var(--line);border-radius:10px;padding:0 12px;font-weight:600}.fck{display:flex;gap:12px;align-items:center;min-height:48px;font-size:16px;border-bottom:1px solid #eef1f5}.fck input{width:24px;height:24px;accent-color:#a8343f}
.fbtn{font:inherit;font-size:16px;font-weight:700;min-height:48px;border-radius:10px;border:1px solid #d5dbe5;background:#fff;color:var(--ink);display:flex;align-items:center;justify-content:center;cursor:pointer}.fbtn.p{background:#a8343f;border-color:#a8343f;color:#fff}.fbtn:hover{text-decoration:none}`;
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'America/New_York' });
  const first = String((user && (user.name || user.email)) || '').split(/[ @.]/)[0];
  const nV = jobs.filter((j) => j.kind === 'visit').length, nI = jobs.filter((j) => j.kind === 'install').length;
  const summary = [nV ? `${nV} site survey${nV === 1 ? '' : 's'}` : '', nI ? `${nI} install${nI === 1 ? '' : 's'}` : ''].filter(Boolean).join(' · ') || 'Nothing scheduled';
  const lookHtml = kind === 'look' ? `<form method="get" action="/field" role="search" style="margin:0"><input type="hidden" name="kind" value="look"><label style="display:flex;align-items:center;gap:8px;background:#fff;border:1px solid #d5dbe5;border-radius:12px;padding:0 12px;min-height:52px"><span style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Search customers, orders or addresses</span><input type="search" name="q" value="${esc((look && look.q) || '')}" placeholder="Customer, order # or address" style="border:0;outline:none;font:inherit;font-size:16px;width:100%;background:transparent"></label></form>${look && look.q ? (lookupRows(look.rows) || '<div class="fcard">No matches. Try part of the name or street.</div>') : '<p style="margin:0;font-size:13px;color:var(--mute)">Search your customers and the CoreBridge history: call, get directions or open the record.</p>'}` : '';
  const body = `<div class="fw"><header style="background:var(--navy);color:#fff;border-radius:14px;padding:12px 16px 14px;display:flex;flex-direction:column;gap:6px"><span style="font-size:12px;font-weight:700;letter-spacing:1.5px;color:#c9d1e0">SALESMAX FIELD</span><h1 style="margin:0;font-size:22px">Today${first ? ', ' + esc(first.charAt(0).toUpperCase() + first.slice(1)) : ''}</h1><p style="margin:0;color:#c9d1e0;font-size:14px">${esc(today)} · ${esc(summary)} · ${doneN} done</p></header><nav class="fseg" aria-label="Show">${seg}</nav>${kind === 'look' || kind === 'install' ? '' : '<a class="fbtn" href="/field/start">+ New Site Visit</a>'}${flash ? `<div class="note" style="margin:0;background:#e6f2ec;color:#1f6a43">${esc(flash)}</div>` : ''}
${lookHtml}${kind === 'look' ? '' : (shown.map(card).join('') || '<div class="fcard">Nothing here today.</div>')}<p style="font-size:12px;color:var(--mute);margin:0">Photos go to the job folder in Google Drive, not into SalesMax.</p></div><style>${FCSS}</style>`;
  return page({ title: 'Field', user, tab: 'Field', body });
}
