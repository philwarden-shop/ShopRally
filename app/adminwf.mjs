// Admin › Workflow sections from StageTargets.dc.html (Phil, Nov 13: pages must match the mockups):
// Workflows and Boards, Project Stage Rules, Stage Checklists (inline editor), Permit Document Checklists, Tags.
// Stage rules, permit lists and tags live in config "admin-extra"; checklists keep their own "checklists" config.
import { esc } from './views.mjs';
import { stageCatalog, listFor } from './checklists.mjs';
import { HOLD_REASONS } from './workflow.mjs';

export const OVERRIDE = ['Sales Manager', 'Owner/Admin', 'No one'];
export const PERMIT_SRC = ['SalesMax fills it', 'Customer', 'Design', 'Vendor', 'Electrician', 'Site survey'];
const TAG_STYLE = { 'Hold reasons': ['#fbeaec', '#8f2a34'], Flags: ['#f3f0fa', '#4a3373'], Stations: ['#e8f0fb', '#1d4f91'], 'QC issues: design': ['#fbeaec', '#8f2a34'], 'QC issues: production': ['#fbeaec', '#8f2a34'], Vendor: ['#fff4e0', '#7a4e00'], 'Hand-off': ['#e6f2ec', '#1f6a43'] };

export function wfDefaults() {
  return {
    stageRules: [
      { stage: 'Estimate', checks: [['A contact with email or phone', 1], ['A project scope or site survey', 1]], who: 'Sales Manager' },
      { stage: 'In production', checks: [['Customer approved the estimate', 1], ['Deposit paid per shop rule, or a PO for term customers', 1], ['Proofs approved, if design is needed', 1]], who: 'Owner/Admin' },
      { stage: 'Built', checks: [['Every item passed QC on the Production board', 1], ['Permits approved, if any', 1]], who: 'Sales Manager' },
      { stage: 'Complete', checks: [['Hand-off recorded: pickup signature, install photos or tracking number', 1]], who: 'Sales Manager' },
      { stage: 'Off the board', checks: [['Paid in full', 1]], who: 'No one' },
    ],
    permits: [
      { type: 'Sign permit', when: 'Permitting and Inspections line', docs: [['Signed application', 'SalesMax fills it'], ['Site plan with setbacks', 'Customer'], ['Sign drawing with sizes', 'Design'], ['Landlord / owner approval', 'Customer'], ['Wall or frontage measurements', 'Site survey']] },
      { type: 'Sign + electrical', when: 'Both permit lines', docs: [['Signed application', 'SalesMax fills it'], ['Site plan', 'Customer'], ['Sign drawing with sizes', 'Design'], ['Landlord approval letter', 'Customer'], ['UL label / listing', 'Vendor'], ['Electrician license + permit', 'Electrician']] },
      { type: 'Electrical', when: 'Electrical Permit line', docs: [['Electrical permit application', 'Electrician'], ['UL label / listing', 'Vendor'], ['Electrician license', 'Electrician'], ['Sign drawing', 'Design'], ['Power location photo', 'Site survey']] },
    ],
    cities: [{ city: 'City of Florence', docs: 'Sign area calculation for the whole frontage' }, { city: 'Kenton County PDS', docs: 'Stamped structural drawings for monument and pylon signs' }],
    tagsAdminOnly: true,
    tags: [
      { name: 'Hold reasons', hint: 'Picked when putting an item On hold', boards: 'Design and Production', task: 'Follow up, due in 2 business days', tags: HOLD_REASONS.slice() },
      { name: 'Flags', hint: 'Extra attention', boards: 'Design and Production', task: 'Concept and Design Revision only', tags: ['Rush', 'VIP customer', 'Concept (pre-sale)', 'Design Revision (automatic)', 'Reprint'] },
      { name: 'Stations', hint: 'Where in-house work is happening', boards: 'Production', task: 'No', tags: ['Cut material', 'Colex', 'Flatbed', 'Solvent', 'Plotter', 'Router', 'Laminator', 'Clear coat', 'Painting posts', 'Table work', 'Packaging'] },
      { name: 'QC issues: design', hint: 'Picked on Fail QC; sends the item back to In design', boards: 'Design and Production', task: 'Fix proof and re-send, same day', tags: ['Spelling/Grammar', 'Pixelated images', 'Wrong material', 'Wrong dimensions'] },
      { name: 'QC issues: production', hint: 'Picked on Fail QC; sends the item back to WIP', boards: 'Production', task: 'Remake / fix, same day', tags: ['Banding', 'Finishing', 'Blurry', 'Splatter'] },
      { name: 'Vendor', hint: 'Vended items', boards: 'Production', task: 'At risk: check with vendor today', tags: ['Needs ordered', 'Waiting for confirmation', 'Shipped by vendor', 'Material arrived'] },
      { name: 'Hand-off', hint: 'From the CoreBridge destination', boards: 'Production', task: 'No', tags: ['Install', 'Pickup', 'Deliver', 'Ship'] },
    ],
    retired: [],
  };
}
const clean = (v, n) => String(v ?? '').trim().replace(/\s+/g, ' ').slice(0, n);

