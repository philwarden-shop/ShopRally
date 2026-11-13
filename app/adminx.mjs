// Admin › Company & Team extra sections from StageTargets.dc.html: Sales Tax and Price Multipliers, Commission Plans,
// Roles & Access (feature × role matrix with plan packages), Discount Limits, Features. Stored in config "admin-extra".
import { esc } from './views.mjs';

export const XROLES = [['Inside Sales', 'Inside'], ['Outside Sales', 'Outside'], ['Sales Manager', 'Manager'], ['Designer', 'Design'], ['Production', 'Prod.'], ['Owner/Admin', 'Admin']];
export const XFEATS = [
  ['Activities & to-dos', 'Core', [1, 1, 1, 1, 1, 1]], ['Customers & contacts', 'Core', [1, 1, 1, 0, 0, 1]], ['Projects & orders', 'Core', [1, 1, 1, 1, 1, 1]],
  ['Plan visits & routes', 'Field Sales', [0, 1, 1, 0, 0, 1]], ['Market penetration', 'Field Sales', [0, 1, 1, 0, 0, 1]], ['Claim untapped businesses', 'Field Sales', [0, 1, 1, 0, 0, 1]], ['Site visits & surveys', 'Field Sales', [0, 1, 1, 0, 0, 1]],
  ['Build estimate & pricing', 'Pricing & Quoting', [1, 1, 1, 0, 0, 1]], ['AI Estimator', 'Pricing & Quoting', [1, 1, 1, 0, 0, 1]], ['Modifier price list', 'Pricing & Quoting', [0, 0, 1, 0, 0, 1]],
  ['Send proofs', 'Core', [1, 1, 1, 1, 0, 1]], ['Design board', 'Core', [0, 0, 1, 1, 1, 1]], ['Production board', 'Core', [0, 0, 1, 1, 1, 1]],
  ['Order portal payments', 'Payments', [1, 1, 1, 0, 0, 1]], ['Daily offline payment list', 'Payments', [1, 0, 1, 0, 0, 1]],
  ['Team performance (everyone)', 'Core', [0, 0, 1, 0, 0, 1]], ['Admin settings', 'Core', [0, 0, 0, 0, 0, 1]],
];
const PKG = { 'Core': ['#eef0f4', '#3d4658'], 'Field Sales': ['#e6f2ec', '#1f6a43'], 'Pricing & Quoting': ['#e8eefa', '#1d4f91'], 'Payments': ['#fdf3dc', '#7a5600'] };
const PRICE = { 'Field Sales': '$49/mo', 'Pricing & Quoting': '$79/mo', 'Payments': '$39/mo' };

export function extraDefaults() {
  return {
    taxes: [{ name: 'Kentucky State Tax', rate: 6, scope: 'applies to all KY locations' }, { name: 'Ohio · Hamilton County', rate: 7.8, scope: '' }],
    plans: [{ name: 'Standard', rule: '5% of gross profit on closed orders', tag: '4 people' }, { name: 'House accounts', rule: 'No commission', tag: 'House' }, { name: 'Tag-team split', rule: 'Second salesperson gets the share set on the order (default 30%)', tag: 'Default' }],
    access: Object.fromEntries(XFEATS.map(([f, , on]) => [f, on.slice()])),
    owned: { 'Core': true, 'Field Sales': true, 'Pricing & Quoting': true, 'Payments': false },
    discount: [5, 10, 20, 0, 0, 100],
    cleanup: false,
  };
}
const clean = (v, n) => String(v ?? '').trim().replace(/\s+/g, ' ').slice(0, n);
export function mergeExtra(prev, f) {
  const x = { ...extraDefaults(), ...(prev || {}) };
  switch (f.do) {
    case 'tax': {
      const name = clean(f.name, 60), rate = Number(f.rate);
      if (name.length < 3) throw new Error('name the tax agency');
      if (String(f.rate ?? '').trim() === '' || !Number.isFinite(rate) || rate < 0 || rate > 20) throw new Error('the tax rate must be 0 to 20%');
      if (x.taxes.length >= 30) throw new Error('up to 30 tax agencies');
      x.taxes = [...x.taxes, { name, rate: Math.round(rate * 1000) / 1000, scope: clean(f.scope, 80) }];
      return { x, msg: 'Tax agency added.' };
    }
    case 'deltax': { const i = Number(f.i); if (!x.taxes[i]) throw new Error('that tax agency is not here'); x.taxes = x.taxes.filter((_, n) => n !== i); return { x, msg: 'Tax agency removed.' }; }
    case 'plan': {
      const name = clean(f.name, 40), rule = clean(f.rule, 120);
      if (name.length < 2 || rule.length < 3) throw new Error('give the plan a name and a rule');
      if (x.plans.length >= 20) throw new Error('up to 20 plans');
      x.plans = [...x.plans, { name, rule, tag: '' }];
      return { x, msg: 'Commission plan added.' };
    }
    case 'access': {
      const acc = {};
      XFEATS.forEach(([feat, pkg, def], fi) => { acc[feat] = XROLES.map((_, ri) => (feat === 'Admin settings' && ri === 5 ? 1 : (x.owned[pkg] ? (f[`a_${fi}_${ri}`] === 'on' ? 1 : 0) : def[ri]))); });
      x.access = acc;
      return { x, msg: 'Roles and access saved.' };
    }
    case 'discount': {
      x.discount = XROLES.map((_, ri) => { const n = Number(f[`d_${ri}`]); if (String(f[`d_${ri}`] ?? '').trim() === '' || !Number.isFinite(n) || n < 0 || n > 100) throw new Error('discount limits must be 0 to 100%'); return Math.round(n); });
      return { x, msg: 'Discount limits saved.' };
    }
    case 'cleanup': x.cleanup = !x.cleanup; return { x, msg: `Clean up contacts is ${x.cleanup ? 'on' : 'off'}.` };
    default: throw new Error('unknown change');
  }
}

