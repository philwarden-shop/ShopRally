// Public quote request form (no sign-in). Creates a Prospect project and a "Quote request QR-####" task.
import { esc } from './views.mjs';

const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
export function parseRequest(f) {
  if (String(f.website || '').trim()) throw new Error('spam');            // honeypot field, hidden from people
  const name = String(f.name || '').trim(), company = String(f.company || '').trim(), email = String(f.email || '').trim();
  const phone = String(f.phone || '').trim(), what = String(f.what || '').trim(), when = String(f.when || '').trim();
  if (name.length < 2) throw new Error('please add your name');
  if (!EMAIL.test(email) && phone.replace(/\D/g, '').length < 7) throw new Error('please add an email or phone number so we can reach you');
  if (email && !EMAIL.test(email)) throw new Error('that email address does not look right');
  if (what.length < 5) throw new Error('please tell us a little about what you need');
  return { name: name.slice(0, 80), company: (company || name).slice(0, 120), email: email.slice(0, 120), phone: phone.slice(0, 25), what: what.slice(0, 2000), when: /^\d{4}-\d{2}-\d{2}$/.test(when) ? when : '' };
}

export function nextQr(n) { return 'QR-' + String(n).padStart(4, '0'); }

export function requestToRecords(r, { qrNumber, today, id = 'new-' + Date.now().toString(36) }) {
  const qr = nextQr(qrNumber);
  const project = { id, lane: 'prospect', name: r.what.split(/[.\n]/)[0].slice(0, 60) || 'Quote request', company: r.company, contact: r.name, total: 0, due: r.when, priority: 'Medium', status: `Quote request ${qr}`, insight: '', items: [], salesperson: '', source: 'web-request', request: { ...r, qr } };
  const task = { id: `qr-${qrNumber}`, kind: 'quote', title: `Answer quote request ${qr} from ${r.name}`, customer: r.company, projectId: id, due: today, done: false };
  return { project, task, qr };
}

export function requestPage({ error = '', done = '', f = {}, shop = 'FASTSIGNS of Northern Kentucky' }) {
  const inp = (n, l, t = 'text', extra = '') => `<label style="display:flex;flex-direction:column;gap:4px;font-size:15px">${l}<input name="${n}" type="${t}" value="${esc(f[n] || '')}" ${extra} style="font:inherit;font-size:16px;min-height:46px;border:1px solid #d5dbe5;border-radius:10px;padding:0 12px"></label>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Request a Quote · ${esc(shop)}</title>
<style>body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f4f6f9;color:#1b2436}main{max-width:620px;margin:0 auto;padding:16px;display:flex;flex-direction:column;gap:14px}:focus-visible{outline:3px solid #4fb3c9;outline-offset:2px}</style></head>
<body><header style="background:#16213a;color:#fff;padding:14px 16px;font-weight:800;letter-spacing:.5px">FASTSIGNS<span style="font-weight:400"> of Northern Kentucky</span></header><main>
<h1 style="margin:6px 0 0;font-size:24px">Request a Quote</h1>
${done ? `<div role="status" style="background:#e6f2ec;color:#1f6a43;border-radius:10px;padding:14px">Thanks! Your request ${esc(done)} is in. We usually reply within one business day.</div>` : `
${error ? `<div role="alert" style="background:#fbeaec;color:#8f2a34;border-radius:10px;padding:12px">${esc(error)}</div>` : ''}
<form method="post" action="/request" style="display:flex;flex-direction:column;gap:12px;background:#fff;border-radius:12px;padding:16px">
${inp('name', 'Your name', 'text', 'required autocomplete="name"')}${inp('company', 'Business (optional)', 'text', 'autocomplete="organization"')}${inp('email', 'Email', 'email', 'autocomplete="email"')}${inp('phone', 'Phone', 'tel', 'autocomplete="tel"')}
<label style="display:flex;flex-direction:column;gap:4px;font-size:15px">What do you need?<textarea name="what" rows="4" required minlength="5" style="font:inherit;font-size:16px;border:1px solid #d5dbe5;border-radius:10px;padding:10px">${esc(f.what || '')}</textarea></label>
${inp('when', 'Need it by (optional)', 'date')}
<div aria-hidden="true" style="position:absolute;left:-9999px"><label>Website<input name="website" tabindex="-1" autocomplete="off"></label></div>
<button style="font:inherit;font-weight:700;font-size:16px;min-height:48px;border:0;border-radius:10px;background:#a8343f;color:#fff;cursor:pointer">Send My Request</button></form>`}
</main></body></html>`;
}