// Changes for the Workflow tab. Returns null when the change isn't one of ours.
export function mergeWf(x, f) {
  switch (f.do) {
    case 'stagerules':
      x.stageRules = x.stageRules.map((r, i) => ({ ...r, checks: r.checks.map(([t], j) => [t, f[`c_${i}_${j}`] === 'on' ? 1 : 0]), who: OVERRIDE.includes(f[`w_${i}`]) ? f[`w_${i}`] : r.who }));
      return { x, msg: 'Project stage rules saved.' };
    case 'permits': {
      x.permits = x.permits.map((p, i) => {
        const docs = p.docs.map(([nm, src], j) => [clean(f[`n_${i}_${j}`] ?? nm, 80) || nm, PERMIT_SRC.includes(f[`s_${i}_${j}`]) ? f[`s_${i}_${j}`] : src]);
        const nn = clean(f[`n_${i}_new`], 80);
        if (nn.length >= 2 && docs.length < 20) docs.push([nn, PERMIT_SRC.includes(f[`s_${i}_new`]) ? f[`s_${i}_new`] : 'Customer']);
        return { ...p, docs };
      });
      x.cities = x.cities.map((c, i) => ({ ...c, docs: clean(f[`cd_${i}`] ?? c.docs, 140) || c.docs }));
      { const city = clean(f.city_new, 60), docs = clean(f.citydocs_new, 140); if (city.length >= 2 && docs.length >= 2 && x.cities.length < 30) x.cities = [...x.cities, { city, docs }]; }
      if (f.del) { const [i, j] = String(f.del).split(':').map(Number); if (!x.permits[i] || !x.permits[i].docs[j]) throw new Error('that document is not here'); x.permits = x.permits.map((p, n) => (n === i ? { ...p, docs: p.docs.filter((_, m) => m !== j) } : p)); return { x, msg: 'Document removed.' }; }
      return { x, msg: 'Permit document checklists saved.' };
    }
    case 'permadd': {
      const type = clean(f.type, 50);
      if (type.length < 2) throw new Error('name the permit type');
      if (x.permits.some((p) => p.type.toLowerCase() === type.toLowerCase())) throw new Error('that permit type is already here');
      if (x.permits.length >= 12) throw new Error('up to 12 permit types');
      x.permits = [...x.permits, { type, when: clean(f.when, 60) || 'Permitting and Inspections line', docs: [['Signed application', 'SalesMax fills it']] }];
      return { x, msg: `${type} added.` };
    }
    case 'tagadd': {
      const g = Number(f.g), name = clean(f.name, 40);
      if (!x.tags[g]) throw new Error('that tag group is not here');
      if (name.length < 2) throw new Error('type the tag name');
      if (x.tags[g].tags.some((t) => t.toLowerCase() === name.toLowerCase())) throw new Error('that tag is already in the list');
      if (x.tags[g].tags.length >= 30) throw new Error('up to 30 tags in a group');
      x.tags = x.tags.map((t, n) => (n === g ? { ...t, tags: [...t.tags, name] } : t));
      x.retired = (x.retired || []).filter((r) => r.toLowerCase() !== name.toLowerCase());
      return { x, msg: `${name} added.` };
    }
    case 'tagdel': {
      const g = Number(f.g), k = Number(f.k);
      const t = x.tags[g] && x.tags[g].tags[k];
      if (!t) throw new Error('that tag is not here');
      if (/automatic/i.test(t)) throw new Error('Design Revision is added automatically and can’t be removed');
      x.tags = x.tags.map((tg, n) => (n === g ? { ...tg, tags: tg.tags.filter((_, m) => m !== k) } : tg));
      x.retired = [...(x.retired || []), t].slice(-200);
      return { x, msg: `${t} retired. It stays on past items.` };
    }
    case 'tagadmin': x.tagsAdminOnly = !x.tagsAdminOnly; return { x, msg: x.tagsAdminOnly ? 'Only admins can add or rename tags.' : 'Anyone can add tags.' };
    default: return null;
  }
}

