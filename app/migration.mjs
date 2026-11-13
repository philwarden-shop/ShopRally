// Migration Off CoreBridge: one checklist page showing where each piece stands.
import { page, esc } from './views.mjs';

export const STATUS = { done: ['Ready in test copy', '#e6f2ec', '#1f6a43'], building: ['Building', '#e8f0fb', '#1d4f91'], phil: ['Needs Phil', '#fdf3dc', '#7a4e00'], blocked: ['Blocked by CoreBridge', '#fbeaec', '#8f2a34'] };

export const CHECKLIST = [
  ['Projects and pipeline (Prospect → Complete)', 'done', 'Boards, stages, moves and history live in SalesMax.'],
  ['Design and Production boards', 'done', 'Moves log every change. CoreBridge only hears Built and Complete.'],
  ['Customers, contacts and activity', 'done', 'Customer record, contacts, calls/emails/visits, keep-warm.'],
  ['Customer order page (proofs, comments, price changes)', 'done', 'Signed links, approvals recorded, phone layout.'],
  ['Product catalog (parts and modifiers)', 'done', 'Crawled from CoreBridge; modifier prices set in Admin.'],
  ['Import customer, estimate and order history', 'phil', 'Uses the shared CoreBridge slot (about 500 calls an hour). Needs your OK on timing so it does not slow the other automations. Ready to run from Admin > Import From CoreBridge once you allow it.'],
  ['Card and eCheck payments (Fiserv CardPointe)', 'phil', 'Waiting on CardPointe test credentials from Fiserv.'],
  ['Payments and store credit on existing orders', 'blocked', 'CoreBridge only accepts payments on a brand-new order. Covered by the Nightly Reconciliation report.'],
  ['Order statement PDFs', 'blocked', 'CoreBridge returns 403 for statements. Ask CoreBridge to enable document access for the API user.'],
  ['Writing statuses back to CoreBridge', 'phil', 'Off in the test copy. Turning it on needs your approval.'],
  ['Invoices and past-due reminders', 'building', 'Drafts and pay links work; sending email is off in the test copy.'],
  ['Proof files', 'building', 'Files stay in Google Drive. Connecting Drive to SalesMax is next.'],
];

export function migrationPage({ user }) {
  const counts = Object.fromEntries(Object.keys(STATUS).map((k) => [k, CHECKLIST.filter((c) => c[1] === k).length]));
  const rows = CHECKLIST.map(([what, st, note]) => { const [label, bg, fg] = STATUS[st]; return `<tr><td><b>${esc(what)}</b><div style="font-size:12px;color:var(--mute)">${esc(note)}</div></td><td><span class="pill" style="background:${bg};color:${fg};white-space:nowrap">${label}</span></td></tr>`; }).join('');
  const body = `<div class="wrap"><div class="bar" style="padding:14px 0"><h1>Moving Off CoreBridge</h1></div>
<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">${Object.entries(STATUS).map(([k, [l, bg, fg]]) => `<span class="pill" style="background:${bg};color:${fg};font-size:12px;padding:4px 10px">${l} · ${counts[k]}</span>`).join('')}</div>
<section class="panel"><table><thead><tr><th>Piece</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></section></div>`;
  return page({ title: 'Moving Off CoreBridge', user, tab: '', body });
}