const CARD = 'background:#ffffff;border:1px solid #e3e7ee;border-radius:12px';
const IN = 'font:inherit;font-size:13px;min-height:36px;border:1px solid #d5dbe5;border-radius:8px;padding:0 10px;box-sizing:border-box';
const addBtn = 'font:inherit;font-size:13px;font-weight:600;color:#1d4f91;background:#ffffff;border:1px dashed #9db7dc;border-radius:8px;padding:0 12px;min-height:36px;cursor:pointer';
const pill = (t, bg, fg) => `<span style="font-size:11px;font-weight:700;border-radius:10px;padding:2px 9px;background:${bg};color:${fg};white-space:nowrap">${esc(t)}</span>`;
const row3 = (a, b, c) => `<div style="display:grid;grid-template-columns:minmax(150px,1fr) minmax(0,2fr) auto;gap:12px;align-items:center;padding:8px 0;border-bottom:1px solid #eef1f5;font-size:13px"><span style="font-weight:600">${a}</span><span style="color:#3d4658;line-height:1.45">${b}</span>${c}</div>`;
const head = (title, desc, action = '', tip = '') => `<div style="padding:16px 20px;border-bottom:1px solid #e3e7ee;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-end"><div style="flex:1 1 420px"><h2 style="margin:0;font-size:16px;font-weight:700;display:flex;align-items:center;gap:4px">${esc(title)}${tip}</h2><p style="margin:4px 0 0;font-size:13px;color:#5a6478;line-height:1.5">${esc(desc)}</p></div>${action}</div>`;