// Inline Stage Checklists editor posts here: t_<step>_<n> text, r_<step>_<n> required, t_<step>_new for a new item.
export function parseChecklistRows(f, saved, custom = []) {
  const out = { ...(saved || {}) };
  const del = String(f.del || '');
  for (const st of stageCatalog(custom)) {
    if (f[`t_${st.id}_0`] === undefined && f[`t_${st.id}_new`] === undefined) continue;
    const cur = listFor(saved, st.id);
    const rows = cur.map((it, n) => [clean(f[`t_${st.id}_${n}`] ?? it.text, 120), f[`r_${st.id}_${n}`] === 'on' ? 1 : 0]).filter(([t], n) => t && del !== `${st.id}:${n}`);
    const nn = clean(f[`t_${st.id}_new`], 120);
    if (nn && rows.length < 15) rows.push([nn, f[`r_${st.id}_new`] === 'on' ? 1 : 0]);
    out[st.id] = rows;
  }
  return out;
}

const CARD = 'background:#ffffff;border:1px solid #e3e7ee;border-radius:12px';
const BTN = 'display:inline-flex;align-items:center;gap:6px;background:#ffffff;color:#1b2436;border:1px solid #d5dbe5;text-decoration:none;font:inherit;font-weight:600;font-size:13px;padding:0 12px;min-height:36px;border-radius:8px;box-sizing:border-box;cursor:pointer;white-space:nowrap';
const SAVE = 'font:inherit;font-size:13px;font-weight:700;color:#ffffff;background:#a8343f;border:0;border-radius:8px;padding:0 14px;min-height:36px;cursor:pointer';
const ADD = 'font:inherit;font-size:13px;font-weight:600;color:#1d4f91;background:#ffffff;border:1px dashed #9db7dc;border-radius:8px;padding:0 12px;min-height:36px;cursor:pointer';
const IN = 'font:inherit;font-size:13px;min-height:32px;border:1px solid #d5dbe5;border-radius:6px;padding:0 8px;min-width:0;box-sizing:border-box';
const SEL = 'font:inherit;font-size:12px;min-height:32px;border:1px solid #d5dbe5;border-radius:6px;padding:0 4px;background:#fff';
const X = 'font:inherit;width:28px;height:28px;border:0;border-radius:6px;background:transparent;color:#5a6478;cursor:pointer';
const GRIP = '<span aria-hidden="true" style="color:#9aa6bd;font-size:13px">⋮⋮</span>';
const H = (id, title, desc) => `<div><h2 id="${id}" style="margin:0;font-size:16px;font-weight:700">${esc(title)}</h2><p style="margin:4px 0 0;font-size:13px;color:#5a6478;line-height:1.5">${esc(desc)}</p></div>`;
const CL_BOARDS = [['sales', 'Sales'], ['design', 'Design'], ['production', 'Production'], ['permits', 'Permits'], ['purchasing', 'Purchasing']];

