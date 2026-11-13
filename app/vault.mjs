// Connected-app keys. The owner types them into Admin > Connected Apps; SalesMax stores them in AWS Secrets Manager
// (one secret per app) and never shows them again — only the last 4 characters. Blank fields keep what is saved.
import { page, esc } from './views.mjs';

export const APPS = {
  clarity: { name: 'Clarity Voice', help: 'Completed phone calls (with summaries) come into SalesMax and land on the customer record.', fields: [['signingKey', 'Signing Secret (X-Genie-Signing-Key)', true]] },
  corebridge: { name: 'CoreBridge', help: 'Your shop’s own CoreBridge account. Customers, contacts, estimates and orders sync from here. Each licensee connects their own. (NKY uses the shared connector until it moves here.)', fields: [['businessId', 'CoreBridge Business ID', false], ['clientId', 'API Client ID', false], ['clientSecret', 'API Client Secret', true]] },
  xps: { name: 'XPS Ship', help: 'Labels, tracking and shipping cost. Find these in XPS under API Key settings.', fields: [['customerId', 'Customer ID', false], ['integrationId', 'REST API Integration ID', false], ['apiKey', 'API Key', true]] },
  cardpointe: { name: 'Fiserv CardPointe', help: 'Card and eCheck payments on the customer order page. From Fiserv.', fields: [['merchantId', 'Merchant ID', false], ['site', 'Site (e.g. fts-uat)', false], ['apiUsername', 'API Username', false], ['apiPassword', 'API Password', true]] },
};

const prefix = () => `/fastsigns-nky/salesmax2-${process.env.APP_ENV || 'test'}/conn/`;
export const secretName = (app) => `${prefix()}${app}`;

let SM;
async function sm() {
  if (globalThis.__SMX_FAKE_SECRETS) return globalThis.__SMX_FAKE_SECRETS;
  if (!SM) { const m = await import('@aws-sdk/client-secrets-manager'); const c = new m.SecretsManagerClient({}); SM = { get: async (n) => { try { return JSON.parse((await c.send(new m.GetSecretValueCommand({ SecretId: n }))).SecretString); } catch (e) { if (e.name === 'ResourceNotFoundException') return null; throw e; } }, put: async (n, v) => { const s = JSON.stringify(v); try { await c.send(new m.PutSecretValueCommand({ SecretId: n, SecretString: s })); } catch (e) { if (e.name !== 'ResourceNotFoundException') throw e; await c.send(new m.CreateSecretCommand({ Name: n, SecretString: s, Description: 'SalesMax connected app credentials' })); } } }; }
  return SM;
}

export async function readApp(app) { if (!APPS[app]) throw new Error('unknown app'); return (await (await sm()).get(secretName(app))) || null; }

export function mergeAppForm(app, prev, f) {
  const def = APPS[app];
  if (!def) throw new Error('unknown app');
  const out = { ...(prev || {}) };
  let changed = 0;
  for (const [k, label] of def.fields) {
    const v = String(f[k] ?? '').trim();
    if (!v) continue;
    if (v.length > 500 || /\s/.test(v)) throw new Error(`${label} doesn't look right (no spaces)`);
    out[k] = v; changed++;
  }
  if (!changed) throw new Error('nothing to save. Type at least one value');
  out.updatedAt = new Date().toISOString();
  return out;
}
export async function saveApp(app, f, by) {
  const prev = await readApp(app);
  const next = { ...mergeAppForm(app, prev, f), updatedBy: by };
  await (await sm()).put(secretName(app), next);
  return next;
}

// Short values (8 characters or fewer) show dots only, so the last 4 never gives away most of the value.
export const masked = (v) => (!v ? 'Not set' : String(v).length > 8 ? `••••${String(v).slice(-4)}` : '••••');
export function appStatus(app, saved) {
  const def = APPS[app];
  const missing = def.fields.filter(([k]) => !saved || !saved[k]).map(([, l]) => l);
  return { connected: !missing.length, missing };
}