export function companyExtras(x0, { locName = 'FASTSIGNS of Northern Kentucky', tip = () => '' } = {}) {
  const x = { ...extraDefaults(), ...(x0 || {}) };
  const f = (d, inner) => `<form method="post" action="/admin/extra" style="margin:0"><input type="hidden" name="do" value="${d}">${inner}</form>`;
  const tax = `<section aria-label="Sales Tax and Price Multipliers" style="${CARD}">${head('Sales Tax and Price Multipliers', 'Tax agencies and rates, the tax group for each customer location, and a price multiplier per location (100% = no change). Needed for the second location and for onboarding new licensees.', `<details style="position:relative"><summary style="list-style:none;${addBtn};display:inline-flex;align-items:center">+ Add Tax Agency</summary><div style="position:absolute;right:0;top:42px;z-index:20;width:300px;${CARD};box-shadow:0 12px 32px rgba(22,33,58,.18);padding:12px">${f('tax', `<label style="display:block;font-size:12px;margin-bottom:6px">Agency<input name="name" required style="${IN};width:100%" placeholder="Boone County"></label><label style="display:block;font-size:12px;margin-bottom:6px">Rate (%)<input name="rate" type="number" step="0.001" min="0" max="20" required style="${IN};width:120px"></label><label style="display:block;font-size:12px;margin-bottom:8px">Applies to<input name="scope" style="${IN};width:100%" placeholder="Boone County deliveries"></label><button class="btn primary">Add</button>`)}</div></details>`)}<div style="padding:6px 20px 12px">${x.taxes.map((t, i) => row3(esc(t.name), `${Number(t.rate).toFixed(3)}%${t.scope ? ' · ' + esc(t.scope) : ''}`, `<span style="display:inline-flex;gap:6px;align-items:center">${pill('Active', '#e6f2ec', '#1f6a43')}${f('deltax', `<input type="hidden" name="i" value="${i}"><button aria-label="Remove ${esc(t.name)}" title="Remove" style="font:inherit;border:0;background:transparent;color:#5a6478;cursor:pointer;width:24px;height:24px">×</button>`)}</span>`)).join('')}${row3(esc(locName), 'Price multiplier: parts 100%, modifiers 100%, setup fees 100%', pill('Main', '#e8f0fb', '#1d4f91'))}${row3('Second location', 'Price multiplier 100% · revenue split when billed and produced at different locations: off', pill('Setup', '#fdf3dc', '#7a4e00'))}</div></section>`;
  const plans = `<section aria-label="Commission Plans" style="${CARD}">${head('Commission Plans', 'Plans assigned to each salesperson. Tag-team orders split credit between two salespeople.', `<details style="position:relative"><summary style="list-style:none;${addBtn};display:inline-flex;align-items:center">+ Add Plan</summary><div style="position:absolute;right:0;top:42px;z-index:20;width:320px;${CARD};box-shadow:0 12px 32px rgba(22,33,58,.18);padding:12px">${f('plan', `<label style="display:block;font-size:12px;margin-bottom:6px">Plan name<input name="name" required style="${IN};width:100%" placeholder="New hire"></label><label style="display:block;font-size:12px;margin-bottom:8px">Rule<input name="rule" required style="${IN};width:100%" placeholder="3% of gross profit for the first 90 days"></label><button class="btn primary">Add</button>`)}</div></details>`)}<div style="padding:6px 20px 12px">${x.plans.map((p) => row3(esc(p.name), esc(p.rule), p.tag ? pill(p.tag, p.tag === 'Default' ? '#e8f0fb' : '#eef0f4', p.tag === 'Default' ? '#1d4f91' : '#3d4658') : '<span></span>')).join('')}<div style="font-size:12px;color:#5a6478;padding-top:8px">Each person also has: salesperson and designer flags, include in goals, default location.</div></div></section>`;
  const pkgs = Object.keys(PKG).map((k) => { const own = !!x.owned[k]; const [bg, fg] = PKG[k]; return `<span style="display:inline-flex;align-items:center;gap:6px;border:1px solid ${own ? bg : '#d5dbe5'};background:${own ? bg : '#ffffff'};border-radius:16px;padding:3px ${own ? '10px' : '4px'} 3px 10px;min-height:28px;color:${own ? fg : '#3d4658'};font-weight:600">${k} <span style="font-size:11px;font-weight:600">${k === 'Core' ? 'Included' : own ? '✓ Active' : 'Not included'}</span>${own ? '' : `<a href="/billing" style="font-size:12px;font-weight:700;background:#1d4f91;color:#ffffff;border-radius:12px;padding:0 10px;min-height:24px;display:inline-flex;align-items:center;text-decoration:none">Add · ${PRICE[k]}</a>`}</span>`; }).join('');
  const grid = 'display:grid;grid-template-columns:minmax(200px,1.6fr) 130px repeat(6,minmax(64px,1fr));gap:6px;align-items:center;padding:8px 14px;min-width:760px';
  const matrix = `<div role="table" aria-label="Feature access by role" style="border:1px solid #e3e7ee;border-radius:10px;overflow:auto"><div role="row" style="${grid};background:#f6f7f9;font-size:11px;font-weight:700;letter-spacing:.3px;color:#5a6478"><span role="columnheader">FEATURE</span><span role="columnheader">PACKAGE</span>${XROLES.map(([n, s]) => `<span role="columnheader" title="${esc(n)}" style="text-align:center">${esc(s.toUpperCase())}</span>`).join('')}</div>${XFEATS.map(([feat, pkg], fi) => { const own = !!x.owned[pkg]; const [bg, fg] = PKG[pkg]; const on = (x.access[feat] || []); return `<div role="row" style="${grid};border-top:1px solid #eef1f5;font-size:13px;${own ? '' : 'opacity:.55'}"><span role="cell" style="font-weight:600">${own ? '' : '\u{1F512} '}${esc(feat)}${own ? '' : '<span style="display:block;font-size:11px;font-weight:600;color:#7a4e00">Not in your plan</span>'}</span><span role="cell"><span style="font-size:11px;font-weight:700;background:${bg};color:${fg};border-radius:10px;padding:2px 8px;white-space:nowrap">${esc(pkg)}</span></span>${XROLES.map((r, ri) => `<span role="cell" style="text-align:center"><input type="checkbox" name="a_${fi}_${ri}" aria-label="${esc(feat)} for ${esc(r[0])}" ${own && on[ri] ? 'checked' : ''} ${!own || (feat === 'Admin settings' && ri === 5) ? 'disabled' : ''} style="width:18px;height:18px;accent-color:#a8343f"></span>`).join('')}</div>`; }).join('')}</div>`;
  const roles = `<section aria-label="Roles and Access" style="${CARD};padding:16px 20px;display:flex;flex-direction:column;gap:12px"><div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-start;gap:12px"><div><div style="display:flex;align-items:center;gap:4px"><h2 style="margin:0;font-size:16px;font-weight:700">Roles &amp; Access</h2>${tip('A person can have more than one role (for example Design + Production); they get every board and feature their roles allow. A feature that’s off for a role is hidden from that person’s screens. Features in an add-on package only appear if this location’s plan includes it.', 'About roles and access')}</div><p style="margin:4px 0 0;font-size:13px;color:#5a6478">Who sees what. Turning a feature off hides it, which keeps each person’s screens simple.</p></div><span style="font-size:13px;font-weight:600;color:#3d4658">To see the whole app as a role, use <b>Preview SalesMax As</b> in your account menu.</span></div><div aria-label="This location's plan" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;font-size:13px"><span style="font-weight:700">Your plan:</span>${pkgs}</div>${f('access', `${matrix}<div style="padding-top:10px"><button class="btn primary">Save Roles &amp; Access</button></div>`)}</section>`;
  const disc = `<section aria-label="Discount Limits" style="${CARD};padding:16px 20px;display:flex;flex-direction:column;gap:12px"><div><div style="display:flex;align-items:center;gap:4px"><h2 style="margin:0;font-size:16px;font-weight:700">Discount Limits</h2>${tip('The most a person can discount an estimate on their own. Anything above their limit goes to their manager to approve before the estimate can be sent.', 'About discount limits')}</div><p style="margin:4px 0 0;font-size:13px;color:#5a6478">Set a limit for each role, then raise or lower it for a person.</p></div>${f('discount', `<div class="xdisc" style="display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px">${XROLES.map(([n], ri) => `<label style="display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:600;color:#3d4658"><span>${esc(n)}</span><span style="display:inline-flex;align-items:center;gap:4px;font-weight:400"><input type="number" name="d_${ri}" min="0" max="100" value="${esc(x.discount[ri])}" style="${IN};width:76px;text-align:right">%</span></label>`).join('')}</div><div style="padding-top:10px"><button class="btn primary">Save Discount Limits</button></div>`)}</section>`;
  const feats = `<section aria-label="Features" style="${CARD};padding:16px 20px;display:flex;flex-direction:column;gap:12px"><h2 style="margin:0;font-size:16px;font-weight:700">Features</h2><div style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;border-bottom:1px solid #eef1f5;padding-bottom:10px"><span style="flex:1 1 360px"><span style="font-size:14px;font-weight:600;display:block">Clean up contacts</span><span style="font-size:13px;color:#5a6478">Suggests merges, inactive contacts and missing info on Customers, and updates CoreBridge after you confirm. Off for now; revisit later.</span></span>${f('cleanup', `<button role="switch" aria-checked="${x.cleanup}" aria-label="Clean up contacts" style="font:inherit;display:inline-flex;align-items:center;gap:10px;background:transparent;border:0;cursor:pointer;min-height:44px;padding:0"><span style="position:relative;width:46px;height:26px;border-radius:13px;background:${x.cleanup ? '#1f6a43' : '#9aa6bd'};display:inline-block"><span style="position:absolute;top:3px;left:${x.cleanup ? '23px' : '3px'};width:20px;height:20px;border-radius:10px;background:#ffffff"></span></span><span style="font-size:13px;font-weight:700;width:24px">${x.cleanup ? 'On' : 'Off'}</span></button>`)}</div></section>`;
  return tax + plans + roles + disc + feats + '<style>@media (max-width:760px){.xdisc{grid-template-columns:repeat(2,minmax(0,1fr))!important}}</style>';
}
