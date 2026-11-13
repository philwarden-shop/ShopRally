// Account menu (PW): location, 5 themes, Preview SalesMax As (admins & managers), links. No script needed (<details>).
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const LOCATIONS = [['nky', 'Northern Kentucky', '#4fb3c9'], ['two', 'Second location', '#f2b84b']];
export const THEMES = {
  Classic: { bg: '#f4f6f9', panel: '#ffffff', nav: '#16213a', ink: '#1b2436', line: '#e3e7ee', lane: '#e9edf3', accent: '#a8343f' },
  'Slate Blue': { bg: '#eef2f8', panel: '#fbfcfe', nav: '#1d3557', ink: '#1b2436', line: '#dbe3ef', lane: '#e2e9f3', accent: '#1d4f91' },
  Sage: { bg: '#eef3ef', panel: '#fbfdfb', nav: '#22392d', ink: '#1c2a22', line: '#dbe5de', lane: '#e2ebe4', accent: '#2f6b4f' },
  'Warm Sand': { bg: '#f6f2ec', panel: '#fffdf9', nav: '#3a2f28', ink: '#2a221c', line: '#eadfd2', lane: '#efe7dc', accent: '#a0522d' },
  Dark: { bg: '#12161f', panel: '#1b2130', nav: '#0c1018', ink: '#e6e9ef', line: '#2c3446', lane: '#161b27', accent: '#e06b74', mute: '#a9b2c3' },
};
export const ROLES = [['sales', 'Sales'], ['design', 'Design'], ['production', 'Production'], ['permits', 'Permits'], ['purchasing', 'Purchasing']];

export function readPrefs(jar = {}) {
  const theme = THEMES[decodeURIComponent(jar.smx_theme || '')] ? decodeURIComponent(jar.smx_theme) : 'Classic';
  const loc = LOCATIONS.some(([k]) => k === jar.smx_loc) ? jar.smx_loc : 'nky';
  const as = ROLES.some(([k]) => k === jar.smx_as) ? jar.smx_as : 'sales';
  return { theme, loc, as };
}

// Returns cookie [name, value] pairs to set; refuses unknown values.
export function prefChange(f) {
  if (f.theme != null) { if (!THEMES[f.theme]) throw new Error('unknown theme'); return [['smx_theme', encodeURIComponent(f.theme)]]; }
  if (f.loc != null) { if (!LOCATIONS.some(([k]) => k === f.loc)) throw new Error('unknown location'); return [['smx_loc', f.loc]]; }
  if (f.as != null) { if (!ROLES.some(([k]) => k === f.as)) throw new Error('unknown role'); return [['smx_as', f.as]]; }
  throw new Error('nothing to change');
}

export function themeCss(name) {
  const t = THEMES[name] || THEMES.Classic;
  return `:root{--navy:${t.nav};--bg:${t.bg};--ink:${t.ink};--line:${t.line};--red:${t.accent}${t.mute ? `;--mute:${t.mute}` : ''}}
body{background:var(--bg)}.panel,.card,.task,.tile,.btn,.seg a,select,input,textarea{background:${t.panel};color:var(--ink);border-color:var(--line)}.lane{background:${t.lane}}
.btn.primary{background:var(--red);border-color:var(--red);color:#fff}.seg a.on{background:var(--navy);color:#fff}.am-menu{background:${t.panel};color:var(--ink)}`;
}