export function connectionsPage({ user, saved = {}, flash = '', parallel = false, extras = {} }) {
  const cards = Object.entries(APPS).map(([id, def]) => {
    const s = saved[id];
    const st = appStatus(id, s);
    return `<section class="panel" aria-label="${esc(def.name)}"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><h2 style="margin:0;font-size:15px">${esc(def.name)}</h2><span class="pill" style="background:${st.connected ? '#e6f2ec' : '#fdf3dc'};color:${st.connected ? '#1f6a43' : '#7a4e00'}">${st.connected ? 'Keys saved' : 'Needs: ' + esc(st.missing.join(', '))}</span></div>
<p style="margin:6px 0 10px;font-size:13px;color:var(--mute)">${esc(def.help)}</p>
<form method="post" action="/admin/connections/${id}" autocomplete="off" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px;align-items:end">
${def.fields.map(([k, l]) => `<label style="display:flex;flex-direction:column;font-size:12px">${esc(l)} <span style="color:var(--mute)">Saved: ${esc(s && s[k] ? masked(s[k]) : "Not set")}</span><input name="${k}" type="password" autocomplete="off" spellcheck="false" placeholder="${s && s[k] ? 'Leave blank to keep' : ''}" style="font:inherit;min-height:36px;border:1px solid #d5dbe5;border-radius:8px;padding:0 8px"></label>`).join('')}
<button class="btn primary">Save ${esc(def.name)} Keys</button></form>${s && s.updatedAt ? `<p style="margin:8px 0 0;font-size:12px;color:var(--mute)">Last saved ${esc(new Date(s.updatedAt).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }))}.</p>` : ''}${extras[id] || ''}</section>`;
  }).join('');
  const body = `<div class="wrap" style="max-width:860px"><div class="bar" style="padding:14px 0"><h1>Connected Apps &amp; Keys</h1></div><div style="font-size:13px;color:var(--mute);margin:-6px 0 8px"><a href="/admin" style="color:#1d4f91">Admin Settings</a> › Connected Apps &amp; Keys · Owners only</div>${flash ? `<div role="${/^(Could not|Not saved)/.test(flash) ? 'alert' : 'status'}" class="note" style="margin:0 0 12px;${/^(Could not|Not saved)/.test(flash) ? 'background:#fbeaec;color:#8f2a34' : 'background:#e6f2ec;color:#1f6a43'}">${esc(flash)}${/^Could not/.test(flash) ? ' <a href="/admin/connections" style="color:#8f2a34;font-weight:700">Try Again</a>' : ''}</div>` : ''}
<p style="margin:0 0 12px;font-size:13px">Keys are sent straight to AWS Secrets Manager and locked there. SalesMax never shows them again, only the last 4 characters. Leave a box blank to keep what is saved.</p>
<section class="panel" aria-label="Parallel Mode"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><h2 style="margin:0;font-size:15px">Parallel Mode</h2><span class="pill" style="background:${parallel ? '#e6f2ec' : '#eef1f5'};color:${parallel ? '#1f6a43' : '#3d4a5c'}">${parallel ? 'On' : 'Off'}</span></div><p style="margin:6px 0 10px;font-size:13px">One switch for all of SalesMax, owners only. Run SalesMax next to CoreBridge with real data while the team keeps working in CoreBridge.</p><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:8px;margin:0 0 10px;font-size:13px"><div style="background:#e6f2ec;border-radius:8px;padding:8px 10px"><b style="color:#1f6a43">Still on</b><div>Copy of customers, contacts, estimates and orders from CoreBridge. Screens, boards and reports.</div></div><div style="background:#fdf3dc;border-radius:8px;padding:8px 10px"><b style="color:#7a4e00">Turned off</b><div>Customer emails, CoreBridge changes, XPS orders and labels, payment links.</div></div></div><form method="post" action="/admin/parallel" style="margin:0"><input type="hidden" name="on" value="${parallel ? '0' : '1'}"><button class="btn${parallel ? '' : ' primary'}">${parallel ? 'Turn Parallel Mode Off' : 'Turn Parallel Mode On'}</button></form></section>
${cards}</div>`;
  return page({ title: 'Connected Apps', user, tab: '', body });
}
