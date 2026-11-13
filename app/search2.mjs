// Global search like the GlobalSearch mockup: one box, results grouped by type (Projects, Customers, Contacts,
// Emails, Tasks, Calls, CoreBridge history) with the matching words highlighted and a status pill.
import { page, esc } from './views.mjs';

export const TYPES = [
  ['projects', 'Projects', 'projects', '#a8343f', 'M3 7h18v12H3z M8 7V5h8v2', '/projects'],
  ['customers', 'Customers', 'customers', '#1d4f91', 'M3 21V8l9-5 9 5v13 M9 21v-6h6v6', '/customers'],
  ['contacts', 'Contacts', 'contacts', '#1d4f91', 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21a8 8 0 0 1 16 0', '/customers'],
  ['emails', 'Emails', 'emails', '#1d4f91', 'M3 6h18v12H3z M3 7l9 6 9-6', '/activities'],
  ['tasks', 'Tasks', 'tasks', '#3d4658', 'M5 12l5 5 9-10', '/activities'],
  ['calls', 'Calls', 'calls', '#c46f1a', 'M5 4h4l2 5-3 2a11 11 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2', '/calls'],
  ['history', 'CoreBridge History', 'imported customers', '#5b3f8c', 'M4 4h16v16H4z M8 9h8 M8 13h8', '/customers/imported'],
];
const LANE = { prospect: ['Prospect', '#eef0f4', '#3d4658'], estimate: ['Estimate', '#fdf3dc', '#7a5600'], progress: ['In production', '#e6f2ec', '#1f6a43'], built: ['Built', '#e6f2ec', '#1f6a43'], complete: ['Completed', '#eef0f4', '#3d4658'], lost: ['Lost', '#eef0f4', '#3d4658'] };
const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const when = (iso) => { try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' }); } catch { return ''; } };

export function searchAll(q, { projects = [], customers = [], tasks = [], mail = [], calls = [], imported = [] } = {}) {
  const s = String(q || '').trim().toLowerCase();
  const empty = Object.fromEntries(TYPES.map(([k]) => [k, []]));
  if (s.length < 2) return empty;
  const has = (...f) => f.some((x) => String(x || '').toLowerCase().includes(s));
  const pick = (...f) => f.find((x) => String(x || '').toLowerCase().includes(s)) || f[0] || '';
  const out = { ...empty };
  out.projects = projects.filter((p) => has(p.name, p.company, p.contact, p.orderId)).map((p) => ({ title: p.orderId ? `Order ${p.orderId} · ${p.name}` : p.name, sub: [p.company, (LANE[p.lane] || [p.lane])[0], p.due ? 'due ' + when(p.due + 'T12:00:00Z') : ''].filter(Boolean).join(' · '), href: `/projects/${p.id}?mode=demo`, tag: LANE[p.lane] || null }));
  out.customers = customers.filter((c) => has(c.name)).map((c) => { const open = (c.projects || []).filter((p) => !['complete', 'lost'].includes(p.lane)).length; return { title: c.name, sub: [(c.contacts || [])[0], open ? `${open} open project${open === 1 ? '' : 's'}` : 'nothing open'].filter(Boolean).join(' · '), href: `/customers/${c.id}` }; });
  out.contacts = customers.flatMap((c) => (c.contacts || []).filter((n) => has(n)).map((n) => ({ title: n, sub: c.name, href: `/customers/${c.id}?tab=contacts` })));
  out.emails = mail.filter((m) => m.folder !== 'spam' && has(m.subject, m.from, m.name, m.to, String(m.html || m.preview || '').replace(/<[^>]+>/g, ' '))).sort((a, b) => String(b.at).localeCompare(String(a.at))).map((m) => ({ title: m.subject || '(no subject)', sub: [m.folder === 'sent' ? 'To ' + m.to : m.name || m.from, when(m.at), m.customer].filter(Boolean).join(' · '), href: m.customer ? `/customers/${slug(m.customer)}?tab=email` : '/activities', tag: m.folder === 'archive' ? ['Archived', '#eef0f4', '#3d4658'] : m.folder === 'inbox' ? ['Needs reply', '#e8f0fb', '#1d4f91'] : null }));
  out.tasks = tasks.filter((t) => !t.done && has(t.title, t.customer)).map((t) => ({ title: t.title, sub: [t.customer, t.due ? 'due ' + when(t.due + 'T12:00:00Z') : ''].filter(Boolean).join(' · '), href: '/activities' }));
  out.calls = calls.filter((c) => has(c.summary, c.agent, c.customerPhone, c.match && c.match.name, c.issue)).map((c) => ({ title: (c.match && c.match.name) || c.customerPhone || 'Call', sub: [c.agent, when(c.start), String(c.summary || c.issue || '').slice(0, 90)].filter(Boolean).join(' · '), href: '/calls' }));
  out.history = imported.filter((r) => JSON.stringify(r).toLowerCase().includes(s)).map((r) => { const a = r.defaultCustomerAddress || {}; return { title: r.companyName || `Account ${r.accountId}`, sub: [[a.city, a.state].filter(Boolean).join(', '), r.accountType === 'PROSPECT' ? 'Prospect' : 'Customer', r.isActive === false ? 'inactive' : ''].filter(Boolean).join(' · '), href: `/customers/imported/${r.accountId}` }; });
  return out;
}

export function hl(text, q) {
  const t = String(text || ''); const s = String(q || '').trim(); const i = s ? t.toLowerCase().indexOf(s.toLowerCase()) : -1;
  return i < 0 ? esc(t) : `${esc(t.slice(0, i))}<mark style="background:#fff1b8;color:inherit;border-radius:3px;padding:0 1px">${esc(t.slice(i, i + s.length))}</mark>${esc(t.slice(i + s.length))}`;
}

export function searchPage2({ user, q = '', results = null, from = '', limit = 5, show = '' }) {
  const s = String(q || '').trim();
  const R = results || searchAll('', {});
  const groups = TYPES.filter(([k]) => (R[k] || []).length && (!show || show === k));
  const total = TYPES.reduce((a, [k]) => a + (R[k] || []).length, 0);
  const scopeTab = { activities: ['emails', 'tasks', 'calls'], customers: ['customers', 'contacts', 'history'], projects: ['projects'] }[from] || [];
  const groupHtml = groups.map(([k, label, noun, color, icon, more]) => {
    const list = R[k]; const lim = show === k ? 100 : limit;
    return `<section aria-label="${esc(label)}" style="display:flex;flex-direction:column;gap:2px"><div style="display:flex;align-items:center;gap:8px;padding:6px 4px"><span style="width:26px;height:26px;border-radius:7px;background:${color}1a;color:${color};display:flex;align-items:center;justify-content:center"><svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${icon}"></path></svg></span><h2 style="margin:0;font-size:13px;font-weight:700;letter-spacing:.3px">${esc(label)}</h2><span style="font-size:12px;color:var(--mute)">${list.length}</span>${scopeTab.includes(k) ? '<span class="pill" style="background:#eef0f4;color:#3d4658;font-size:11px">This tab</span>' : ''}</div>${list.slice(0, lim).map((r) => `<a href="${esc(r.href)}" style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;text-decoration:none;color:var(--ink)" class="srow"><span style="min-width:0"><span style="display:block;font-size:14px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${hl(r.title, s)}</span><span style="display:block;font-size:12px;color:var(--mute);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${hl(r.sub, s)}</span></span>${r.tag ? `<span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px;background:${r.tag[1]};color:${r.tag[2]};white-space:nowrap">${esc(r.tag[0])}</span>` : ''}</a>`).join('')}${list.length > lim ? `<a href="/search?q=${encodeURIComponent(s)}&show=${k}" style="font-size:13px;font-weight:600;padding:4px 10px">See all ${list.length} ${esc(noun)}</a>` : ''}${show === k ? `<a href="/search?q=${encodeURIComponent(s)}" style="font-size:13px;font-weight:600;padding:4px 10px">Back to all results</a>` : ''}</section>`;
  }).join('<hr style="border:0;border-top:1px solid #eef1f5;margin:4px 0">');
  const body = `<style>.srow:hover{background:#f4f6f9;text-decoration:none}</style><div class="wrap" style="max-width:720px;padding-top:18px"><section aria-label="Search" style="background:#fff;border:1px solid #e3e7ee;border-radius:14px;box-shadow:0 8px 24px rgba(22,33,58,.08);padding:14px;display:flex;flex-direction:column;gap:10px"><form role="search" action="/search" style="display:flex;align-items:center;gap:8px;border:2px solid #16213a;border-radius:10px;padding:0 6px 0 12px"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5a6478" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-4-4"></path></svg><label for="sq" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Search everything</label><input id="sq" name="q" value="${esc(s)}" autofocus placeholder="Search everything: names, estimate or order #, email words" style="flex:1;font:inherit;font-size:16px;min-height:46px;border:0;outline:none;background:transparent">${s ? `<a href="/search" aria-label="Clear search" style="width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:8px;color:#3d4658;text-decoration:none;font-size:20px">×</a>` : ''}</form>
${s.length >= 2 ? `<div style="font-size:13px;color:var(--mute);padding:0 4px">${total ? `${total} result${total === 1 ? '' : 's'} for “${esc(s)}”` : ''}</div>` : s ? '<div style="font-size:13px;color:var(--mute);padding:0 4px">Type at least 2 letters.</div>' : '<div style="font-size:13px;color:var(--mute);padding:0 4px">Projects, customers, contacts, emails, tasks, calls and CoreBridge history.</div>'}
${s.length >= 2 && !total ? `<div style="padding:16px 8px;font-size:14px">No matches for “${esc(s)}”. Try a name, an estimate or order #, or a phrase from an email.</div>` : groupHtml}
</section></div>`;
  return page({ title: 'Search', user, tab: '', body });
}