export function accountMenu(user = {}, prefs = { theme: 'Classic', loc: 'nky', as: 'sales' }, { canPreview = true } = {}) {
  const initials = String(user.name || user.email || '?').split(/[ @.]/).filter(Boolean).slice(0, 2).map((s) => s[0].toUpperCase()).join('');
  const cur = LOCATIONS.find(([k]) => k === prefs.loc) || LOCATIONS[0];
  const head = 'font-size:11px;font-weight:700;letter-spacing:.6px;color:#5a6478;padding:6px 10px 0';
  const item = 'font:inherit;text-align:left;display:flex;align-items:center;gap:10px;width:100%;padding:6px 10px;min-height:40px;border-radius:8px;border:0;cursor:pointer;color:inherit;background:transparent';
  const locs = LOCATIONS.map(([k, n, dot]) => `<form method="post" action="/me/prefs"><input type="hidden" name="loc" value="${k}"><button style="${item}${k === cur[0] ? ';background:#f4f6f9' : ''}" role="menuitemradio" aria-checked="${k === cur[0]}"><span aria-hidden="true" style="width:10px;height:10px;border-radius:5px;background:${dot}"></span><span style="flex:1">${esc(n)}</span>${k === cur[0] ? '✓' : ''}</button></form>`).join('');
  const themes = Object.entries(THEMES).map(([n, t]) => `<form method="post" action="/me/prefs"><input type="hidden" name="theme" value="${esc(n)}"><button aria-label="${esc(n)} theme" title="${esc(n)}" aria-pressed="${n === prefs.theme}" style="width:36px;height:36px;border-radius:10px;border:2px solid ${n === prefs.theme ? '#1d4f91' : '#d5dbe5'};background:${t.bg};padding:3px;cursor:pointer;display:flex;flex-direction:column;gap:2px"><span style="height:8px;border-radius:3px;background:${t.nav}"></span><span style="flex:1;border-radius:3px;background:${t.panel}"></span></button></form>`).join('');
  const roles = ROLES.map(([k, l]) => `<form method="post" action="/me/prefs"><input type="hidden" name="as" value="${k}"><button style="font:inherit;font-size:12px;font-weight:600;color:#4a3373;background:${k === prefs.as ? '#e4dcf5' : '#f3f0fa'};border:0;border-radius:12px;padding:4px 10px;cursor:pointer">${esc(l)}</button></form>`).join('');
  const links = [['My Profile & Settings', '/me'], ['Out of Office & Signature', '/me#ooo'], ['Admin Settings', '/admin'], ['Billing & Add-ons', '/billing'], ['Send Feedback', '/feedback'], ['Help', '/help'], ['Sign Out', '/logout']].map(([l, h]) => `<a role="menuitem" href="${h}" style="display:flex;align-items:center;min-height:38px;padding:0 10px;border-radius:8px;font-weight:600;color:inherit">${l}</a>`).join('');
  return `<details class="am" style="position:relative"><summary aria-label="${esc(user.email || 'Account')}, ${esc(cur[1])}. Account, location, theme and settings" style="list-style:none;cursor:pointer;display:flex;align-items:center;gap:6px;min-height:44px">
<span class="av">${esc(initials)}<i style="background:${cur[2]}"></i></span><span style="color:#fff;display:inline-flex"><svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"></path></svg></span></summary>
<div class="am-menu" role="menu" style="position:absolute;right:0;top:48px;z-index:80;width:300px;background:#fff;color:#1b2436;border:1px solid #e3e7ee;border-radius:12px;box-shadow:0 12px 32px rgba(22,33,58,.25);padding:8px;display:flex;flex-direction:column;gap:4px;font-size:13px">
<div style="padding:6px 10px 8px;border-bottom:1px solid #eef1f5"><b>${esc(user.name || user.email || '')}</b></div>
<div style="${head}">LOCATION</div>${locs}
<div style="${head};border-top:1px solid #eef1f5">THEME</div><div role="group" aria-label="Theme" style="display:flex;gap:8px;padding:4px 10px">${themes}</div><div style="font-size:11px;color:#5a6478;padding:0 10px">Theme: ${esc(prefs.theme)}</div>
${canPreview ? `<div style="${head};border-top:1px solid #eef1f5">PREVIEW SALESMAX AS</div><div style="display:flex;flex-wrap:wrap;gap:6px;padding:4px 10px 6px">${roles}</div>` : ''}
<div style="border-top:1px solid #eef1f5;padding-top:4px">${links}</div></div></details>`;
}