export function workflowExtras(x0, { back = '/admin?tab=work', checklists = null, custom = [], clBoard = 'sales' } = {}) {
  const x = { ...wfDefaults(), ...(x0 || {}) };
  const act = `/admin/extra?back=${encodeURIComponent(back)}`;
  const GO = { stagerules: 'stagerules-h', permits: 'permdocs-h', permadd: 'permdocs-h', tagadd: 'tags-h', tagdel: 'tags-h', tagadmin: 'tags-h' };
  const form = (d, inner, extra = '') => `<form method="post" action="${act}"${extra || ' style="margin:0"'}><input type="hidden" name="do" value="${d}"><input type="hidden" name="go" value="${GO[d] || ''}">${inner}</form>`;

  const boards = `<section aria-labelledby="wf-h" style="${CARD};padding:16px 20px;display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;align-items:center"><div style="flex:1 1 480px">${H('wf-h', 'Workflows and Boards', 'Draw how orders move from approval to install. The Design and Production board columns come from your workflow steps. CoreBridge only gets the main status: Estimate, WIP, Built, Complete, Closed.')}</div><a href="/admin/workflow" style="${BTN};min-height:44px;font-size:14px">Open Workflow Builder</a></section>`;

  const rules = `<section aria-labelledby="stagerules-h" style="${CARD}"><div style="padding:16px 20px;border-bottom:1px solid #e3e7ee">${H('stagerules-h', 'Project Stage Rules', 'What must be true before a project can move into each stage on the Projects board. Moving backward is always allowed with a reason.')}</div>${form('stagerules', `<div style="padding:8px 20px 14px;display:flex;flex-direction:column">${x.stageRules.map((r, i) => `<div class="wfrule" style="display:grid;grid-template-columns:150px 1fr 170px;gap:12px;align-items:start;padding:10px 0;border-bottom:1px solid #eef1f5;font-size:13px"><b>Into ${esc(r.stage)}</b><div style="display:flex;flex-direction:column;gap:4px">${r.checks.map(([t, on], j) => `<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="c_${i}_${j}"${on ? ' checked' : ''} style="width:16px;height:16px;accent-color:#a8343f">${esc(t)}</label>`).join('')}</div><label style="display:flex;flex-direction:column;gap:3px;font-size:12px;font-weight:600">Who can override<select name="w_${i}" style="font:inherit;font-size:13px;min-height:32px;border:1px solid #d5dbe5;border-radius:6px;background:#fff">${OVERRIDE.map((o) => `<option${o === r.who ? ' selected' : ''}>${o}</option>`).join('')}</select></label></div>`).join('')}<div style="padding-top:12px"><button style="${SAVE}">Save Stage Rules</button></div></div>`)}</section>`;

  const cat = stageCatalog(custom);
  const cur = CL_BOARDS.some(([k]) => k === clBoard) ? clBoard : 'sales';
  const tabs = CL_BOARDS.map(([k, l]) => { const on = k === cur; return `<a role="tab" aria-selected="${on}" href="/admin?tab=work&amp;cl=${k}#stagecl-h" style="font-size:13px;font-weight:600;min-height:36px;padding:0 14px;border-radius:18px;border:1px solid ${on ? '#16213a' : '#d5dbe5'};background:${on ? '#16213a' : '#ffffff'};color:${on ? '#ffffff' : '#1b2436'};display:inline-flex;align-items:center;text-decoration:none">${l}</a>`; }).join('');
  const steps = cat.filter((s) => s.board === cur).map((s) => {
    const items = listFor(checklists, s.id);
    return `<div style="border:1px solid #e3e7ee;border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:6px"><div style="display:flex;gap:6px;align-items:center"><b style="font-size:14px">${esc(s.name)}</b>${s.custom ? '<span style="font-size:11px;font-weight:700;border-radius:10px;padding:2px 8px;background:#f3f0fa;color:#4a3373">Custom Stage</span>' : ''}</div><span style="font-size:11px;color:#5a6478">Definition of done</span>${items.map((it, n) => `<div style="display:grid;grid-template-columns:18px 1fr auto 28px;gap:6px;align-items:center">${GRIP}<input name="t_${esc(s.id)}_${n}" value="${esc(it.text)}" aria-label="Checklist item" style="${IN}"><label style="display:flex;gap:4px;align-items:center;font-size:12px;color:#3d4658"><input type="checkbox" name="r_${esc(s.id)}_${n}"${it.req ? ' checked' : ''} style="width:15px;height:15px;accent-color:#a8343f">Required</label><button name="del" value="${esc(s.id)}:${n}" aria-label="Remove ${esc(it.text)}" style="${X}">×</button></div>`).join('')}<div style="display:grid;grid-template-columns:18px 1fr auto 28px;gap:6px;align-items:center"><span aria-hidden="true" style="color:#1d4f91;font-weight:700">+</span><input name="t_${esc(s.id)}_new" placeholder="Add Item" aria-label="New checklist item for ${esc(s.name)}" style="${IN}"><label style="display:flex;gap:4px;align-items:center;font-size:12px;color:#3d4658"><input type="checkbox" name="r_${esc(s.id)}_new" style="width:15px;height:15px;accent-color:#a8343f">Required</label><span></span></div></div>`;
  }).join('');
  const cl = `<section aria-labelledby="stagecl-h" style="${CARD}"><div style="padding:16px 20px;border-bottom:1px solid #e3e7ee;display:flex;flex-direction:column;gap:10px">${H('stagecl-h', 'Stage Checklists', 'The definition of done for every stage on every board, including the Sales board. It shows on the card for that stage. "Required" items must be checked before the card can move on. Custom stages you add to a board show up here automatically.')}<div role="tablist" aria-label="Board" style="display:flex;gap:6px;flex-wrap:wrap">${tabs}</div></div><form method="post" action="/admin/checklists?back=${encodeURIComponent(`/admin?tab=work&cl=${cur}`)}" style="margin:0"><input type="hidden" name="rows" value="1"><div style="padding:14px 20px;display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px">${steps || '<p style="margin:0;font-size:13px;color:#5a6478">No stages on this board yet.</p>'}</div><div style="padding:0 20px 14px;display:flex;gap:12px;align-items:center;flex-wrap:wrap"><button style="${SAVE}">Save Checklists</button><span style="font-size:12px;color:#5a6478">Permits also have a document list per permit type, below.</span></div></form></section>`;

  const srcSel = (name, v) => `<select name="${name}" aria-label="Who supplies it" style="${SEL}">${PERMIT_SRC.map((o) => `<option${o === v ? ' selected' : ''}>${o}</option>`).join('')}</select>`;
  const plist = x.permits.map((p, i) => `<div style="border:1px solid #e3e7ee;border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:6px"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px"><b style="font-size:14px">${esc(p.type)}</b><span style="font-size:11px;color:#5a6478">${esc(p.when)}</span></div>${p.docs.map(([nm, src], j) => `<div style="display:grid;grid-template-columns:18px 1fr 120px 28px;gap:6px;align-items:center">${GRIP}<input name="n_${i}_${j}" value="${esc(nm)}" aria-label="Document name" style="${IN}">${srcSel(`s_${i}_${j}`, src)}<button name="del" value="${i}:${j}" aria-label="Remove ${esc(nm)}" style="${X}">×</button></div>`).join('')}<div style="display:grid;grid-template-columns:18px 1fr 120px 28px;gap:6px;align-items:center"><span aria-hidden="true" style="color:#1d4f91;font-weight:700">+</span><input name="n_${i}_new" placeholder="Add Document" aria-label="New document for ${esc(p.type)}" style="${IN}">${srcSel(`s_${i}_new`, 'Customer')}<span></span></div></div>`).join('');
  const cities = `<div style="padding:0 20px 14px;display:flex;flex-direction:column;gap:6px"><b style="font-size:13px">City extras</b>${x.cities.map((c, i) => `<div style="display:grid;grid-template-columns:160px 1fr;gap:10px;align-items:center;font-size:13px"><b>${esc(c.city)}</b><label style="display:flex;gap:6px;align-items:center;color:#3d4658">also needs:<input name="cd_${i}" value="${esc(c.docs)}" aria-label="Extra documents for ${esc(c.city)}" style="${IN};flex:1"></label></div>`).join('')}<div style="display:grid;grid-template-columns:160px 1fr;gap:10px;align-items:center;font-size:13px"><input name="city_new" placeholder="+ Add City Extra" aria-label="City or county" style="${IN}"><input name="citydocs_new" placeholder="What that city also needs" aria-label="What that city also needs" style="${IN}"></div></div>`;
  const permits = `<section aria-labelledby="permdocs-h" style="${CARD}"><div style="padding:16px 20px;border-bottom:1px solid #e3e7ee;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-end">${H('permdocs-h', 'Permit Document Checklists', 'The documents each permit card asks for on the Permits board. "From" says who usually supplies it. Add extras for a city that asks for more.')}<details style="position:relative"><summary style="list-style:none;${ADD};display:inline-flex;align-items:center">+ Add Permit Type</summary><div style="position:absolute;right:0;top:42px;z-index:20;width:280px;background:#fff;border:1px solid #e3e7ee;border-radius:10px;box-shadow:0 12px 32px rgba(22,33,58,.18);padding:12px">${form('permadd', `<label style="display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:600">Permit type<input name="type" required style="${IN}"></label><label style="display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:600;margin-top:8px">Which product line<input name="when" placeholder="Permitting and Inspections line" style="${IN}"></label><button style="${SAVE};margin-top:10px">Add Permit Type</button>`)}</div></details></div>${form('permits', `<div style="padding:14px 20px;display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px">${plist}</div>${cities}<div style="padding:0 20px 14px"><button style="${SAVE}">Save Permit Documents</button></div>`)}</section>`;

  const groups = x.tags.map((g, gi) => { const [bg, fg] = TAG_STYLE[g.name] || ['#eef1f5', '#3d4658']; return `<div style="border:1px solid #e3e7ee;border-radius:10px;padding:10px 14px;display:flex;flex-direction:column;gap:8px"><div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap"><h3 style="margin:0;font-size:14px;font-weight:700">${esc(g.name)}</h3><span style="font-size:12px;color:#5a6478">${esc(g.hint)}</span><span style="flex:1"></span><span style="font-size:12px;color:#3d4658">Shows on: <b>${esc(g.boards)}</b></span><span style="font-size:12px;color:#3d4658">Creates a task: <b>${esc(g.task)}</b></span></div><div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">${g.tags.map((t, k) => `<span style="display:inline-flex;align-items:center;gap:2px;font-size:12px;font-weight:600;padding:0 2px 0 10px;min-height:28px;border-radius:8px;background:${bg};color:${fg}">${esc(t)}${form('tagdel', `<input type="hidden" name="g" value="${gi}"><input type="hidden" name="k" value="${k}"><button aria-label="Retire ${esc(t)}" style="font:inherit;width:22px;height:22px;border:0;border-radius:6px;background:transparent;color:inherit;cursor:pointer">×</button>`, ' style="margin:0;display:inline"')}</span>`).join('')}<details style="position:relative"><summary style="list-style:none;cursor:pointer;font-size:12px;font-weight:600;color:#1d4f91;border:1px dashed #b9c7dd;border-radius:8px;padding:0 10px;min-height:30px;display:inline-flex;align-items:center">+ Add</summary><div style="position:absolute;left:0;top:36px;z-index:20;background:#fff;border:1px solid #e3e7ee;border-radius:10px;box-shadow:0 12px 32px rgba(22,33,58,.18);padding:10px;width:240px">${form('tagadd', `<input type="hidden" name="g" value="${gi}"><input name="name" required aria-label="New ${esc(g.name)} tag" placeholder="Tag name" style="${IN};width:100%"><button style="${SAVE};margin-top:8px">Add Tag</button>`)}</div></details></div></div>`; }).join('');
  const tags = `<section aria-labelledby="tags-h" style="${CARD};padding:16px 20px;display:flex;flex-direction:column;gap:12px"><div style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap"><div style="flex:1 1 320px">${H('tags-h', 'Tags', 'The only tags the team can put on items. Keeping one short list keeps cards clean and filters useful. Tags replace CoreBridge sub-statuses.')}</div>${form('tagadmin', `<button role="switch" aria-checked="${x.tagsAdminOnly}" style="font:inherit;font-size:13px;color:#3d4658;background:transparent;border:0;display:flex;align-items:center;gap:8px;min-height:36px;cursor:pointer"><span aria-hidden="true" style="width:16px;height:16px;border-radius:3px;border:1px solid ${x.tagsAdminOnly ? '#a8343f' : '#9aa6bd'};background:${x.tagsAdminOnly ? '#a8343f' : '#fff'};color:#fff;font-size:12px;line-height:16px;text-align:center">${x.tagsAdminOnly ? '✓' : ''}</span>Only admins can add or rename tags</button>`)}</div>${groups}<p style="margin:0;font-size:12px;color:#5a6478">Removing a tag retires it: it stays on past items for history but can't be picked again. Design Revision is added automatically and counts rounds.</p></section>`;

  return { boards, rules, cl, permits, tags, css: '<style>@media (max-width:700px){.wfrule{grid-template-columns:1fr!important}}</style>' };
}
